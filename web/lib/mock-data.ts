export type Trace = { from: string; to: string; edge: string };
export type Evidence = { label: string; source_ref: string };

export type AskResp = {
  answer: string;
  trace: Trace[];
  evidence: Evidence[];
  error?: string;
  action_id?: string;
  plan?: string[];
  affected?: { service: string; owner_team: string; hops: number; status: string }[];
  experts?: {
    person: string;
    score: number;
    breakdown: { worked_on: number; authored: number; resolved: number };
    latest: string | null;
  }[];
};

export type BlastRow = {
  service: string;
  owner_team: string;
  hops: number;
  status: string;
};

export type Expert = {
  person: string;
  score: number;
  breakdown: { worked_on: number; authored: number; resolved: number };
  latest: string | null;
};

export type AuditEntry = {
  id: string;
  goal: string;
  plan: string[];
  status: string;
  at: string;
  by: string | null;
  reason?: string | null;
  decided_at?: string | null;
};

export type MemoryFact = {
  id: string;
  text: string;
  salience: number;
  at: string;
  valid_until?: string | null;
  superseded_by?: string | null;
  source_ref?: string;
};

export const ASK_RESPONSES: Record<string, AskResp> = {
  "why did inc-231 happen?": {
    answer:
      "INC-231 was caused by a retry storm in payout-retry after Ledger slowed down. Ledger latency spiked at 14:02, Retry backed off incorrectly, and Payments fanned out duplicate settlement writes. The fix landed in Retry v2.4 with capped backoff.",
    trace: [
      { from: "INC-231", to: "payout-retry", edge: "CAUSED_BY" },
      { from: "payout-retry", to: "Ledger", edge: "DEPENDS_ON" },
      { from: "Ledger", to: "Payments", edge: "DEPENDS_ON" },
      { from: "anshu", to: "INC-231", edge: "RESOLVED" },
    ],
    evidence: [
      { label: "postmortem", source_ref: "src:postmortem/INC-231" },
      { label: "retry diff", source_ref: "src:diff/retry-v2.4" },
      { label: "ledger dashboard", source_ref: "src:dashboard/ledger-latency" },
    ],
  },
  "what breaks if we change ledger?": {
    answer:
      "Changing Ledger affects Payments, Retry and Notifications downstream. Payments reads settlement balances directly, Retry keys idempotency off ledger entries, and Notifications renders payout status from the same stream.",
    trace: [
      { from: "Payments", to: "Ledger", edge: "DEPENDS_ON" },
      { from: "Retry", to: "Ledger", edge: "DEPENDS_ON" },
      { from: "Notifications", to: "Payments", edge: "DEPENDS_ON" },
    ],
    evidence: [
      { label: "dependency graph", source_ref: "src:graph/depends-on" },
      { label: "ledger schema", source_ref: "src:schema/ledger-v9" },
    ],
  },
  "who knows payout-retry?": {
    answer:
      "Priya knows payout-retry best (score 3.0), followed by Anshu (2.5). Priya resolved two retry incidents and authored the backoff policy; Anshu worked on the queue migration.",
    trace: [
      { from: "priya", to: "payout-retry", edge: "AUTHORED" },
      { from: "priya", to: "INC-231", edge: "RESOLVED" },
      { from: "anshu", to: "payout-retry", edge: "WORKED_ON" },
    ],
    evidence: [
      { label: "backoff policy", source_ref: "src:doc/retry-backoff" },
      { label: "incident log", source_ref: "src:log/INC-231" },
    ],
  },
};

export const GENERIC_ASK: AskResp = {
  answer:
    "Based on the institutional graph, this touches Ledger, Payments and Retry. The strongest path runs through payout-retry with two supporting evidence refs. Ask about INC-231, Ledger, or payout-retry for a fully traced answer.",
  trace: [
    { from: "query", to: "payout-retry", edge: "MENTIONS" },
    { from: "payout-retry", to: "Ledger", edge: "DEPENDS_ON" },
  ],
  evidence: [
    { label: "graph snapshot", source_ref: "src:graph/snapshot-42" },
    { label: "runbook", source_ref: "src:runbook/payouts" },
  ],
};

export const BLAST_MAP: Record<string, BlastRow[]> = {
  Ledger: [
    { service: "Payments", owner_team: "payments", hops: 1, status: "active" },
    { service: "Retry", owner_team: "reliability", hops: 1, status: "active" },
    { service: "Notifications", owner_team: "growth", hops: 2, status: "active" },
    { service: "Settlement", owner_team: "payments", hops: 2, status: "active" },
  ],
  Payments: [
    { service: "Notifications", owner_team: "growth", hops: 1, status: "active" },
    { service: "Settlement", owner_team: "payments", hops: 1, status: "active" },
  ],
  Retry: [
    { service: "Payments", owner_team: "payments", hops: 1, status: "active" },
    { service: "Notifications", owner_team: "growth", hops: 2, status: "active" },
  ],
  Notifications: [],
  Settlement: [
    { service: "Notifications", owner_team: "growth", hops: 1, status: "active" },
  ],
};

export const EXPERTS_MAP: Record<string, Expert[]> = {
  "payout-retry": [
    {
      person: "priya",
      score: 3.0,
      breakdown: { worked_on: 1, authored: 2, resolved: 2 },
      latest: "2026-09-18",
    },
    {
      person: "anshu",
      score: 2.5,
      breakdown: { worked_on: 2, authored: 1, resolved: 1 },
      latest: "2026-09-02",
    },
    {
      person: "mei",
      score: 1.0,
      breakdown: { worked_on: 1, authored: 0, resolved: 0 },
      latest: "2026-06-11",
    },
  ],
  ledger: [
    {
      person: "anshu",
      score: 3.5,
      breakdown: { worked_on: 2, authored: 2, resolved: 1 },
      latest: "2026-10-01",
    },
    {
      person: "priya",
      score: 1.5,
      breakdown: { worked_on: 1, authored: 0, resolved: 0 },
      latest: "2026-07-22",
    },
  ],
};

export const GENERIC_EXPERTS: Expert[] = [
  {
    person: "priya",
    score: 2.0,
    breakdown: { worked_on: 1, authored: 1, resolved: 1 },
    latest: "2026-08-30",
  },
  {
    person: "anshu",
    score: 1.5,
    breakdown: { worked_on: 1, authored: 0, resolved: 0 },
    latest: "2026-08-12",
  },
];

export const INITIAL_AUDIT: AuditEntry[] = [
  {
    id: "act_1042",
    goal: "Migrate Retry to the new queue",
    plan: [
      "Snapshot current retry table",
      "Dual-write to new queue for 24h",
      "Cut over consumer and verify drain",
      "Decommission old queue",
    ],
    status: "proposed",
    at: "2026-10-12",
    by: null,
  },
  {
    id: "act_1041",
    goal: "Backfill Settlement for Sept payouts",
    plan: ["Export ledger window", "Reconcile against payments", "Publish correction"],
    status: "approved",
    at: "2026-10-09",
    by: "priya",
    decided_at: "2026-10-10",
  },
  {
    id: "act_1040",
    goal: "Mute Notifications for sandbox",
    plan: ["Flip sandbox flag", "Verify no prod overlap"],
    status: "rejected",
    at: "2026-10-04",
    by: "anshu",
    reason: "too broad, scope to sandbox only",
    decided_at: "2026-10-05",
  },
];

export const INITIAL_MEMORY: Record<string, MemoryFact[]> = {
  anshu: [
    {
      id: "mem_a101",
      text: "Anshu prefers capped exponential backoff for retry paths.",
      salience: 0.9,
      at: "2026-09-20",
      source_ref: "src:note/anshu-retry",
    },
    {
      id: "mem_a102",
      text: "Anshu owns the Ledger schema migration (v9).",
      salience: 0.8,
      at: "2026-09-28",
      source_ref: "src:doc/ledger-v9",
    },
    {
      id: "mem_a099",
      text: "Anshu asked to pause sandbox notifications.",
      salience: 0.4,
      at: "2026-08-14",
      valid_until: "2026-09-01",
      superseded_by: "mem_a101",
      source_ref: "src:note/sandbox",
    },
  ],
  priya: [
    {
      id: "mem_p201",
      text: "Priya authored the payout-retry backoff policy.",
      salience: 0.95,
      at: "2026-09-18",
      source_ref: "src:doc/retry-backoff",
    },
    {
      id: "mem_p202",
      text: "Priya is on-call for Payments this month.",
      salience: 0.7,
      at: "2026-10-01",
      source_ref: "src:roster/oct",
    },
  ],
};
