"""One-command benchmark: flat RAG vs graph traversal, identical conditions.

Same questions, same corpus source, same drafting model. Structured
scoring checks whether each answer surfaced the required evidence; an LLM
judge only notes narration quality. Groq calls are spaced for the free
tier (30 req/min). The key comes from the environment at runtime only.

Methodology note: the RAG index is a static snapshot built BEFORE the
eval mutations (supersede/forget), the way a periodically reindexed
baseline behaves in production. The graph arm reads live data.

Usage: .venv/bin/python eval/run.py [--mock] [--limit N] [--no-judge]
"""

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.agent as agent_mod
from app import tools
from eval.corpus import build_corpus

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
CALL_GAP = 2.1
TOP_K_DEFAULT = 5

CATEGORIES = ["causal", "blast", "ownership", "temporal", "memory"]


class MissingKeyError(RuntimeError):
    pass


def load_questions():
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "questions.json")) as fh:
        qs = json.load(fh)
    assert len(qs) == 30, f"expected 30 questions, got {len(qs)}"
    assert {q["id"] for q in qs} and len({q["id"] for q in qs}) == 30
    for q in qs:
        assert set(q) == {"id", "category", "user_id", "question", "expected"}
        assert q["category"] in CATEGORIES, q["id"]
        assert set(q["expected"]) == {"required_nodes", "required_services",
                                      "required_people", "required_phrases",
                                      "forbidden_text"}
    return qs


def _norm(text):
    """Fold Unicode dashes/spaces to ASCII so LLM typography cannot
    break substring scoring. Applied equally to answers and items."""
    import unicodedata
    text = unicodedata.normalize("NFKC", text or "").lower()
    for ch in ("\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2212"):
        text = text.replace(ch, "-")
    for ch in ("\u00a0", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004",
               "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200a",
               "\u202f", "\u205f", "\u3000"):
        text = text.replace(ch, " ")
    return " ".join(text.split())


def score_answer(answer, expected):
    normed = _norm(answer)
    checks = []
    for key in ("required_nodes", "required_services", "required_people",
                "required_phrases"):
        for item in expected.get(key, []):
            checks.append({"item": item, "kind": key,
                           "passed": _norm(item) in normed})
    for item in expected.get("forbidden_text", []):
        checks.append({"item": item, "kind": "forbidden_text",
                       "passed": _norm(item) not in normed})
    score = sum(1 for c in checks if c["passed"]) / len(checks)
    return score, checks


def setup_eval_data():
    """Create the versioning and erasure fixtures in the evalprobe graph."""
    info = {}
    r = tools.curate_memory("evalprobe", "Evalprobe staging deploys at 9 AM",
                            0.5)
    s = tools.supersede_memory("evalprobe", r["fact_id"],
                               "Evalprobe staging deploys at 10 AM")
    info["versioned"] = s
    n1 = tools.curate_memory("evalprobe", "Evalprobe old homepage headline",
                             0.5)
    f1 = tools.forget_with_receipt("evalprobe", n1["fact_id"])
    n2 = tools.curate_memory("evalprobe", "Evalprobe legacy status page", 0.5)
    f2 = tools.forget_with_receipt("evalprobe", n2["fact_id"])
    info["receipts"] = [f1["receipt_id"], f2["receipt_id"]]
    return info


def embed_texts(texts):
    from fastembed import TextEmbedding
    import numpy as np
    model = TextEmbedding(EMBED_MODEL)
    return np.stack(list(model.embed(texts)))


def retrieve(query, chunks, matrix, top_k):
    from fastembed import TextEmbedding
    import numpy as np
    model = TextEmbedding(EMBED_MODEL)
    qvec = list(model.embed([query]))[0]
    sims = matrix @ qvec / (np.linalg.norm(matrix, axis=1)
                            * np.linalg.norm(qvec))
    top = np.argsort(-sims)[:top_k]
    return [chunks[i] for i in top]


def mock_draft(question, evidence):
    return " ".join(str(e) for e in evidence)[:800]


def judge_narration(question, answer, draft_fn):
    if not answer:
        return None
    return draft_fn(
        "Rate this answer 0 to 1 for narration quality only, "
        "ignoring factuality. Reply with the number first: " + question,
        [answer])


def run_benchmark(limit=None, mock=False, judge=True):
    questions = load_questions()
    if limit:
        questions = questions[:limit]
    live = not mock
    if live and not os.getenv("GROQ_API_KEY"):
        raise MissingKeyError(
            "GROQ_API_KEY is not set. Export it and rerun, or use --mock "
            "for offline plumbing checks (mock numbers are not a benchmark).")

    original_draft = agent_mod._llm_draft
    if live:
        def throttled(question, evidence):
            try:
                return original_draft(question, evidence)
            finally:
                time.sleep(CALL_GAP)
        agent_mod._llm_draft = throttled
        draft_fn = agent_mod._llm_draft
    else:
        agent_mod._llm_draft = lambda question, evidence: None
        draft_fn = mock_draft
    try:
        chunks = build_corpus()
        texts = [c["text"] for c in chunks]
        matrix = embed_texts(texts)
        setup_eval_data()
        results = []
        for q in questions:
            gout = agent_mod.run_ask(q["question"], q["user_id"])
            g_answer = gout.get("answer", "") if "error" not in gout else ""
            top = retrieve(q["question"], chunks, matrix, TOP_K_DEFAULT)
            r_answer = draft_fn(q["question"], [c["text"] for c in top])
            g_score, g_checks = score_answer(g_answer, q["expected"])
            r_score, r_checks = score_answer(r_answer or "", q["expected"])
            entry = {"id": q["id"], "category": q["category"],
                     "question": q["question"],
                     "graph": {"answer": g_answer, "score": round(g_score, 3),
                               "checks": g_checks},
                     "rag": {"answer": (r_answer or "")[:800],
                             "score": round(r_score, 3), "checks": r_checks,
                             "retrieved": [c["id"] for c in top]}}
            if live and judge:
                entry["judge_graph"] = judge_narration(
                    q["question"], g_answer, draft_fn)
                entry["judge_rag"] = judge_narration(
                    q["question"], r_answer or "", draft_fn)
            else:
                entry["judge_graph"] = None
                entry["judge_rag"] = None
            results.append(entry)
            print(f"{q['id']:9} graph={g_score:.2f} rag={r_score:.2f} "
                  f"{q['question'][:60]}", flush=True)
    finally:
        agent_mod._llm_draft = original_draft

    per_cat = {}
    for c in CATEGORIES:
        rows = [r for r in results if r["category"] == c]
        if rows:
            per_cat[c] = {
                "n": len(rows),
                "graph": round(sum(r["graph"]["score"] for r in rows), 3),
                "rag": round(sum(r["rag"]["score"] for r in rows), 3),
            }
    summary = {"n": len(results),
               "graph_score": round(sum(r["graph"]["score"] for r in results), 3),
               "rag_score": round(sum(r["rag"]["score"] for r in results), 3),
               "per_category": per_cat,
               "mode": "live" if live else "mock",
               "results": results}
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mock", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-judge", action="store_true")
    args = ap.parse_args()
    try:
        summary = run_benchmark(limit=args.limit, mock=args.mock,
                                judge=not args.no_judge)
    except MissingKeyError as exc:
        print(str(exc))
        return 2
    print("\n== totals ==")
    print(f"mode={summary['mode']} n={summary['n']} "
          f"graph={summary['graph_score']} rag={summary['rag_score']}")
    for c, v in summary["per_category"].items():
        print(f"{c:10} n={v['n']} graph={v['graph']} rag={v['rag']}")
    if args.mock:
        print("NOTE: mock numbers test plumbing only, not narration. "
              "They are not a benchmark.")
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
