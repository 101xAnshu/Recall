"use client";

import {
  ASK_RESPONSES,
  BLAST_MAP,
  EXPERTS_MAP,
  GENERIC_ASK,
  GENERIC_EXPERTS,
  INITIAL_AUDIT,
  INITIAL_MEMORY,
  type AskResp,
  type AuditEntry,
  type BlastRow,
  type Expert,
  type MemoryFact,
} from "./mock-data";

export type { AskResp };
export type Trace = { from: string; to: string; edge: string };
export type Evidence = { label: string; source_ref: string };

// In-memory mutable store so propose/approve/remember flows feel live.
let audit: AuditEntry[] = [...INITIAL_AUDIT];
let memory: Record<string, MemoryFact[]> = {
  anshu: [...INITIAL_MEMORY.anshu],
  priya: [...INITIAL_MEMORY.priya],
};
let actionCounter = 1043;
let memoryCounter = 300;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latency() {
  return 320 + Math.floor(Math.random() * 320);
}

function planForGoal(goal: string): string[] {
  const g = goal.toLowerCase();
  if (g.includes("retry") || g.includes("queue")) {
    return [
      "Snapshot current retry table",
      "Dual-write to new queue for 24h",
      "Cut over consumer and verify drain",
      "Decommission old queue",
    ];
  }
  if (g.includes("ledger")) {
    return [
      "Freeze ledger schema at v9",
      "Backfill balances to shadow table",
      "Verify settlement parity",
      "Promote shadow to primary",
    ];
  }
  return [
    `Break down “${goal}” into steps`,
    "Review blast radius and owners",
    "Execute with approval gate",
  ];
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Pretend this is a network fetch against mock data.
  await wait(latency());

  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body ? JSON.parse(init.body as string) : {};

  if (path === "/health") {
    return { falkordb: "ok" } as T;
  }

  if (path === "/ask" && method === "POST") {
    const q = String(body.question || "").toLowerCase().trim();
    const hit = ASK_RESPONSES[q];
    if (hit) return structuredClone(hit) as T;
    // loose match on keywords
    if (q.includes("inc-231")) return structuredClone(ASK_RESPONSES["why did inc-231 happen?"]) as T;
    if (q.includes("ledger") && (q.includes("break") || q.includes("change")))
      return structuredClone(ASK_RESPONSES["what breaks if we change ledger?"]) as T;
    if (q.includes("payout-retry") || q.includes("who knows"))
      return structuredClone(ASK_RESPONSES["who knows payout-retry?"]) as T;
    return structuredClone(GENERIC_ASK) as T;
  }

  if (path.startsWith("/blast-radius")) {
    const svc = decodeURIComponent(path.split("service=")[1] || "Ledger");
    const rows: BlastRow[] = BLAST_MAP[svc] ?? [];
    return { affected: structuredClone(rows) } as T;
  }

  if (path.startsWith("/who-knows")) {
    const topic = decodeURIComponent(path.split("topic=")[1] || "").toLowerCase();
    const experts: Expert[] = EXPERTS_MAP[topic] ?? GENERIC_EXPERTS;
    return { experts: structuredClone(experts) } as T;
  }

  if (path === "/audit" && method === "GET") {
    return { entries: structuredClone(audit) } as T;
  }

  if (path === "/actions/propose" && method === "POST") {
    const goal = String(body.goal || "Untitled migration");
    const id = `act_${actionCounter++}`;
    audit = [
      { id, goal, plan: planForGoal(goal), status: "proposed", at: "2026-10-14", by: null },
      ...audit,
    ];
    return { id } as T;
  }

  if (path === "/actions/approve" && method === "POST") {
    const id = String(body.action_id || "");
    audit = audit.map((e) =>
      e.id === id
        ? { ...e, status: "approved", by: String(body.user_id || "anshu"), decided_at: "2026-10-14" }
        : e
    );
    return { ok: true } as T;
  }

  if (path === "/actions/reject" && method === "POST") {
    const id = String(body.action_id || "");
    audit = audit.map((e) =>
      e.id === id
        ? {
            ...e,
            status: "rejected",
            by: String(body.user_id || "anshu"),
            reason: String(body.reason || "no reason given"),
            decided_at: "2026-10-14",
          }
        : e
    );
    return { ok: true } as T;
  }

  if (path.startsWith("/memory?")) {
    const params = new URLSearchParams(path.split("?")[1]);
    const user = params.get("user_id") || "anshu";
    const rows = memory[user] ?? [];
    return { facts: structuredClone(rows) } as T;
  }

  if (path === "/memory/remember" && method === "POST") {
    const user = String(body.user_id || "anshu");
    const text = String(body.text || "");
    const id = `mem_${memoryCounter++}`;
    const fact: MemoryFact = {
      id,
      text,
      salience: 0.8,
      at: "2026-10-14",
      source_ref: `src:note/${user}-${memoryCounter}`,
    };
    memory = { ...memory, [user]: [fact, ...(memory[user] ?? [])] };
    return { id } as T;
  }

  if (path === "/memory/supersede" && method === "POST") {
    const user = String(body.user_id || "anshu");
    const factId = String(body.fact_id || "");
    const newText = String(body.new_text || "");
    const id = `mem_${memoryCounter++}`;
    const next: MemoryFact = {
      id,
      text: newText,
      salience: 0.85,
      at: "2026-10-14",
      source_ref: `src:note/${user}-${memoryCounter}`,
    };
    const rows = (memory[user] ?? []).map((f) =>
      f.id === factId ? { ...f, valid_until: "2026-10-14", superseded_by: id } : f
    );
    memory = { ...memory, [user]: [next, ...rows] };
    return { id } as T;
  }

  if (path === "/memory/forget" && method === "POST") {
    const user = String(body.user_id || "anshu");
    const factId = String(body.fact_id || "");
    memory = {
      ...memory,
      [user]: (memory[user] ?? []).filter((f) => f.id !== factId),
    };
    return { receipt_id: `rcpt_${factId}_${Date.now().toString(36)}` } as T;
  }

  throw new Error(`mock-api: unknown route ${method} ${path}`);
}
