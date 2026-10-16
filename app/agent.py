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

from app import mcp_client
from app import tools
from app.graph import FALLBACK_MESSAGE, USER_AGENT, user_graph_name

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

    if low.startswith(("how do we", "how do i")):
        intent = "procedure"
    elif _has_any(low, WHY_WORDS) or incident:
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
                        ("why", "blast", "who", "action", "procedure"))
    if intent in ("action", "procedure"):
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
        res = mcp_client.trace_why(state.get("incident_id") or "INC-231")
        trace = res["trace"]
        evidence = [{"source": "org", "kind": "why-path",
                     "trace": p["trace"], "hops": p["hops"],
                     "edges": p.get("edges", []),
                     "dates": p.get("dates", []),
                     "evidence": p["evidence"]} for p in res["paths"]]
    elif intent in ("blast", "action"):
        res = mcp_client.blast_radius(state.get("service") or "Ledger")
        evidence = [{"source": "org", "kind": "blast-radius",
                     "service": res["service"],
                     "affected": res["affected"]}]
    elif intent == "who":
        res = mcp_client.who_knows(state.get("topic") or "payout-retry")
        evidence = [{"source": "org", "kind": "who-knows",
                     "experts": res["experts"]}]
        if state.get("topic"):
            msgs = mcp_client.recall_messages(state.get("topic"))
            evidence.append({"source": "org", "kind": "messages",
                             "messages": msgs["messages"]})
    elif intent == "procedure":
        res = mcp_client.recall_procedure(state.get("topic"))
        evidence = [{"source": "org", "kind": "procedures",
                     "procedures": res["procedures"]}]
    if scope in ("user-only", "both") and intent in ("memory", "unsupported"):
        mem = mcp_client.recall_memory(user_id)
        evidence.append({"source": user_graph_name(user_id), "kind": "memory",
                         "facts": mem["facts"]})
    elif scope == "both":
        mem = mcp_client.recall_memory(user_id)
        evidence.append({"source": user_graph_name(user_id), "kind": "memory",
                         "facts": mem["facts"]})
    return {"evidence": evidence, "trace": trace}


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
        people = []
        for e in evidence:
            for p in e.get("trace", []):
                if p.startswith("Person: ") and p[8:] not in people:
                    people.append(p[8:])
        if people:
            lines.append("People on this path: " + ", ".join(people))
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
        for e in evidence:
            if e.get("kind") == "messages":
                for m in e.get("messages", []):
                    lines.append(
                        f"{m['author']} ({m['at']}): {m['text']}")
        return "\n".join(lines)
    if intent == "procedure":
        lines = []
        for e in evidence:
            if e.get("kind") == "procedures":
                for p in e.get("procedures", []):
                    lines.append(f"{p['title']}:")
                    for n, step in enumerate(p.get("steps", []), 1):
                        lines.append(f"{n}. {step}")
                    lines.append(f"Evidence: {p['source_ref']}")
        if lines:
            return "\n".join(lines)
        return ("I have no runbook for that yet. "
                "Ask about payout-retry incidents.")
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
        overlap = _overlaps(question, [f.get("text") for f in facts])
        quote = _erasure_quote(question, user_id, overlap)
        if quote:
            return {"answer": quote}
    drafted = _llm_draft(state.get("question", ""), evidence)
    return {"answer": drafted or _template_draft(state)}


def _qtokens(question):
    toks = {w.strip(".,?").lower() for w in question.split()}
    return {w for w in toks if len(w) >= 4} - STOPWORDS


def _overlaps(question, texts):
    qtokens = _qtokens(question)
    best = 0
    for text in texts:
        rtokens = {w.strip(".,?").lower() for w in (text or "").split()}
        best = max(best, len(qtokens & rtokens))
    return best


def _erasure_quote(question, user_id, fact_overlap):
    """Negative-recall proof: quote the receipt when the fact is erased."""
    try:
        hist = mcp_client.memory_history(user_id)
    except Exception:
        return None
    for r in hist.get("receipts", []):
        if _overlaps(question, [r.get("text")]) > fact_overlap:
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
    res = mcp_client.propose_action(goal, plan, state.get("user_id", "anshu"))
    return {"action_id": res["action_id"]}


def approval_gate(state):
    """The agent STOPS here and waits for a human decision.

    Only the action id crosses the gate. Everything the executor needs
    lives on the proposal node in FalkorDB, never in loop state.
    """
    decision = interrupt({"action_id": state.get("action_id")})
    return {"decision": decision}


def executor(state):
    """Execute the approved proposal read from the graph.

    The action id is only a lookup key. Goal, plan, and status are read
    from FalkorDB at execution time, so this survives a process restart.
    """
    decision = state.get("decision", {}) or {}
    action_id = state["action_id"]
    current = mcp_client.get_action(action_id)
    if current["status"] == "proposed":
        mcp_client.approve_action(action_id, decision.get("by", "anshu"))
    done = mcp_client.execute_action(action_id)
    return {"decision": {**decision, "status": done["status"],
                         "executed_at": done.get("executed_at")}}


def record_rejection(state):
    """Record a rejection with the REJECTED_BY edge."""
    decision = state.get("decision", {}) or {}
    res = mcp_client.reject_action(state["action_id"], decision.get("by", "anshu"),
                              decision.get("reason", ""))
    return {"decision": {**decision, "status": res["status"]}}


def audit_writer(state):
    """Attach the visible audit trail to the run."""
    return {"audit": mcp_client.audit_trail()["entries"]}


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
        try:
            node = mcp_client.get_action(payload.get("action_id", ""))
        except Exception:
            return dict(FALLBACK_ERROR, thread_id=thread_id)
        return {"pending_action": {"action_id": node["action_id"],
                                   "goal": node["goal"],
                                   "plan": node["plan"]},
                "thread_id": thread_id,
                "answer": "This needs approval before anything runs. "
                          f"Plan drafted for: {node['goal']}"}
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
            out = mcp_client.approve_action(action_id, by)
        else:
            out = mcp_client.reject_action(action_id, by,
                                      decision.get("reason", ""))
        return {"action_id": out["action_id"], "status": out["status"],
                "audit": mcp_client.audit_trail()["entries"]}
