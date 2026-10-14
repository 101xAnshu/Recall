"""Shared eval corpus built from the live graph (same source for both arms).

The corpus is a deterministic list of text chunks covering the org graph
plus the seed users' current memory facts. The evalprobe user is harness
scaffolding and is excluded. One arm reads these chunks with embeddings;
the other arm traverses the live graph they were rendered from.
"""

from app import tools
from app.graph import ORG_GRAPH, get_db, user_graph_name


def _rows(graph, query, params=None):
    return tools._rows(graph, query, params or {})


def build_corpus():
    db = get_db()
    org = db.select_graph(ORG_GRAPH)
    chunks = []

    services = _rows(
        org, "MATCH (s:Service) OPTIONAL MATCH (t:Team)-[:OWNS]->(s) "
        "RETURN s.name AS name, t.name AS owner, s.at AS at, "
        "s.source_ref AS ref ORDER BY name")
    deps = _rows(
        org, "MATCH (c:Service)-[:DEPENDS_ON]->(p:Service) "
        "RETURN c.name AS consumer, p.name AS provider")
    providers = {}
    dependents = {}
    for d in deps:
        providers.setdefault(d["consumer"], []).append(d["provider"])
        dependents.setdefault(d["provider"], []).append(d["consumer"])
    for s in services:
        name = s["name"]
        chunks.append({
            "id": f"org-service-{name}",
            "text": (f"Service {name} (ref {s['ref']}) is owned by "
                     f"{s['owner']} and started {s['at']}. It depends on "
                     f"{', '.join(providers.get(name, ['nothing']))}. "
                     f"Services depending on {name}: "
                     f"{', '.join(dependents.get(name, ['none']))}."),
        })

    teams = _rows(
        org, "MATCH (t:Team)-[:OWNS]->(s:Service) "
        "RETURN t.name AS team, collect(s.name) AS services ORDER BY team")
    for t in teams:
        chunks.append({
            "id": f"org-team-{t['team']}",
            "text": f"Team {t['team']} owns {', '.join(t['services'])}.",
        })

    people = _rows(org, "MATCH (p:Person) RETURN p.id AS id, p.name AS name, "
                        "p.team AS team, p.at AS at ORDER BY name")
    for p in people:
        works = _rows(
            org, "MATCH (x:Person {id: $id})-[:WORKS_ON]->(s:Service) "
            "RETURN s.name AS name", {"id": p["id"]})
        authored = _rows(
            org, "MATCH (x:Person {id: $id})-[:AUTHORED]->(a:ADR) "
            "RETURN a.id AS id", {"id": p["id"]})
        resolved = _rows(
            org, "MATCH (i:Incident)-[:RESOLVED_BY]->(x:Person {id: $id}) "
            "RETURN i.id AS id", {"id": p["id"]})
        chunks.append({
            "id": f"org-person-{p['id']}",
            "text": (f"{p['name']} is on team {p['team']} (joined {p['at']}). "
                     f"Works on: {', '.join([w['name'] for w in works] or ['nothing'])}. "
                     f"Authored: {', '.join([a['id'] for a in authored] or ['nothing'])}. "
                     f"Resolved incidents: {', '.join([r['id'] for r in resolved] or ['none'])}."),
        })

    incidents = _rows(
        org, "MATCH (i:Incident) OPTIONAL MATCH (i)-[:CAUSED_BY]->(pr:PR) "
        "OPTIONAL MATCH (i)-[:RESOLVED_BY]->(p:Person) "
        "RETURN i.id AS id, i.title AS title, i.severity AS sev, i.at AS at, "
        "pr.id AS pr, p.name AS resolver ORDER BY id")
    for i in incidents:
        chunks.append({
            "id": f"org-incident-{i['id']}",
            "text": (f"Incident {i['id']}: {i['title']} (severity {i['sev']}, "
                     f"{i['at']}). Caused by {i['pr']}. "
                     f"Resolved by {i['resolver']}."),
        })

    chain = _rows(
        org, "MATCH (pr:PR)-[:DECIDED_IN]->(a:ADR)-[:CITED_IN]->(c:Commit) "
        "RETURN pr.id AS pr, pr.title AS ptitle, pr.at AS pat, a.id AS adr, "
        "a.title AS atitle, a.at AS aat, c.sha AS sha, c.message AS msg")
    for c in chain:
        chunks.append({
            "id": f"org-chain-{c['adr']}",
            "text": (f"PR {c['pr']} ({c['ptitle']}, {c['pat']}) was decided "
                     f"in {c['adr']} ({c['atitle']}, {c['aat']}). {c['adr']} "
                     f"is evidenced by commit {c['sha']} ({c['msg']})."),
        })

    topics = _rows(
        org, "MATCH (n)-[:MENTIONS]->(t:Topic) "
        "RETURN t.name AS topic, collect(coalesce(n.title, n.name, n.message, n.id)) AS nodes")
    for t in topics:
        chunks.append({
            "id": f"org-topic-{t['topic']}",
            "text": f"Topic {t['topic']} is mentioned by {', '.join(t['nodes'])}.",
        })

    for user_id in ("anshu", "priya"):
        mem = tools.recall_memory(user_id)
        for f in mem["facts"]:
            chunks.append({
                "id": f"user-{user_id}-{f['fact_id']}",
                "text": f"{user_id.capitalize()} remembers: {f['text']} (at {f['at']}).",
            })
    return chunks
