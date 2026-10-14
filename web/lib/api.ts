// Typed client for the Meridian Pay backend (http://localhost:8000).
// Every screen uses this; no mock data anywhere in the UI.

export const API = "http://localhost:8000";

async function req<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export interface WhyEvidence {
  source: string;
  kind: string;
  trace?: string[];
  edges?: string[];
  hops?: number;
  evidence?: string[];
  affected?: { affected: string; owner_team: string; hops?: number }[];
  experts?: {
    person: string;
    score: number;
    breakdown: { worked_on: number; authored: number; resolved: number };
    latest: string | null;
  }[];
  facts?: {
    fact_id: string;
    text: string;
    salience: number;
    at: string;
    source_ref: string;
  }[];
}

export interface AskResponse {
  answer?: string;
  trace?: string[];
  evidence?: WhyEvidence[];
  error?: string;
  pending_action?: { action_id: string; goal: string; plan: string[] };
  thread_id?: string;
}

export interface BlastResponse {
  service: string;
  affected: { affected: string; owner_team: string; hops: number }[];
  error?: string;
}

export interface WhoResponse {
  topic: string;
  experts: {
    person: string;
    score: number;
    breakdown: { worked_on: number; authored: number; resolved: number };
    latest: string | null;
  }[];
  error?: string;
}

export interface MemoryFact {
  fact_id: string;
  text: string;
  salience?: number;
  at?: string;
  source_ref?: string;
  valid_until?: string | null;
  superseded_by?: string | null;
}

export interface ActionEntry {
  action_id: string;
  goal: string;
  status: string;
  at: string;
  decision: string | null;
  decided_by: string | null;
}

export const api = {
  health: () => req<{ falkordb: string }>("GET", "/health"),
  ask: (question: string, user_id: string) =>
    req<AskResponse>("POST", "/ask", { question, user_id }),
  blast: (service: string) =>
    req<BlastResponse>("GET", `/blast-radius?service=${service}`),
  whoKnows: (topic: string) =>
    req<WhoResponse>("GET", `/who-knows?topic=${topic}`),
  services: () =>
    req<{ services: { name: string; owner_team: string }[] }>(
      "GET",
      "/services"
    ),
  memory: (user_id: string) =>
    req<{ facts: MemoryFact[] }>("GET", `/memory?user_id=${user_id}`),
  memoryHistory: (user_id: string) =>
    req<{
      history: MemoryFact[];
      receipts: {
        receipt_id: string;
        fact_ref: string;
        text: string;
        at: string;
      }[];
    }>("GET", `/memory/history?user_id=${user_id}`),
  remember: (user_id: string, text: string, salience: number) =>
    req<{ fact_id: string }>("POST", "/memory/remember", {
      user_id,
      text,
      salience,
    }),
  supersede: (user_id: string, fact_id: string, new_text: string) =>
    req<{ old_id: string; new_id: string }>("POST", "/memory/supersede", {
      user_id,
      fact_id,
      new_text,
    }),
  forget: (user_id: string, fact_id: string) =>
    req<{ receipt_id: string }>("POST", "/memory/forget", {
      user_id,
      fact_id,
    }),
  approve: (action_id: string, by: string) =>
    req<{ action_id: string; status: string }>("POST", "/actions/approve", {
      action_id,
      by,
    }),
  reject: (action_id: string, by: string, reason: string) =>
    req<{ action_id: string; status: string }>("POST", "/actions/reject", {
      action_id,
      by,
      reason,
    }),
  audit: () => req<{ entries: ActionEntry[] }>("GET", "/audit"),
  disconnect: () => req<{ falkordb: string }>("POST", "/admin/disconnect"),
  reconnect: () => req<{ falkordb: string }>("POST", "/admin/reconnect"),
};

/** Flatten every source_ref in an ask response for evidence chips. */
export function evidenceRefs(evidence?: WhyEvidence[]): string[] {
  const refs: string[] = [];
  for (const e of evidence ?? []) {
    for (const r of e.evidence ?? []) refs.push(r);
    for (const r of e.affected ?? []) refs.push((r as { source_ref?: string }).source_ref ?? "");
    for (const x of e.experts ?? []) refs.push((x as { source_ref?: string }).source_ref ?? "");
    for (const f of e.facts ?? []) refs.push(f.source_ref ?? "");
  }
  return refs.filter(Boolean);
}
