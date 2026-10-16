"""Phase B end-to-end proof: question -> traversal -> traced answer ->
gated action -> memory write-back. Talks HTTP like the future UI does.

Usage: start the backend first (uvicorn app.main:app), then
python scripts/e2e.py [base_url]. Exits nonzero on the first failure.
"""

import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
UA = {"User-Agent": "MeridianPay/1.0 (+local)",
      "Content-Type": "application/json"}
FALLBACK = ("I can't answer this. The relationships required for the answer "
            "don't exist in the fallback.")


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=UA,
                                 method=method)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f" | {detail}" if detail else ""))
    if not cond:
        raise SystemExit(f"e2e failed at: {name} :: {detail}")


def main():
    check("health ok", call("GET", "/health") == {"falkordb": "ok"})

    why = call("POST", "/ask", {"question": "Why did INC-231 happen?",
                                "user_id": "anshu"})
    trace = " -> ".join(why.get("trace", []))
    check("why-path traced to commit", "Commit:" in trace, trace)
    check("why answer cites evidence",
          any("seed/org" in str(e) for e in why.get("evidence", [])))
    print("  answer: " + why["answer"].replace("\n", " | ")[:220])

    blast = call("POST", "/ask", {"question": "What breaks if we change Ledger?",
                                  "user_id": "anshu"})
    names = {r["affected"] for r in blast["evidence"][0]["affected"]}
    check("blast radius exact set",
          names == {"Payments", "Retry", "Notifications"}, str(names))

    who = call("POST", "/ask", {"question": "Who knows payout-retry?",
                                "user_id": "anshu"})
    top = who["evidence"][0]["experts"][0]
    check("who-knows ranks Priya first",
          top["person"] == "Priya" and top["score"] == 2.0, str(top))
    check("who-knows latest present",
          all(e["latest"] for e in who["evidence"][0]["experts"]))

    proc = call("POST", "/ask",
               {"question": "How do we handle a payout-retry incident?",
                "user_id": "anshu"})
    pev = [e for e in proc.get("evidence", []) if e.get("kind") == "procedures"]
    check("procedures retrieved",
          len(pev) > 0 and len(pev[0].get("procedures", [])) >= 1,
          str([p.get("title") for p in pev[0].get("procedures", [])]))
    check("procedure steps with sources",
          all(p.get("steps") and p.get("source_ref")
              for p in pev[0].get("procedures", [])))

    mem = call("POST", "/ask", {"question": "What do I remember?",
                                "user_id": "anshu"})
    check("tenant memory isolated",
          "Ledger freeze ends Friday" in mem["answer"], mem["answer"][:120])
    mem_p = call("POST", "/ask", {"question": "What do I remember?",
                                  "user_id": "priya"})
    check("priya sees her own fact",
          "Retry deploy window" in mem_p["answer"], mem_p["answer"][:120])

    rem = call("POST", "/memory/remember",
               {"user_id": "anshu", "text": "E2E probe fact alpha",
                "salience": 0.5})
    fid = rem["fact_id"]
    check("remember writes fact", fid.startswith("fact-"), fid)
    cur = call("GET", "/memory?user_id=anshu")
    check("recall returns new fact",
          any(f["fact_id"] == fid for f in cur["facts"]))

    sup = call("POST", "/memory/supersede",
               {"user_id": "anshu", "fact_id": fid,
                "new_text": "E2E probe fact alpha revised"})
    check("supersede versions", sup["old_id"] == fid, str(sup))
    cur2 = call("GET", "/memory?user_id=anshu")
    texts = [f["text"] for f in cur2["facts"]]
    check("current is new only", "E2E probe fact alpha revised" in texts
          and "E2E probe fact alpha" not in " | ".join(
              t for t in texts if t != "E2E probe fact alpha revised"),
          str(texts))

    forg = call("POST", "/memory/forget",
                {"user_id": "anshu", "fact_id": sup["new_id"]})
    check("forget issues receipt",
          forg["receipt_id"].startswith("ERASURE-"), str(forg))
    cur3 = call("GET", "/memory?user_id=anshu")
    check("erased fact never recalled",
          all("E2E probe" not in f["text"] for f in cur3["facts"]))
    neg = call("POST", "/ask", {"question": "Do you remember the E2E probe fact alpha?",
                                "user_id": "anshu"})
    check("negative recall quotes receipt",
          "no longer have that fact" in neg["answer"]
          and forg["receipt_id"] in neg["answer"], neg["answer"][:160])

    prop = call("POST", "/actions/propose",
                {"goal": "Migrate Retry to the new queue", "user_id": "anshu"})
    check("propose pauses with plan",
          prop["action_id"].startswith("ACT-") and len(prop["plan"]) >= 3,
          str(prop["plan"]))
    check("nothing executed yet",
          all(e["action_id"] != prop["action_id"] or e["status"] == "proposed"
              for e in call("GET", "/audit")["entries"]))
    appr = call("POST", "/actions/approve",
                {"action_id": prop["action_id"],
                 "thread_id": prop["thread_id"], "by": "anshu"})
    check("approve executes", appr["status"] == "executed", str(appr))
    entries = call("GET", "/audit")["entries"]
    mine = [e for e in entries if e["action_id"] == prop["action_id"]][0]
    check("audit shows APPROVED_BY Anshu",
          mine["decision"] == "APPROVED_BY" and mine["decided_by"] == "Anshu",
          str(mine))

    prop2 = call("POST", "/actions/propose",
                 {"goal": "Freeze Ledger for maintenance", "user_id": "anshu"})
    rej = call("POST", "/actions/reject",
               {"action_id": prop2["action_id"],
                "thread_id": prop2["thread_id"], "by": "priya",
                "reason": "freeze window unconfirmed"})
    check("reject records", rej["status"] == "rejected", str(rej))

    prop3 = call("POST", "/actions/propose",
                 {"goal": "Migrate Notifications to the new queue",
                  "user_id": "anshu"})
    aid3 = prop3["action_id"]
    call("POST", "/actions/approve",
         {"action_id": aid3, "by": "anshu"})
    exe = call("POST", "/actions/execute", {"action_id": aid3})
    check("direct execute marks executed",
          exe.get("status") == "executed" and exe.get("action_id") == aid3,
          str(exe))

    miss = call("GET", "/blast-radius?service=Nope")
    check("unknown service is honest, not fallback",
          miss.get("error", "").startswith("unknown service"), str(miss))

    call("POST", "/admin/disconnect")
    down = call("POST", "/ask", {"question": "Why did INC-231 happen?",
                                 "user_id": "anshu"})
    check("outage returns fallback", down.get("error") == FALLBACK, str(down))
    call("POST", "/admin/reconnect")
    up = call("POST", "/ask", {"question": "Why did INC-231 happen?",
                               "user_id": "anshu"})
    check("recovery returns traced answer",
          "Commit:" in " -> ".join(up.get("trace", [])), str(up.get("trace")))

    print("E2E PASS: full loop works")


if __name__ == "__main__":
    main()
