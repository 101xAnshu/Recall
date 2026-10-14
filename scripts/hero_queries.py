"""Run the 5 hero queries against the seeded graph.

Read-only, parameterized, one graph per query. Adapted to the product spec
model: the why-path coalesce covers title, name, message and id; the
who-knows third pattern is a single OPTIONAL MATCH pair for FalkorDB compat;
the blast-radius AFFECTS branch is kept for shape but empty in this model.

Usage, from repo root: python scripts/hero_queries.py
"""

from app.graph import ORG_GRAPH, get_db, user_graph_name

WHY_PATH = """
MATCH p = (i:Incident {id: $incident_id})-[:CAUSED_BY|RESOLVED_BY|DECIDED_IN|CITED_IN*1..4]-(n)
RETURN [x IN nodes(p) | labels(x)[0] + ': ' + coalesce(x.title, x.name, x.message, x.id)] AS trace,
       length(p) AS hops
ORDER BY hops LIMIT 5
"""

BLAST_RADIUS = """
MATCH (s:Service {name: $service})
CALL {
  WITH s
  MATCH (s)<-[:DEPENDS_ON*1..3]-(d:Service)
  RETURN d AS svc
  UNION
  WITH s
  MATCH (s)-[:AFFECTS*1..3]->(a:Service)
  RETURN a AS svc
}
MATCH (t:Team)-[:OWNS]->(svc)
RETURN DISTINCT svc.name AS affected, t.name AS owner_team
ORDER BY affected
"""

WHO_KNOWS = """
MATCH (t:Topic {name: $topic})
MATCH (p:Person)
OPTIONAL MATCH (p)-[r1:WORKS_ON]->(x1)-[:MENTIONS]->(t)
OPTIONAL MATCH (p)-[r2:AUTHORED]->(x2)-[:MENTIONS]->(t)
OPTIONAL MATCH (i:Incident)-[r3:RESOLVED_BY]->(p), (i)-[:MENTIONS]->(t)
WITH p, count(DISTINCT r1) AS worked, count(DISTINCT r2) AS authored,
     count(DISTINCT r3) AS resolved, max(coalesce(r1.at, r2.at, r3.at)) AS latest
WITH p, worked, authored, resolved, latest,
     (worked * 1.0 + authored * 1.5 + resolved * 2.0) AS score
WHERE score > 0
RETURN p.name AS person, score,
       worked AS worked_on, authored AS authored_docs,
       resolved AS resolved_incidents, latest AS latest_activity
ORDER BY score DESC, latest DESC LIMIT 5
"""

BUS_FACTOR = """
MATCH (p:Person)-[:OWNS|AUTHORED]->(s:Service)
WITH s, collect(p) AS owners WHERE size(owners) = 1
RETURN s.name AS service, owners[0].name AS sole_owner
"""

MEMORY_RECALL = """
MATCH (u:Person {id: $user})-[:REMEMBERS]->(f:MemoryFact)
WHERE f.valid_until IS NULL
RETURN f.text AS fact, f.salience AS s, f.at AS at
ORDER BY s DESC, at DESC LIMIT 10
"""


def run(graph_name, graph, title, query, params=None):
    print(f"--- {title} (graph={graph_name}, params={params or {}}) ---")
    try:
        result = graph.query(query, params or {})
    except Exception as exc:
        print(f"FAILED: {exc}")
        return
    cols = [h[1] if isinstance(h, (list, tuple)) else h for h in result.header]
    rows = [dict(zip(cols, row)) for row in result.result_set]
    if not rows:
        print("(no rows)")
    for row in rows:
        print(row)


def main():
    try:
        db = get_db()
        org = db.select_graph(ORG_GRAPH)
        run(ORG_GRAPH, org, "1. why-path", WHY_PATH, {"incident_id": "INC-231"})
        run(ORG_GRAPH, org, "2. blast-radius", BLAST_RADIUS, {"service": "Ledger"})
        run(ORG_GRAPH, org, "3. who-knows", WHO_KNOWS, {"topic": "payout-retry"})
        run(ORG_GRAPH, org, "4. bus-factor", BUS_FACTOR)
        for user_id in ("anshu", "priya"):
            gname = user_graph_name(user_id)
            run(gname, db.select_graph(gname), "5. per-tenant recall",
                MEMORY_RECALL, {"user": user_id})
    except Exception as exc:
        print(f"hero queries failed: FalkorDB unreachable ({exc})")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
