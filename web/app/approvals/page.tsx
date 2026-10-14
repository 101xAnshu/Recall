"use client";

import { useEffect, useState } from "react";
import { api, type ActionEntry } from "../../lib/api";
import { useEmployee } from "../../lib/employee";

type Entry = ActionEntry & { plan?: string | null };

function parsePlan(plan?: string | null): string[] {
  if (!plan) return [];
  try {
    const v = JSON.parse(plan);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default function ApprovalsPage() {
  const { user } = useEmployee();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  async function refresh() {
    try {
      const a = await api.audit();
      setEntries((a.entries ?? []) as Entry[]);
    } catch {
      setEntries([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(
    action_id: string,
    kind: "approve" | "reject",
    reason?: string
  ) {
    setBusy(action_id + kind);
    try {
      if (kind === "approve") await api.approve(action_id, user);
      else await api.reject(action_id, user, reason ?? "");
    } finally {
      setBusy("");
      await refresh();
    }
  }

  const pending = entries.filter((e) => e.status === "proposed");

  return (
    <div className="space-y-4">
      {pending.length === 0 && (
        <div className="rounded-card border border-hairline bg-white p-8 text-center text-sm text-muted">
          No pending actions. Ask for a migration or rollback to draft one.
        </div>
      )}
      {pending.map((a) => (
        <div
          key={a.action_id}
          className="rounded-card border border-hairline bg-white p-5"
        >
          <div className="text-sm font-medium">{a.goal}</div>
          <div className="font-mono text-[11px] text-muted">{a.action_id}</div>
          <ol className="mt-3">
            {parsePlan(a.plan).map((step, i) => (
              <li
                key={i}
                className="border-t border-hairline py-2 text-sm first:border-0"
              >
                <span className="mr-2 text-muted">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => decide(a.action_id, "approve")}
              disabled={!!busy}
              className="rounded-card bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <input
              value={reasons[a.action_id] ?? ""}
              onChange={(e) =>
                setReasons({ ...reasons, [a.action_id]: e.target.value })
              }
              placeholder="Reason for rejection"
              className="flex-1 rounded-card border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <button
              onClick={() =>
                decide(a.action_id, "reject", reasons[a.action_id] ?? "")
              }
              disabled={!!busy}
              className="rounded-card border border-hairline bg-white px-5 py-2 text-sm font-medium text-ink disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {entries.length > 0 && (
        <div className="rounded-card border border-hairline bg-white p-5">
          <div className="pb-2 text-xs uppercase tracking-wide text-muted">
            Audit trail
          </div>
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.action_id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
                <div className="text-sm">
                  <div>{e.goal}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {e.action_id} | {e.status}
                    {e.decision
                      ? ` | ${e.decision} by ${e.decided_by}`
                      : " | awaiting decision"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
