"use client";

import Link from "next/link";
import { useState } from "react";
import { api, evidenceRefs, type AskResponse } from "../../lib/api";
import { useEmployee } from "../../lib/employee";

const SAMPLES = [
  "Why did INC-231 happen?",
  "What breaks if we change Ledger?",
  "Who knows payout-retry?",
];

function Timeline({ trace, edges }: { trace: string[]; edges: string[] }) {
  const rows: React.ReactNode[] = [];
  trace.forEach((node, i) => {
    rows.push(
      <div key={`n${i}`} className="flex items-start gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
        <span className="text-sm">{node}</span>
      </div>
    );
    if (i < edges.length) {
      rows.push(
        <div key={`e${i}`} className="flex items-start gap-3 pl-0.5">
          <span className="w-2 shrink-0 text-center text-[10px] text-muted">
            |
          </span>
          <span className="font-mono text-[11px] text-accent">
            {edges[i]}
          </span>
        </div>
      );
    }
  });
  return <div className="space-y-1.5">{rows}</div>;
}

export default function AskPage() {
  const { user } = useEmployee();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function submit(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await api.ask(text, user));
    } catch {
      setResult({ error: "Request failed. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  }

  const refs = evidenceRefs(result?.evidence);
  const why = result?.evidence?.find((e) => e.kind === "why-path");

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-hairline bg-white p-5">
        <div className="flex gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(q)}
            placeholder="Ask about an incident, a service, or a person."
            className="flex-1 rounded-card border border-hairline px-4 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            onClick={() => submit(q)}
            disabled={loading}
            className="rounded-card bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Asking..." : "Ask"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQ(s);
                submit(s);
              }}
              className={`rounded-full border px-3 py-1 text-xs ${
                q === s
                  ? "border-ink text-ink"
                  : "border-hairline text-muted hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {!result && !loading && (
        <div className="rounded-card border border-hairline bg-white p-8 text-center text-sm text-muted">
          Ask about an incident, a service, or a person.
        </div>
      )}

      {result?.error && (
        <div className="rounded-card border border-hairline bg-white p-5 text-sm">
          {result.error}
        </div>
      )}

      {result?.pending_action && (
        <div className="rounded-card border border-hairline bg-white p-5">
          <div className="text-sm font-medium">Waiting for approval</div>
          <div className="mt-1 text-sm text-muted">
            {result.answer} See the{" "}
            <Link href="/approvals" className="text-accent underline">
              Approvals
            </Link>{" "}
            screen to decide.
          </div>
        </div>
      )}

      {result?.answer && !result.error && !result.pending_action && (
        <div className="rounded-card border border-hairline bg-white p-5">
          <div className="whitespace-pre-line text-sm">{result.answer}</div>
          {why?.trace && (
            <div className="mt-4 border-t border-hairline pt-4">
              <Timeline trace={why.trace} edges={why.edges ?? []} />
            </div>
          )}
          {refs.length > 0 && (
            <details className="mt-4 border-t border-hairline pt-3">
              <summary className="cursor-pointer text-xs text-muted">
                Evidence ({refs.length})
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {refs.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
