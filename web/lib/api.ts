// Live API client for the Meridian Pay backend (http://localhost:8000).
// Same call signature the screens were built against. Every response is
// adapted from live backend shapes to screen shapes. No mock data.

const BASE = "http://localhost:8000";

export type Trace = { from: string; to: string; edge: string };
export type Evidence = {
  label: string;
  source_ref: string;
  author?: string;
  at?: string;
  channel?: string;
};

/** Short display id from a source ref, full ref stays in the tooltip. */
export function shortRef(ref: string): string {
  if (!ref) return "";
  const parts = ref.split("/");
  return parts[parts.length - 1] || ref;
}

/** Channel derived from a chat source ref (seed/chat/<channel>/...). */
export function channelOf(ref: string, id?: string): string {
  const m = (ref || "").match(/^seed\/chat\/([^/]+)\//);
  if (m) return m[1];
  const head = (id || "").toUpperCase();
  if (head.startsWith("MSG-INC")) return "incidents";
  if (head.startsWith("MSG-BE")) return "backend";
  return "";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-12" becomes "Oct 12"; anything else passes through. */
export function shortDate(at?: string): string {
  const m = (at || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return at || "";
  const month = MONTHS[parseInt(m[2], 10) - 1] || m[2];
  return `${month} ${parseInt(m[3], 10)}`;
}

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

function refsFromEvidence(evidence: unknown): Evidence[] {
  const out: Evidence[] = [];
  const push = (ref: unknown, label: string) => {
    if (typeof ref === "string" && ref) out.push({ label, source_ref: ref });
  };
  if (!Array.isArray(evidence)) return out;
  for (const e of evidence as Record<string, unknown>[]) {
    if (typeof e !== "object" || e === null) continue;
    if (Array.isArray(e.evidence))
      for (const r of e.evidence as unknown[]) push(r, "trace");
    if (Array.isArray(e.affected))
      for (const r of e.affected as Record<string, unknown>[])
        push(r.source_ref, "blast-radius");
    if (Array.isArray(e.experts))
      for (const x of e.experts as Record<string, unknown>[])
        push(x.source_ref, "who-knows");
    if (Array.isArray(e.facts))
      for (const f of e.facts as Record<string, unknown>[])
        push(f.source_ref, "memory");
    if (Array.isArray(e.messages))
      for (const m of e.messages as Record<string, unknown>[]) {
        const ref = m.source_ref;
        if (typeof ref === "string" && ref) {
          const mid = typeof m.message_id === "string" ? m.message_id : "";
          out.push({
            label: "message",
            source_ref: ref,
            author: typeof m.author === "string" ? m.author : "",
            at: typeof m.at === "string" ? m.at : "",
            channel: channelOf(ref, mid),
          });
        }
      }
  }
  return out;
}

function parsePlan(plan: unknown): string[] {
  if (Array.isArray(plan)) return plan.map(String);
  if (typeof plan === "string") {
    try {
      const v = JSON.parse(plan);
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const body = init?.body ? JSON.parse(init.body as string) : {};

  const call = async (p: string, m = "GET", b?: object) => {
    const res = await fetch(BASE + p, {
      method: m,
      headers: { "Content-Type": "application/json" },
      body: b === undefined ? undefined : JSON.stringify(b),
    });
    return res.json();
  };

  // Ask: trace pairs from node/edge arrays, flattened evidence refs.
  if (path === "/ask" && method === "POST") {
    const r = await call(path, method, body);
    if (r.error && !r.answer)
      return { answer: String(r.error), trace: [], evidence: [] } as T;
    if (r.pending_action) {
      return {
        answer: String(r.answer || ""),
        trace: [],
        evidence: [],
        action_id: r.pending_action.action_id,
        plan: r.pending_action.plan || [],
      } as T;
    }
    const firstWhy = (r.evidence || []).find(
      (e: Record<string, unknown>) => e.kind === "why-path"
    ) as { trace?: string[]; edges?: string[] } | undefined;
    const trace: Trace[] = [];
    const nodes = firstWhy?.trace || [];
    const edges = firstWhy?.edges || [];
    for (let i = 0; i + 1 < nodes.length; i++)
      trace.push({ from: nodes[i], to: nodes[i + 1], edge: edges[i] || "" });
    return {
      answer: String(r.answer || ""),
      trace,
      evidence: refsFromEvidence(r.evidence),
    } as T;
  }

  // Blast radius: rename affected rows to screen rows.
  if (path.startsWith("/blast-radius")) {
    const r = await call(path, "GET");
    const rows = Array.isArray(r.affected) ? r.affected : [];
    return {
      affected: rows.map((x: Record<string, unknown>) => ({
        service: String(x.affected || ""),
        owner_team: String(x.owner_team || ""),
        hops: Number(x.hops || 0),
        status: "affected",
      })),
    } as T;
  }

  // Approvals + audit: backend field names to screen field names.
  if (path === "/audit" && method === "GET") {
    const r = await call(path, "GET");
    const entries = Array.isArray(r.entries) ? r.entries : [];
    return {
      entries: entries.map((e: Record<string, unknown>) => ({
        id: String(e.action_id || ""),
        goal: String(e.goal || ""),
        plan: parsePlan(e.plan),
        status: String(e.status || ""),
        at: String(e.at || ""),
        by: typeof e.decided_by === "string" ? e.decided_by : null,
        reason: typeof e.reason === "string" ? e.reason : null,
        decided_at: String(e.at || ""),
        executed_at:
          typeof e.executed_at === "string" ? e.executed_at : null,
      })),
    } as T;
  }
  if (path === "/actions/propose" && method === "POST") {
    const r = await call(path, method, { goal: body.goal });
    return { id: String(r.action_id || "") } as T;
  }
  if (path === "/actions/approve" && method === "POST") {
    await call(path, method, { action_id: body.action_id, by: body.user_id });
    return { ok: true } as T;
  }
  if (path === "/actions/reject" && method === "POST") {
    await call(path, method, {
      action_id: body.action_id,
      by: body.user_id,
      reason: body.reason || "",
    });
    return { ok: true } as T;
  }

  // Memory: current facts plus history merged on request.
  if (path.startsWith("/memory?")) {
    const params = new URLSearchParams(path.split("?")[1]);
    const user = params.get("user_id") || "anshu";
    const wantHistory = params.get("history") === "true";
    const cur = await call(`/memory?user_id=${user}`, "GET");
    const current = Array.isArray(cur.facts) ? cur.facts : [];
    if (!wantHistory) return { facts: current } as T;
    const hist = await call(`/memory/history?user_id=${user}`, "GET");
    const past = Array.isArray(hist.history) ? hist.history : [];
    const mapFact = (f: Record<string, unknown>) => ({
      id: String(f.fact_id || ""),
      text: String(f.text || ""),
      salience: Number(f.salience ?? 0.8),
      at: String(f.at || ""),
      valid_until: typeof f.valid_until === "string" ? f.valid_until : null,
      superseded_by:
        typeof f.superseded_by === "string" ? f.superseded_by : null,
      source_ref: typeof f.source_ref === "string" ? f.source_ref : "",
    });
    return { facts: [...current.map(mapFact), ...past.map(mapFact)] } as T;
  }
  if (path === "/memory/remember" && method === "POST") {
    const r = await call(path, method, {
      user_id: body.user_id,
      text: body.text,
      salience: 0.8,
    });
    return { id: String(r.fact_id || "") } as T;
  }
  if (path === "/memory/supersede" && method === "POST") {
    const r = await call(path, method, body);
    return { id: String(r.new_id || "") } as T;
  }
  if (path === "/memory/forget" && method === "POST") {
    const r = await call(path, method, body);
    return { receipt_id: String(r.receipt_id || "") } as T;
  }

  // Who-knows and health pass through (screens tolerate missing rows).
  const r = await call(path, method, method === "GET" ? undefined : body);
  return r as T;
}
