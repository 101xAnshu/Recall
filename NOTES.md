# Build notes (running log, for Day-4 README assembly)

## Phase A (Day 1) - data and schema

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
- Bus factor is run as specified (Person OWNS or AUTHORED a Service); the
  spec seed uses Team ownership, so an empty result is correct, not a bug.

### Environment notes
- Spec target is Python 3.12; this sandbox runs the seed and queries with the
  local Python (3.14) while the code targets 3.12 features only.
