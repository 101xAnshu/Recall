"""Load the Meridian Pay synthetic org (product spec section 8).

All nodes are synthetic. Every statement is an idempotent MERGE and every
node carries source_type plus source_ref provenance. Safe to run twice.

Usage, from repo root: python scripts/seed.py
"""

from app.graph import ORG_GRAPH, get_db, user_graph_name

ORG_STATEMENTS = [
    # Teams
    "MERGE (t:Team {id: 'team-payments'}) "
    "SET t.name = 'Payments-team', t.at = '2026-01-10', "
    "t.source_type = 'synthetic', "
    "t.source_ref = 'seed/org/teams/payments-team'",
    "MERGE (t:Team {id: 'team-growth'}) "
    "SET t.name = 'Growth-team', t.at = '2026-01-10', "
    "t.source_type = 'synthetic', "
    "t.source_ref = 'seed/org/teams/growth-team'",
    # Services (Ledger is the provider, Settlement is isolated contrast)
    "MERGE (s:Service {id: 'svc-ledger'}) "
    "SET s.name = 'Ledger', s.owner_team = 'Payments-team', s.at = '2026-03-10', "
    "s.source_type = 'synthetic', s.source_ref = 'seed/org/services/ledger'",
    "MERGE (s:Service {id: 'svc-payments'}) "
    "SET s.name = 'Payments', s.owner_team = 'Payments-team', s.at = '2026-04-02', "
    "s.source_type = 'synthetic', s.source_ref = 'seed/org/services/payments'",
    "MERGE (s:Service {id: 'svc-retry'}) "
    "SET s.name = 'Retry', s.owner_team = 'Growth-team', s.at = '2026-06-18', "
    "s.source_type = 'synthetic', s.source_ref = 'seed/org/services/retry'",
    "MERGE (s:Service {id: 'svc-notifications'}) "
    "SET s.name = 'Notifications', s.owner_team = 'Growth-team', "
    "s.at = '2026-07-25', s.source_type = 'synthetic', "
    "s.source_ref = 'seed/org/services/notifications'",
    "MERGE (s:Service {id: 'svc-settlement'}) "
    "SET s.name = 'Settlement', s.owner_team = 'Growth-team', s.at = '2026-05-30', "
    "s.source_type = 'synthetic', s.source_ref = 'seed/org/services/settlement'",
    # Ownership (Team OWNS Service)
    "MATCH (t:Team {id: 'team-payments'}), (s:Service {id: 'svc-ledger'}) "
    "MERGE (t)-[:OWNS]->(s)",
    "MATCH (t:Team {id: 'team-payments'}), (s:Service {id: 'svc-payments'}) "
    "MERGE (t)-[:OWNS]->(s)",
    "MATCH (t:Team {id: 'team-growth'}), (s:Service {id: 'svc-retry'}) "
    "MERGE (t)-[:OWNS]->(s)",
    "MATCH (t:Team {id: 'team-growth'}), (s:Service {id: 'svc-notifications'}) "
    "MERGE (t)-[:OWNS]->(s)",
    "MATCH (t:Team {id: 'team-growth'}), (s:Service {id: 'svc-settlement'}) "
    "MERGE (t)-[:OWNS]->(s)",
    # Dependencies, consumer DEPENDS_ON provider
    "MATCH (a:Service {id: 'svc-payments'}), (b:Service {id: 'svc-ledger'}) "
    "MERGE (a)-[:DEPENDS_ON]->(b)",
    "MATCH (a:Service {id: 'svc-retry'}), (b:Service {id: 'svc-payments'}) "
    "MERGE (a)-[:DEPENDS_ON]->(b)",
    "MATCH (a:Service {id: 'svc-notifications'}), (b:Service {id: 'svc-retry'}) "
    "MERGE (a)-[:DEPENDS_ON]->(b)",
    # People (team is a property, per the spec node table)
    "MERGE (p:Person {id: 'anshu'}) "
    "SET p.name = 'Anshu', p.team = 'Payments-team', p.at = '2026-02-01', "
    "p.source_type = 'synthetic', p.source_ref = 'seed/org/people/anshu'",
    "MERGE (p:Person {id: 'priya'}) "
    "SET p.name = 'Priya', p.team = 'Payments-team', p.at = '2026-02-15', "
    "p.source_type = 'synthetic', p.source_ref = 'seed/org/people/priya'",
    "MERGE (p:Person {id: 'ravi'}) "
    "SET p.name = 'Ravi', p.team = 'Growth-team', p.at = '2026-05-01', "
    "p.source_type = 'synthetic', p.source_ref = 'seed/org/people/ravi'",
    "MATCH (p:Person {id: 'ravi'}), (s:Service {id: 'svc-notifications'}) "
    "MERGE (p)-[:WORKS_ON]->(s)",
    # Knowledge chain: INC-231 CAUSED_BY PM-231 DECIDED_IN ADR-14 CITED_IN 7f3c
    "MERGE (i:Incident {id: 'INC-231'}) "
    "SET i.title = 'payment retries spiking', i.at = '2026-09-28', "
    "i.severity = 'sev2', i.source_type = 'synthetic', "
    "i.source_ref = 'seed/org/incidents/INC-231'",
    "MERGE (pr:PR {id: 'PM-231'}) "
    "SET pr.title = 'fix retry with exponential backoff', pr.at = '2026-09-29', "
    "pr.source_type = 'synthetic', pr.source_ref = 'seed/org/prs/PM-231'",
    "MERGE (a:ADR {id: 'ADR-14'}) "
    "SET a.title = 'exponential backoff', a.at = '2026-09-30', "
    "a.source_type = 'synthetic', a.source_ref = 'seed/org/adrs/ADR-14'",
    "MERGE (c:Commit {id: 'C-7F3C'}) "
    "SET c.message = 'retry with exponential backoff', c.sha = '7f3c9a1', "
    "c.at = '2026-09-30', c.source_type = 'synthetic', "
    "c.source_ref = 'seed/org/commits/7f3c'",
    "MATCH (p:Person {id: 'anshu'}), (a:ADR {id: 'ADR-14'}) "
    "MERGE (p)-[:AUTHORED]->(a)",
    "MATCH (i:Incident {id: 'INC-231'}), (p:Person {id: 'priya'}) "
    "MERGE (i)-[:RESOLVED_BY]->(p)",
    "MATCH (i:Incident {id: 'INC-231'}), (pr:PR {id: 'PM-231'}) "
    "MERGE (i)-[:CAUSED_BY]->(pr)",
    "MATCH (pr:PR {id: 'PM-231'}), (a:ADR {id: 'ADR-14'}) "
    "MERGE (pr)-[:DECIDED_IN]->(a)",
    "MATCH (a:ADR {id: 'ADR-14'}), (c:Commit {id: 'C-7F3C'}) "
    "MERGE (a)-[:CITED_IN]->(c)",
    # Topic payout-retry, mentioned by the knowledge nodes plus Notifications
    "MERGE (t:Topic {name: 'payout-retry'}) "
    "SET t.source_type = 'synthetic', "
    "t.source_ref = 'seed/org/topics/payout-retry'",
    "MATCH (n:Incident {id: 'INC-231'}), (t:Topic {name: 'payout-retry'}) "
    "MERGE (n)-[:MENTIONS]->(t)",
    "MATCH (n:PR {id: 'PM-231'}), (t:Topic {name: 'payout-retry'}) "
    "MERGE (n)-[:MENTIONS]->(t)",
    "MATCH (n:ADR {id: 'ADR-14'}), (t:Topic {name: 'payout-retry'}) "
    "MERGE (n)-[:MENTIONS]->(t)",
    "MATCH (n:Commit {id: 'C-7F3C'}), (t:Topic {name: 'payout-retry'}) "
    "MERGE (n)-[:MENTIONS]->(t)",
    "MATCH (n:Service {id: 'svc-notifications'}), "
    "(t:Topic {name: 'payout-retry'}) "
    "MERGE (n)-[:MENTIONS]->(t)",
    # Team chat (ids carry the channel: MSG-INC = #incidents, MSG-BE = #backend)
    "MERGE (m:Message {id: 'MSG-INC-01'}) "
    "SET m.text = 'INC-231 opened: payment retries spiking on the ledger service, failure rate climbing.', "
    "m.at = '2026-09-28', m.author = 'Priya', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-01'",
    "MERGE (m:Message {id: 'MSG-INC-02'}) "
    "SET m.text = 'Seeing the same spike from Payments side. Retries hammering ledger writes.', "
    "m.at = '2026-09-28', m.author = 'Anshu', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-02'",
    "MERGE (m:Message {id: 'MSG-INC-03'}) "
    "SET m.text = 'Backend handlers have no backoff at all. Every failure retries immediately.', "
    "m.at = '2026-09-29', m.author = 'Ravi', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-03'",
    "MERGE (m:Message {id: 'MSG-INC-04'}) "
    "SET m.text = 'Payments team says the retry storm is ours, backend says it is the ledger. Pulling traces now.', "
    "m.at = '2026-09-29', m.author = 'Priya', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-04'",
    "MERGE (m:Message {id: 'MSG-INC-05'}) "
    "SET m.text = 'ADR-14 draft is up: exponential backoff on all retry paths.', "
    "m.at = '2026-09-30', m.author = 'Anshu', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-05'",
    "MERGE (m:Message {id: 'MSG-INC-06'}) "
    "SET m.text = 'INC-231 resolved. Backoff deployed, retry volume back to normal.', "
    "m.at = '2026-10-01', m.author = 'Priya', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-06'",
    "MERGE (m:Message {id: 'MSG-INC-07'}) "
    "SET m.text = 'Postmortem note: the blame thread wasted a day. Traces first next time.', "
    "m.at = '2026-10-03', m.author = 'Anshu', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/incidents/MSG-INC-07'",
    "MERGE (m:Message {id: 'MSG-BE-01'}) "
    "SET m.text = 'Proposal: add idempotency keys on retry so duplicates are safe even before backoff lands.', "
    "m.at = '2026-09-29', m.author = 'Ravi', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-01'",
    "MERGE (m:Message {id: 'MSG-BE-02'}) "
    "SET m.text = 'Idempotency keys approved for the retry worker. Pair it with ADR-14 backoff.', "
    "m.at = '2026-09-30', m.author = 'Anshu', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-02'",
    "MERGE (m:Message {id: 'MSG-BE-03'}) "
    "SET m.text = 'Payments confirms duplicate charges stopped once keys went live.', "
    "m.at = '2026-10-01', m.author = 'Priya', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-03'",
    "MERGE (m:Message {id: 'MSG-BE-04'}) "
    "SET m.text = 'Retry worker steady for a week. Closing the payout-retry watch.', "
    "m.at = '2026-10-05', m.author = 'Ravi', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-04'",
    "MERGE (m:Message {id: 'MSG-BE-05'}) "
    "SET m.text = 'Rollout window confirmed: ledger freeze lifts Friday, then we ship the queue migration.', "
    "m.at = '2026-10-07', m.author = 'Anshu', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-05'",
    "MERGE (m:Message {id: 'MSG-BE-06'}) "
    "SET m.text = 'Reminder: retry deploy window stays 2-4 AM until the freeze lifts.', "
    "m.at = '2026-10-09', m.author = 'Priya', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-06'",
    "MERGE (m:Message {id: 'MSG-BE-07'}) "
    "SET m.text = 'payout-retry retrospective drafted. Linking it to INC-231 and ADR-14.', "
    "m.at = '2026-10-14', m.author = 'Ravi', m.source_type = 'synthetic', "
    "m.source_ref = 'seed/chat/backend/MSG-BE-07'",
    "MATCH (m:Message), (t:Topic {name: 'payout-retry'}) "
    "WHERE m.id IN ['MSG-INC-01', 'MSG-INC-02', 'MSG-INC-03', 'MSG-INC-04', "
    "'MSG-INC-05', 'MSG-INC-06', 'MSG-INC-07', 'MSG-BE-01', 'MSG-BE-02', "
    "'MSG-BE-03', 'MSG-BE-04', 'MSG-BE-05', 'MSG-BE-06', 'MSG-BE-07'] "
    "MERGE (m)-[:MENTIONS]->(t)",
    # Procedures (steps stored as JSON, same convention as Action.plan)
    "MERGE (p:Procedure {id: 'PROC-RETRY-1'}) "
    "SET p.title = 'Payout-retry incident runbook', p.at = '2026-10-02', "
    "p.steps = '[\"Confirm the spike in INC-231 dashboards and open the incident thread.\", "
    "\"Check backend retry handlers for missing backoff per ADR-14.\", "
    "\"Attach idempotency keys to the retry worker before changing limits.\", "
    "\"Verify payout-retry volume returns to baseline, then resolve INC-231.\", "
    "\"Write the postmortem and link it to ADR-14.\"]', "
    "p.source_type = 'synthetic', "
    "p.source_ref = 'seed/org/procedures/retry-runbook'",
    "MERGE (p:Procedure {id: 'PROC-LEDGER-1'}) "
    "SET p.title = 'Ledger deploy checklist', p.at = '2026-10-06', "
    "p.steps = '[\"Freeze ledger writes and announce the window to Payments-team.\", "
    "\"Snapshot balances before touching the Ledger service.\", "
    "\"Deploy in the 2-4 AM window with exponential backoff enabled.\", "
    "\"Verify settlement parity, then lift the freeze.\", "
    "\"Post rollout notes mentioning payout-retry behavior.\"]', "
    "p.source_type = 'synthetic', "
    "p.source_ref = 'seed/org/procedures/ledger-checklist'",
    "MATCH (p:Procedure), (t:Topic {name: 'payout-retry'}) "
    "WHERE p.id IN ['PROC-RETRY-1', 'PROC-LEDGER-1'] "
    "MERGE (p)-[:MENTIONS]->(t)",
]

# Per-user memory graphs: (user_id, fact_id, text, salience, at)
USER_MEMORIES = [
    ("anshu", "fact-anshu-1", "Ledger freeze ends Friday", 0.9, "2026-10-14"),
    ("priya", "fact-priya-1", "Retry deploy window is 2-4 AM", 0.9, "2026-10-14"),
]

COUNT_LABELS = "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS c ORDER BY label"


def load_user_graph(db, user_id, fact_id, text, salience, at):
    g = db.select_graph(user_graph_name(user_id))
    g.query(
        "MERGE (p:Person {id: $uid}) "
        "SET p.name = $uname, p.team = $team, "
        "p.source_type = 'synthetic', p.source_ref = $pref",
        {
            "uid": user_id,
            "uname": user_id.capitalize(),
            "team": "Payments-team" if user_id == "anshu" else "Growth-team",
            "pref": f"seed/users/{user_id}/person",
        },
    )
    g.query(
        "MERGE (f:MemoryFact {id: $fid}) "
        "SET f.text = $text, f.salience = $salience, f.at = $at, "
        "f.valid_until = null, "
        "f.source_type = 'synthetic', f.source_ref = $fref",
        {
            "fid": fact_id,
            "text": text,
            "salience": salience,
            "at": at,
            "fref": f"seed/users/{user_id}/{fact_id}",
        },
    )
    g.query(
        "MATCH (p:Person {id: $uid}), (f:MemoryFact {id: $fid}) "
        "MERGE (p)-[:REMEMBERS]->(f)",
        {"uid": user_id, "fid": fact_id},
    )
    return g


def show_counts(db):
    for name in [ORG_GRAPH] + [user_graph_name(u) for u, *_ in USER_MEMORIES]:
        g = db.select_graph(name)
        rows = g.query(COUNT_LABELS).result_set
        summary = ", ".join(f"{r[0]}={r[1]}" for r in rows)
        print(f"graph {name}: {summary}")


def main():
    try:
        db = get_db()
        org = db.select_graph(ORG_GRAPH)
        for stmt in ORG_STATEMENTS:
            org.query(stmt)
        for mem in USER_MEMORIES:
            load_user_graph(db, *mem)
    except Exception as exc:
        print(f"seed failed: FalkorDB unreachable ({exc})")
        raise SystemExit(1)
    show_counts(db)
    print("seed ok")


if __name__ == "__main__":
    main()
