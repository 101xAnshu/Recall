"""Concurrency probe: 50 concurrent mixed read/write requests.

Fires ask, remember, and blast-radius calls at the local API at once and
reports success rate, p50/p95 latency, and write conflicts. Probe facts
use unique texts under an isolated loadprobe user, never demo users.

Usage: .venv/bin/python scripts/load_probe.py [base_url] [workers]
"""

import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 50
UA = {"User-Agent": "MeridianPay/1.0 (+local)",
      "Content-Type": "application/json"}
USER = "loadprobe"


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=UA,
                                 method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            payload = json.loads(res.read().decode())
    except Exception as exc:
        return {"op": path, "ok": False, "secs": time.perf_counter() - started,
                "detail": f"{type(exc).__name__}: {exc}"}
    secs = time.perf_counter() - started
    return {"op": path, "ok": True, "secs": secs, "payload": payload}


def job(i):
    kind = i % 5
    if kind == 0:
        r = call("POST", "/ask",
                 {"question": "Why did INC-231 happen?", "user_id": USER})
        if r["ok"]:
            r["ok"] = bool(r["payload"].get("answer"))
        return r
    if kind == 1:
        r = call("POST", "/ask",
                 {"question": "What breaks if we change Ledger?",
                  "user_id": USER})
        if r["ok"]:
            ev = r["payload"].get("evidence", [])
            r["ok"] = any(e.get("kind") == "blast-radius" for e in ev)
        return r
    if kind == 2:
        r = call("POST", "/memory/remember",
                 {"user_id": USER, "text": f"Load probe fact {i}",
                  "salience": 0.1})
        if r["ok"]:
            r["ok"] = bool(r["payload"].get("fact_id"))
            r["fact_id"] = r["payload"].get("fact_id", "")
        return r
    if kind == 3:
        r = call("GET", "/blast-radius?service=Ledger")
        if r["ok"]:
            r["ok"] = len(r["payload"].get("affected", [])) == 3
        return r
    r = call("GET", "/memory?user_id=anshu")
    if r["ok"]:
        r["ok"] = isinstance(r["payload"].get("facts"), list)
    return r


def pct(rows, p):
    ordered = sorted(rows)
    if not ordered:
        return 0.0
    k = min(len(ordered) - 1, int(p / 100 * len(ordered)))
    return ordered[k]


def main():
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=N) as pool:
        results = list(pool.map(job, range(N)))
    wall = time.perf_counter() - t0
    ok = [r for r in results if r["ok"]]
    bad = [r for r in results if not r["ok"]]
    lat = [r["secs"] for r in results]
    ids = [r.get("fact_id", "") for r in results if r.get("fact_id")]
    dupes = len(ids) - len(set(ids))
    by_op = {}
    for r in results:
        by_op.setdefault(r["op"], []).append(r["secs"])
    summary = {
        "workers": N,
        "wall_secs": round(wall, 2),
        "success": f"{len(ok)}/{N}",
        "p50_secs": round(pct(lat, 50), 3),
        "p95_secs": round(pct(lat, 95), 3),
        "duplicate_fact_ids": dupes,
        "failures": [
            {"op": r["op"], "detail": r.get("detail", r.get("payload", ""))}
            for r in bad
        ],
        "per_op_p50": {op: round(pct(v, 50), 3) for op, v in by_op.items()},
    }
    print(json.dumps(summary, indent=2))
    return 0 if not bad and not dupes else 1


if __name__ == "__main__":
    raise SystemExit(main())
