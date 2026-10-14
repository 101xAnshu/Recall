"use client";

import { useEffect, useState } from "react";
import { api, type MemoryFact } from "../../lib/api";
import { employeeName, useEmployee } from "../../lib/employee";

interface Receipt {
  receipt_id: string;
  fact_ref: string;
  text: string;
  at: string;
}

const ERASURE_QUOTE =
  "I no longer have that fact in active memory. I can show you the erasure receipt.";

export default function MemoryPage() {
  const { user } = useEmployee();
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [history, setHistory] = useState<MemoryFact[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [text, setText] = useState("");
  const [newText, setNewText] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const m = await api.memory(user);
      setFacts(m.facts ?? []);
      const h = await api.memoryHistory(user);
      setHistory(h.history ?? []);
      setReceipts(h.receipts ?? []);
      setTarget((t) =>
        (m.facts ?? []).some((f) => f.fact_id === t)
          ? t
          : (m.facts ?? [])[0]?.fact_id ?? ""
      );
    } catch {
      setFacts([]);
      setHistory([]);
      setReceipts([]);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function run(fn: Promise<unknown>) {
    setBusy(true);
    try {
      await fn;
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-hairline bg-white p-5">
        <div className="text-sm">
          {employeeName(user)}&rsquo;s memory graph
          <span className="font-mono text-[11px] text-muted"> user_{user}</span>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
          />
          Show history
        </label>
      </div>

      <div className="rounded-card border border-hairline bg-white p-5">
        <div className="pb-2 text-xs uppercase tracking-wide text-muted">
          Current facts
        </div>
        {facts.length === 0 && (
          <div className="py-4 text-center text-sm text-muted">
            No current facts. Remember something below.
          </div>
        )}
        <div className="space-y-2">
          {facts.map((f) => (
            <div
              key={f.fact_id}
              className="flex items-center justify-between gap-3 border-t border-hairline py-2 first:border-0"
            >
              <div className="text-sm">
                {f.text}
                <span className="ml-2 font-mono text-[11px] text-muted">
                  {f.fact_id}
                </span>
              </div>
              <button
                onClick={() => run(api.forget(user, f.fact_id))}
                disabled={busy}
                className="shrink-0 rounded-full border border-hairline px-3 py-1 text-xs text-muted hover:text-ink disabled:opacity-50"
              >
                Forget
              </button>
            </div>
          ))}
        </div>
      </div>

      {showHistory && (
        <div className="rounded-card border border-hairline bg-white p-5">
          <div className="pb-2 text-xs uppercase tracking-wide text-muted">
            History
          </div>
          {history.length === 0 && (
            <div className="py-2 text-sm text-muted">
              No superseded facts.
            </div>
          )}
          {history.map((h) => (
            <div key={h.fact_id}>
              <div className="border-t border-dashed border-hairline py-1 font-mono text-[11px] text-muted">
                SUPERSEDES
              </div>
              <div className="py-2 text-sm text-muted line-through">
                {h.text}
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amberbadge no-underline">
                  superseded
                </span>
              </div>
            </div>
          ))}
          {receipts.map((r) => (
            <div
              key={r.receipt_id}
              className="mt-3 rounded-card border border-dashed border-hairline p-4"
            >
              <div className="font-mono text-xs">{r.receipt_id}</div>
              <div className="mt-1 text-sm">
                {ERASURE_QUOTE} ({r.receipt_id})
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted">
                fact {r.fact_ref} | {r.at}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-card border border-hairline bg-white p-5">
        <div className="pb-2 text-xs uppercase tracking-wide text-muted">
          Demo controls
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Something to remember"
            className="flex-1 rounded-card border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            onClick={() => run(api.remember(user, text, 0.8).then(() => setText("")))}
            disabled={busy || !text.trim()}
            className="rounded-card bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Remember
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-card border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          >
            {facts.map((f) => (
              <option key={f.fact_id} value={f.fact_id}>
                {f.fact_id}
              </option>
            ))}
          </select>
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Replacement text"
            className="flex-1 rounded-card border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            onClick={() =>
              run(
                api
                  .supersede(user, target, newText)
                  .then(() => setNewText(""))
              )
            }
            disabled={busy || !target || !newText.trim()}
            className="rounded-card border border-hairline bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Supersede
          </button>
        </div>
      </div>
    </div>
  );
}
