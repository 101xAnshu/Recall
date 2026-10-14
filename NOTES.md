# Build notes (running log, for Day-4 README assembly)

## Phase A - data and schema

- FalkorDB image: falkordb/falkordb:6.0.1 (exact pin, never latest)
- Backend stack: FastAPI, falkordb client, groq, fastembed (BAAI/bge-small-en-v1.5), LangGraph
- Graphs: org (company brain) plus user_anshu and user_priya (memory isolation)
- Seed: all synthetic, idempotent MERGE only, provenance source_type and
  source_ref on every node
- Hero queries: why-path, blast radius, who-knows, bus factor, per-tenant recall
  (final versions per the master build plan, adapted to the product spec model)

### Seed assumptions (spec section 8 is terse here)
- PM-231 is modeled as a PR node with id PM-231, since DECIDED_IN requires
  a PR source and CAUSED_BY allows a PR target.
- Topic payout-retry is mentioned by the four knowledge nodes (INC-231,
  PM-231, ADR-14, commit 7f3c) and by the Notifications service, so the
  who-knows ranking shows Priya 2.0, Anshu 1.5, Ravi 1.0.
- Bus factor is defined on WORKS_ON staffing: a service with exactly one
  person working on it is a single point of failure. Ownership in this model
  is Team-level, so the query does not use OWNS. Services with no staff at
  all (Ledger, Payments, Retry, Settlement) have no coverage, which the
  runner notes alongside the single-staffer rows.

### Environment notes
- Spec target is Python 3.12; this sandbox runs the seed and queries with the
  local Python (3.14) while the code targets 3.12 features only.

### Phase A results (verified Oct 15)
- Seed load is idempotent: two consecutive runs give identical counts.
- org graph: ADR=1, Commit=1, Incident=1, PR=1, Person=3, Service=5,
  Team=2, Topic=1. user_anshu and user_priya hold 1 MemoryFact each.
- Why-path for INC-231 returns the full chain to commit 7f3c in 3 hops,
  plus the RESOLVED_BY branch to Priya.
- Blast radius for Ledger returns Payments, Retry, Notifications with owners.
  Settlement is correctly excluded.
- Who-knows for payout-retry returns Priya 2.0, Anshu 1.5, Ravi 1.0 with
  breakdowns. latest_activity comes from evidence-node at dates
  (INC-231, ADR-14, Notifications service); every seed node now carries at.
- Bus factor returns Notifications staffed only by Ravi. Ledger, Payments,
  Retry and Settlement have no WORKS_ON coverage at all.
- Per-tenant recall returns a different fact for anshu and priya.
- Runner fix: falkordb-py 1.8.0 returns headers as type/name pairs, so the
  runner reads the name element before printing rows.

## Phase B - agent loop and memory

- Tools (app/tools.py): trace_why, blast_radius, who_knows, recall_memory,
  curate_memory, supersede_memory, forget_with_receipt, propose_action,
  approve_action, reject_action, audit_trail, memory_history. Every tool
  issues parameterized Cypher against exactly one graph.
- Agent (app/agent.py): scope_resolver, retriever, answer_drafter, then
  plan_drafter, approval_gate (interrupt, the loop stops), executor,
  audit_writer. Intent order matters: why, blast, who, memory, then action,
  so "what breaks if we change Ledger" reads as a blast question.
- Answers are template-drafted from tool evidence only (no Groq key in this
  sandbox); the Groq path with neutral User-Agent is coded and falls back
  cleanly. Every claim cites a source_ref.
- Memory: content-hash MERGE; re-curation past superseded history mints a
  -rN id so history is never rewritten; receipts carry timestamps so the
  newest erasure wins the negative-recall quote.
- Outage (verified with FalkorDB stopped): /health reports down and every
  endpoint returns the exact fallback message. Restart restores full answers.
- E2E residue by design: superseded history facts, erasure receipts, and
  decided Action nodes stay in the graphs as audit artifacts.
