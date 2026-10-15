"""FalkorDB tools for the agent loop (product spec sections 4, 5, 6).

Every tool issues parameterized Cypher against exactly one graph. The app
layer resolves scope (org vs per-user graphs); no statement ever touches
two graphs. Provenance (source_type + source_ref) is set on every node.
"""

import hashlib
import json
import uuid
from datetime import date, datetime

from app.graph import ORG_GRAPH, get_db, user_graph_name

TODAY = date.today().isoformat()


def _rows(graph, query, params=None):
    result = graph.query(query, params or {})
    cols = [h[1] if isinstance(h, (list, tuple)) else h for h in result.header]
    return [dict(zip(cols, row)) for row in result.result_set]


def _org():
    return get_db().select_graph(ORG_GRAPH)


def _user(user_id):
    return get_db().select_graph(user_graph_name(user_id))


def _fact_id(text):
    return "fact-" + hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]


def _resolve_fact_id(g, base):
    """Pick a usable fact id: reuse a current node, else suffix past history.

    Forgotten nodes are gone so their hash is free again; superseded nodes
    stay as history, so re-curated text gets a -rN suffix. History is never
    rewritten.
    """
    fid, n = base, 1
    while True:
        rows = _rows(
            g, "MATCH (f:MemoryFact {id: $fid}) "
            "RETURN f.valid_until AS valid", {"fid": fid})
        if not rows:
            return fid, False
        if any(r["valid"] is None for r in rows):
            return fid, True
        n += 1
        fid = f"{base}-r{n}"


# Retrieval tools (org graph)


def trace_why(incident_id="INC-231"):
    """Traced why-path for an incident, longest chain first with evidence."""
    rows = _rows(
        _org(),
        "MATCH p = (i:Incident {id: $incident_id})"
        "-[:CAUSED_BY|RESOLVED_BY|DECIDED_IN|CITED_IN*1..4]-(n) "
        "RETURN [x IN nodes(p) | labels(x)[0] + ': ' "
        "+ coalesce(x.title, x.name, x.message, x.id)] AS trace, "
        "[x IN nodes(p) | x.source_ref] AS evidence, "
        "[r IN relationships(p) | type(r)] AS edges, "
        "[x IN nodes(p) | x.at] AS dates, "
        "length(p) AS hops ORDER BY hops DESC LIMIT 5",
        {"incident_id": incident_id},
    )
    if not rows:
        raise ValueError(f"unknown incident {incident_id}")
    return {"incident_id": incident_id, "paths": rows,
            "trace": rows[0]["trace"], "evidence": rows[0]["evidence"]}


def blast_radius(service="Ledger"):
    """Dependents of a service via incoming DEPENDS_ON (CALL UNION shape)."""
    known = _rows(
        _org(), "MATCH (s:Service {name: $service}) RETURN s.name AS name",
        {"service": service},
    )
    if not known:
        raise ValueError(f"unknown service {service}")
    rows = _rows(
        _org(),
        "MATCH (s:Service {name: $service}) "
        "CALL { WITH s MATCH p = (s)<-[:DEPENDS_ON*1..3]-(d:Service) "
        "RETURN d AS svc, length(p) AS hops UNION WITH s "
        "MATCH p = (s)-[:AFFECTS*1..3]->(a:Service) "
        "RETURN a AS svc, length(p) AS hops } "
        "MATCH (t:Team)-[:OWNS]->(svc) "
        "RETURN svc.name AS affected, t.name AS owner_team, "
        "svc.source_ref AS source_ref, min(hops) AS hops "
        "ORDER BY affected",
        {"service": service},
    )
    return {"service": service, "affected": rows}


def who_knows(topic="payout-retry"):
    """Ranked experts for a topic with weighted evidence breakdown."""
    rows = _rows(
        _org(),
        "MATCH (t:Topic {name: $topic}) MATCH (p:Person) "
        "OPTIONAL MATCH (p)-[r1:WORKS_ON]->(x1)-[:MENTIONS]->(t) "
        "OPTIONAL MATCH (p)-[r2:AUTHORED]->(x2)-[:MENTIONS]->(t) "
        "OPTIONAL MATCH (i:Incident)-[r3:RESOLVED_BY]->(p), "
        "(i)-[:MENTIONS]->(t) "
        "WITH p, count(DISTINCT r1) AS worked, "
        "count(DISTINCT r2) AS authored, count(DISTINCT r3) AS resolved, "
        "max(coalesce(x1.at, x2.at, i.at)) AS latest "
        "WITH p, worked, authored, resolved, latest, "
        "(worked * 1.0 + authored * 1.5 + resolved * 2.0) AS score "
        "WHERE score > 0 "
        "RETURN p.name AS person, score, worked AS worked_on, "
        "authored AS authored_docs, resolved AS resolved_incidents, "
        "latest AS latest_activity, p.source_ref AS source_ref "
        "ORDER BY score DESC, latest DESC LIMIT 5",
        {"topic": topic},
    )
    if not rows:
        raise ValueError(f"unknown topic {topic}")
    experts = [
        {"person": r["person"], "score": r["score"],
         "breakdown": {"worked_on": r["worked_on"],
                       "authored": r["authored_docs"],
                       "resolved": r["resolved_incidents"]},
         "latest": r["latest_activity"], "source_ref": r["source_ref"]}
        for r in rows
    ]
    return {"topic": topic, "experts": experts}


def list_services():
    """All services with owner teams, for contrast rows in the UI."""
    rows = _rows(
        _org(),
        "MATCH (s:Service) OPTIONAL MATCH (t:Team)-[:OWNS]->(s) "
        "RETURN s.name AS name, t.name AS owner_team, "
        "s.source_ref AS source_ref ORDER BY name",
    )
    return {"services": rows}


def recall_messages(topic="payout-retry", limit=15):
    """Team chat mentioning a topic, oldest first with author and date."""
    rows = _rows(
        _org(),
        "MATCH (m:Message)-[:MENTIONS]->(t:Topic {name: $topic}) "
        "RETURN m.id AS message_id, m.text AS text, m.author AS author, "
        "m.at AS at, m.source_ref AS source_ref "
        "ORDER BY m.at, m.id LIMIT $limit",
        {"topic": topic, "limit": limit},
    )
    return {"topic": topic, "messages": rows}


# Memory tools (per-user graphs)


def recall_memory(user_id):
    """Current facts only (valid_until IS NULL). Erased facts are gone."""
    rows = _rows(
        _user(user_id),
        "MATCH (u:Person {id: $user})-[:REMEMBERS]->(f:MemoryFact) "
        "WHERE f.valid_until IS NULL "
        "RETURN f.id AS fact_id, f.text AS text, f.salience AS salience, "
        "f.at AS at, f.source_ref AS source_ref "
        "ORDER BY salience DESC, at DESC LIMIT 10",
        {"user": user_id},
    )
    return {"user_id": user_id, "facts": rows}


def memory_history(user_id):
    """Superseded facts (history, never current) plus erasure receipts."""
    g = _user(user_id)
    facts = _rows(
        g,
        "MATCH (u:Person {id: $user})-[:REMEMBERS]->(f:MemoryFact) "
        "WHERE f.valid_until IS NOT NULL "
        "RETURN f.id AS fact_id, f.text AS text, "
        "f.valid_until AS valid_until, f.superseded_by AS superseded_by "
        "ORDER BY valid_until DESC LIMIT 10",
        {"user": user_id},
    )
    receipts = _rows(
        g,
        "MATCH (r:ErasureReceipt {scope: $user}) "
        "RETURN r.id AS receipt_id, r.fact_ref AS fact_ref, "
        "r.text AS text, r.at AS at ORDER BY at DESC LIMIT 10",
        {"user": user_id},
    )
    return {"user_id": user_id, "history": facts, "receipts": receipts}


def curate_memory(user_id, text, salience=0.8):
    """Episodic to semantic MERGE on the content hash (idempotent)."""
    base = _fact_id(text)
    g = _user(user_id)
    fact_id, reuse = _resolve_fact_id(g, base)
    g.query(
        "MERGE (p:Person {id: $user}) "
        "ON CREATE SET p.name = $uname, p.source_type = 'synthetic', "
        "p.source_ref = $pref",
        {"user": user_id, "uname": user_id.capitalize(),
         "pref": f"seed/users/{user_id}/person"},
    )
    g.query(
        "MERGE (f:MemoryFact {id: $fid}) "
        "ON CREATE SET f.text = $text, f.salience = $salience, f.at = $at, "
        "f.valid_until = null, f.source_type = 'synthetic', "
        "f.source_ref = $fref",
        {"fid": fact_id, "text": text, "salience": salience, "at": TODAY,
         "fref": f"memory/users/{user_id}/{fact_id}"},
    )
    created = not reuse
    g.query(
        "MATCH (p:Person {id: $user}), (f:MemoryFact {id: $fid}) "
        "MERGE (p)-[:REMEMBERS]->(f)",
        {"user": user_id, "fid": fact_id},
    )
    return {"fact_id": fact_id, "created": created}


def supersede_memory(user_id, fact_id, new_text):
    """Version a fact: new node SUPERSEDES old, old gets valid_until set."""
    base = _fact_id(new_text)
    if base == fact_id:
        raise ValueError("new text is identical to the current fact")
    g = _user(user_id)
    found = _rows(
        g,
        "MATCH (u:Person {id: $user})-[:REMEMBERS]->(f:MemoryFact {id: $fid}) "
        "WHERE f.valid_until IS NULL RETURN f.id AS fact_id",
        {"user": user_id, "fid": fact_id},
    )
    if not found:
        raise ValueError(f"no current fact {fact_id} for user {user_id}")
    new_id, _ = _resolve_fact_id(g, base)
    g.query(
        "MERGE (f:MemoryFact {id: $fid}) "
        "ON CREATE SET f.text = $text, f.salience = 0.8, f.at = $at, "
        "f.valid_until = null, f.source_type = 'synthetic', "
        "f.source_ref = $fref",
        {"fid": new_id, "text": new_text, "at": TODAY,
         "fref": f"memory/users/{user_id}/{new_id}"},
    )
    g.query(
        "MATCH (n:MemoryFact {id: $new}), (o:MemoryFact {id: $old}) "
        "MERGE (n)-[:SUPERSEDES]->(o) "
        "SET o.valid_until = $at, o.superseded_by = $new",
        {"new": new_id, "old": fact_id, "at": TODAY},
    )
    g.query(
        "MATCH (p:Person {id: $user}), (f:MemoryFact {id: $new}) "
        "MERGE (p)-[:REMEMBERS]->(f)",
        {"user": user_id, "new": new_id},
    )
    return {"old_id": fact_id, "new_id": new_id}


def forget_with_receipt(user_id, fact_id):
    """Delete a fact and issue an erasure receipt. The fact is unrecoverable."""
    g = _user(user_id)
    found = _rows(
        g,
        "MATCH (f:MemoryFact {id: $fid}) "
        "RETURN f.text AS text, f.source_ref AS source_ref",
        {"fid": fact_id},
    )
    if not found:
        raise ValueError(f"no fact {fact_id} for user {user_id}")
    receipt_id = "ERASURE-" + uuid.uuid4().hex[:6]
    g.query(
        "MATCH (f:MemoryFact {id: $fid}) DETACH DELETE f", {"fid": fact_id}
    )
    g.query(
        "MERGE (r:ErasureReceipt {id: $rid}) "
        "SET r.fact_ref = $fid, r.text = $text, r.at = $at, "
        "r.scope = $user, r.source_type = 'synthetic', "
        "r.source_ref = $rref",
        {"rid": receipt_id, "fid": fact_id, "text": found[0]["text"],
         "at": datetime.now().isoformat(timespec="seconds"), "user": user_id,
         "rref": f"memory/users/{user_id}/{receipt_id}"},
    )
    return {"receipt_id": receipt_id}


# Action tools (org graph audit trail)


def propose_action(goal, plan, proposer="anshu"):
    """Draft a plan as a proposed Action node. Nothing executes yet.

    Records a PROPOSED_BY edge when the proposer is a known person,
    following the audit-edge convention. Unknown proposers simply leave
    the action unattributed rather than inventing a Person node.
    """
    action_id = "ACT-" + uuid.uuid4().hex[:6]
    org = _org()
    org.query(
        "MERGE (a:Action {id: $aid}) "
        "SET a.goal = $goal, a.plan = $plan, a.status = 'proposed', "
        "a.at = $at, a.source_type = 'synthetic', "
        "a.source_ref = $aref",
        {"aid": action_id, "goal": goal, "plan": json.dumps(plan),
         "at": TODAY, "aref": f"actions/{action_id}"},
    )
    if proposer:
        known = org.query(
            "MATCH (p:Person {id: $by}) RETURN p.id AS pid",
            {"by": proposer},
        )
        if known.result_set:
            org.query(
                "MATCH (a:Action {id: $aid}), (p:Person {id: $by}) "
                "MERGE (a)-[:PROPOSED_BY]->(p)",
                {"aid": action_id, "by": proposer},
            )
    return {"action_id": action_id, "plan": plan}


def approve_action(action_id, approver):
    """Approve a proposed action, writing the APPROVED_BY edge."""
    res = _org().query(
        "MATCH (a:Action {id: $aid}), (p:Person {id: $by}) "
        "WHERE a.status = 'proposed' "
        "SET a.status = 'approved' "
        "MERGE (a)-[:APPROVED_BY]->(p) "
        "RETURN a.id AS action_id",
        {"aid": action_id, "by": approver},
    )
    if not res.result_set:
        raise ValueError(f"cannot approve {action_id}: not proposed or "
                         f"unknown approver {approver}")
    return {"action_id": action_id, "status": "approved"}


def reject_action(action_id, approver, reason=""):
    """Reject a proposed action, writing the REJECTED_BY edge."""
    res = _org().query(
        "MATCH (a:Action {id: $aid}), (p:Person {id: $by}) "
        "WHERE a.status = 'proposed' "
        "SET a.status = 'rejected', a.reason = $reason "
        "MERGE (a)-[:REJECTED_BY]->(p) "
        "RETURN a.id AS action_id",
        {"aid": action_id, "by": approver, "reason": reason},
    )
    if not res.result_set:
        raise ValueError(f"cannot reject {action_id}: not proposed or "
                         f"unknown approver {approver}")
    return {"action_id": action_id, "status": "rejected"}


def audit_trail(limit=20):
    """Action history with approver edges for the Approvals screen."""
    rows = _rows(
        _org(),
        "MATCH (a:Action) "
        "OPTIONAL MATCH (a)-[r:APPROVED_BY|REJECTED_BY]->(p:Person) "
        "OPTIONAL MATCH (a)-[:PROPOSED_BY]->(pp:Person) "
        "RETURN a.id AS action_id, a.goal AS goal, a.plan AS plan, "
        "a.status AS status, a.reason AS reason, "
        "a.at AS at, a.executed_at AS executed_at, "
        "type(r) AS decision, p.name AS decided_by, "
        "pp.name AS proposed_by "
        "ORDER BY a.at DESC LIMIT $limit",
        {"limit": limit},
    )
    return {"entries": rows}


def get_action(action_id):
    """Read one proposal node from the graph. The graph is the record."""
    rows = _rows(
        _org(),
        "MATCH (a:Action {id: $aid}) "
        "OPTIONAL MATCH (a)-[r:APPROVED_BY|REJECTED_BY]->(p:Person) "
        "OPTIONAL MATCH (a)-[:PROPOSED_BY]->(pp:Person) "
        "RETURN a.id AS action_id, a.goal AS goal, a.plan AS plan, "
        "a.status AS status, a.at AS at, a.executed_at AS executed_at, "
        "type(r) AS decision, p.name AS decided_by, "
        "pp.name AS proposed_by",
        {"aid": action_id},
    )
    if not rows:
        raise ValueError(f"unknown action {action_id}")
    row = rows[0]
    try:
        plan = json.loads(row["plan"]) if row["plan"] else []
    except (TypeError, ValueError):
        plan = []
    return {
        "action_id": row["action_id"],
        "goal": row["goal"],
        "plan": plan if isinstance(plan, list) else [str(plan)],
        "status": row["status"],
        "at": row["at"],
        "executed_at": row["executed_at"],
        "decision": row["decision"],
        "decided_by": row["decided_by"],
        "proposed_by": row["proposed_by"],
    }


def execute_action(action_id):
    """Execute an approved proposal read from the graph, nothing else.

    Refuses anything not approved, and refuses twice-execution. The node
    carries status to executed with the pickup timestamp as proof.
    """
    current = get_action(action_id)
    if current["status"] == "executed":
        raise ValueError(f"action {action_id} already executed")
    if current["status"] != "approved":
        raise ValueError(
            f"action {action_id} is {current['status']}, not approved; "
            "refusing to execute")
    stamped = datetime.now().isoformat(timespec="seconds")
    _org().query(
        "MATCH (a:Action {id: $aid}) WHERE a.status = 'approved' "
        "SET a.status = 'executed', a.executed_at = $at "
        "RETURN a.id AS action_id",
        {"aid": action_id, "at": stamped},
    )
    done = get_action(action_id)
    done["picked_up_at"] = stamped
    return done
