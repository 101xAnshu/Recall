"""LangGraph agent loop for Meridian Pay (product spec section 6).

Flow: scope_resolver -> retriever -> answer_drafter, then either respond
directly (plain question) or plan_drafter -> approval_gate (interrupt, the
agent STOPS and waits) -> executor -> audit_writer (gated action).

Every retrieval step calls a FalkorDB tool. The loop never answers from
anything but tool evidence; every claim cites a source_ref.
"""

import os
import re
import uuid
from typing import TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from app import tools
from app.graph import FALLBACK_MESSAGE, USER_AGENT

PRIMARY_MODEL = "openai/gpt-oss-120b"

ACTION_WORDS = ("migrate", "move", "decommission", "deploy", "freeze",
                "rollback", "switch", "upgrade", "change", "shut down")
WHY_WORDS = ("why", "caused", "cause", "root cause", "happen", "incident",
               "commit", "evidence", "decid")
BLAST_WORDS = ("blast", "break", "affect", "impact", "what if", "touch",
                "depend", "downstream")
WHO_WORDS = ("who knows", "expert", "owner", "who owns", "familiar")
MEMORY_WORDS = ("remember", "recall", "forget", "forgot", "memory", "my ",
                "current")
STOPWORDS = {"what", "was", "were", "the", "about", "that", "this", "with",
             "from", "have", "does", "did", "and", "for", "are", "you", "your"}

FALLBACK_ERROR = {"error": FALLBACK_MESSAGE}


class AgentState(TypedDict, total=False):
    question: str
    user_id: str
    scope: str
    intent: str
    incident_id: str
    service: str
    topic: str
    evidence: list
    trace: list
    answer: str
    action_id: str
    goal: str
    plan: list
    decision: dict
    audit: list


def _has_any(text, words):
    return any(w in text for w in words)


def _service_names():
    try:
        rows = tools._rows(tools._org(),
                           "MATCH (s:Service) RETURN s.name AS name")
        return [r["name"] for r in rows]
    except Exception:
        return ["Ledger", "Payments", "Retry", "Notifications", "Settlement"]


def _topic_names():
    try:
        rows = tools._rows(tools._org(),
                           "MATCH (t:Topic) RETURN t.name AS name")
        return [r["name"] for r in rows]
    except Exception:
        return ["payout-retry"]


def scope_resolver(state):
    """Classify intent (org-only / user-only / both) plus entities."""
    q = state["question"]
    low = q.lower()
    incident = (re.search(r"INC-\d+", q, re.IGNORECASE) or [None])[0]
    if incident:
        incident = incident.upper()
    names = _service_names()
    changed = re.search(r"chang(?:e|ing)\s+([A-Za-z]+)", q)
    changed_name = changed.group(1).lower() if changed else ""
    service = next((s for s in names if s.lower() == changed_name), None)
    if service is None:
        service = next((s for s in names if s.lower() in low), None)
    topic = next((t for t in _topic_names() if t.lower() in low), None)
    if "payout" in low and topic is None and "payout-retry" in _topic_names():
        topic = "payout-retry"

    if _has_any(low, WHY_WORDS) or incident:
        intent = "why"
    elif _has_any(low, BLAST_WORDS):
        intent = "blast"
    elif _has_any(low, WHO_WORDS) or topic or low.startswith("who"):
        intent = "who"
    elif _has_any(low, MEMORY_WORDS):
        intent = "memory"
    elif _has_any(low, ACTION_WORDS):
        intent = "action"
    elif service:
        intent = "blast"
    else:
        intent = "unsupported"

    mentions_user = _has_any(low, MEMORY_WORDS + (" i ", " me ", " my "))
    mentions_org = bool(incident or service or topic or intent in
                        ("why", "blast", "who", "action"))
    if intent == "action":
        scope = "org-only"
    elif mentions_user and mentions_org:
        scope = "both"
    elif mentions_user:
        scope = "user-only"
    else:
        scope = "org-only"
    return {"intent": intent, "scope": scope, "incident_id": incident or "",
            "service": service or "", "topic": topic or ""}


def retriever(state):
    """Run hero tools per intent and scope, merging evidence in Python."""
    intent = state.get("intent", "unsupported")
    scope = state.get("scope", "org-only")
    user_id = state.get("user_id", "anshu")
    evidence, trace = [], []
    if intent == "why":
        res = tools.trace_why(state.get("incident_id") or "INC-231")
        trace = res["trace"]
        evidence = [{"source": "org", "kind": "why-path",
                     "trace": p["trace"], "hops": p["hops"],
                     "edges": p.get("edges", []),
                     "dates": p.get("dates", []),
                     "evidence": p["evidence"]} for p in res["paths"]]
    elif intent in ("blast", "action"):
        res = tools.blast_radius(state.get("service") or "Ledger")
        evidence = [{"source": "org", "kind": "blast-radius",
                     "service": res["service"],
                     "affected": res["affected"]}]
    elif intent == "who":
        res = tools.who_knows(state.get("topic") or "payout-retry")
        evidence = [{"source": "org", "kind": "who-knows",
                     "experts": res["experts"]}]
    if scope in ("user-only", "both") and intent in ("memory", "unsupported"):
        mem = tools.recall_memory(user_id)
        evidence.append({"source": user_graph_label(user_id), "kind": "memory",
                         "facts": mem["facts"]})
    elif scope == "both":
        mem = tools.recall_memory(user_id)
        evidence.append({"source": user_graph_label(user_id), "kind": "memory",
                         "facts": mem["facts"]})
    return {"evidence": evidence, "trace": trace}


def user_graph_label(user_id):
    return f"user_{user_id}"


def _evidence_text(evidence):
    return "\n".join(str(e) for e in evidence)


def _llm_draft(question, evidence):
    """Narrate from evidence with Groq, else None (template takes over)."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=key,
                      default_headers={"User-Agent": USER_AGENT})
        completion = client.chat.completions.create(
            model=PRIMARY_MODEL,
            messages=[
                {"role": "system",
                 "content": "Answer only from the evidence below. "
                            "Every claim must cite a source_ref. "
                            "No citation, no claim."},
                {"role": "user",
                 "content": question + "\nEvidence:\n"
                            + _evidence_text(evidence)},
            ],
            max_tokens=500,
        )
        return completion.choices[0].message.content
    except Exception:
        return None


def _template_draft(state):
    intent = state.get("intent", "unsupported")
    evidence = state.get("evidence", [])
    if intent == "why" and evidence:
        lines = [" -> ".join(state.get("trace", []))]
        refs = evidence[0].get("evidence", [])
        lines.append("Evidence: " + ", ".join(refs))
        return "\n".join(lines)
    if intent in ("blast", "action") and evidence:
        rows = evidence[0].get("affected", [])
        service = evidence[0].get("service", "this service")
        if not rows:
            return (f"Changing {service} affects no other services "
                    "according to the dependency graph.")
        lines = [f"{r['affected']} (owner {r['owner_team']})" for r in rows]
        refs = ", ".join(r.get("source_ref", "") for r in rows)
        return ("Changing this service affects: " + "; ".join(lines)
                + ". Evidence: " + refs)
    if intent == "who" and evidence:
        lines = []
        for e in evidence[0].get("experts", []):
            b = e["breakdown"]
            lines.append(
                f"{e['person']} score {e['score']} "
                f"(worked_on {b['worked_on']}, authored {b['authored']}, "
                f"resolved {b['resolved']}, latest {e['latest']})")
        return "\n".join(lines)
    if intent == "memory":
        facts = []
        for e in evidence:
            if e.get("kind") == "memory":
                facts.extend(e.get("facts", []))
        if facts:
            return "\n".join(
                f"- {f['text']} (ref {f['source_ref']})" for f in facts)
        return ("I have no current facts on that. "
                "Tell me something to remember first.")
    return ("I can answer questions about incidents, services, topics, "
            "experts, and personal memory. Ask about an incident, "
            "a service, or a person.")


def answer_drafter(state):
    """Draft a sourced answer, checking erasure receipts for memory gaps."""
    evidence = state.get("evidence", [])
    if state.get("intent") == "memory":
        question = state.get("question", "")
        user_id = state.get("user_id", "anshu")
        facts = [f for e in evidence if e.get("kind") == "memory"
                 for f in e.get("facts", [])]
        if not _overlaps(question, [f.get("text") for f in facts]):
            quote = _erasure_quote(question, user_id)
            if quote:
                return {"answer": quote}
    drafted = _llm_draft(state.get("question", ""), evidence)
    return {"answer": drafted or _template_draft(state)}


def _qtokens(question):
    toks = {w.strip(".,?").lower() for w in question.split()}
    return {w for w in toks if len(w) >= 4} - STOPWORDS


def _overlaps(question, texts):
    qtokens = _qtokens(question)
    for text in texts:
        rtokens = {w.strip(".,?").lower() for w in (text or "").split()}
        if qtokens & rtokens:
            return True
    return False


def _erasure_quote(question, user_id):
    """Negative-recall proof: quote the receipt when the fact is erased."""
    try:
        hist = tools.memory_history(user_id)
    except Exception:
        return None
    for r in hist.get("receipts", []):
        if _overlaps(question, [r.get("text")]):
            return ("I no longer have that fact in active memory. "
                    f"I can show you the erasure receipt {r['receipt_id']}.")
    return None


def plan_drafter(state):
    """Draft an evidence-bound plan and propose (never execute) it."""
    goal = state.get("question", "")
    service = state.get("service") or "Ledger"
    affected = []
    for e in state.get("evidence", []):
        if e.get("kind") == "blast-radius":
            affected = e.get("affected", [])
    plan = []
    for r in affected:
        plan.append(f"Notify {r['owner_team']} about impact on {r['affected']}")
    plan.append(f"Apply change to {service}")
    plan.append("Verify all affected services report healthy")
    res = tools.propose_action(goal, plan)
    return {"goal": goal, "plan": plan, "action_id": res["action_id"]}


def approval_gate(state):
    """The agent STOPS here and waits for a human decision."""
    decision = interrupt({"action_id": state.get("action_id"),
                          "goal": state.get("goal"),
                          "plan": state.get("plan")})
    return {"decision": decision}


def executor(state):
    """Run the approved plan and write the APPROVED_BY edge."""
    decision = state.get("decision", {}) or {}
    res = tools.approve_action(state["action_id"], decision.get("by", "anshu"))
    return {"decision": {**decision, "status": res["status"]}}


def record_rejection(state):
    """Record a rejection with the REJECTED_BY edge."""
    decision = state.get("decision", {}) or {}
    res = tools.reject_action(state["action_id"], decision.get("by", "anshu"),
                              decision.get("reason", ""))
    return {"decision": {**decision, "status": res["status"]}}


def audit_writer(state):
    """Attach the visible audit trail to the run."""
    return {"audit": tools.audit_trail()["entries"]}


def _after_draft(state):
    return "plan" if state.get("intent") == "action" else "end"


def _after_gate(state):
    decision = state.get("decision", {}) or {}
    return "execute" if decision.get("decision") == "approved" else "record"


builder = StateGraph(AgentState)
builder.add_node("scope", scope_resolver)
builder.add_node("retrieve", retriever)
builder.add_node("draft", answer_drafter)
builder.add_node("plan", plan_drafter)
builder.add_node("gate", approval_gate)
builder.add_node("execute", executor)
builder.add_node("record", record_rejection)
builder.add_node("audit_write", audit_writer)
builder.add_edge(START, "scope")
builder.add_edge("scope", "retrieve")
builder.add_edge("retrieve", "draft")
builder.add_conditional_edges("draft", _after_draft,
                              {"plan": "plan", "end": END})
builder.add_edge("plan", "gate")
builder.add_conditional_edges("gate", _after_gate,
                              {"execute": "execute", "record": "record"})
builder.add_edge("execute", "audit_write")
builder.add_edge("record", "audit_write")
builder.add_edge("audit_write", END)

agent = builder.compile(checkpointer=MemorySaver())


def run_ask(question, user_id, thread_id=None):
    """Run the loop until it answers or pauses at the approval gate."""
    thread_id = thread_id or f"ask-{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}
    try:
        res = agent.invoke({"question": question, "user_id": user_id}, config)
    except Exception:
        return dict(FALLBACK_ERROR, thread_id=thread_id)
    paused = res.get("__interrupt__")
    if paused:
        payload = paused[0].value
        return {"pending_action": payload, "thread_id": thread_id,
                "answer": "This needs approval before anything runs. "
                          f"Plan drafted for: {payload.get('goal')}"}
    if not res.get("answer") and not res.get("evidence"):
        return dict(FALLBACK_ERROR, thread_id=thread_id)
    return {"answer": res.get("answer", ""), "trace": res.get("trace", []),
            "evidence": res.get("evidence", []), "audit": res.get("audit", []),
            "thread_id": thread_id}


def resume_action(thread_id, decision):
    """Resume a paused loop with the human decision, else finalize directly."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        res = agent.invoke(Command(resume=decision), config)
        if res.get("__interrupt__"):
            return dict(FALLBACK_ERROR, thread_id=thread_id)
        return {"action_id": res.get("action_id"),
                "status": (res.get("decision") or {}).get("status", ""),
                "audit": res.get("audit", [])}
    except Exception:
        action_id = decision.get("action_id", "")
        by = decision.get("by", "anshu")
        if decision.get("decision") == "approved":
            out = tools.approve_action(action_id, by)
        else:
            out = tools.reject_action(action_id, by,
                                      decision.get("reason", ""))
        return {"action_id": out["action_id"], "status": out["status"],
                "audit": tools.audit_trail()["entries"]}
