"use client";

import { useEffect, useState } from "react";
import { api, type WhoResponse } from "../../lib/api";

export default function WhoPage() {
  const [topic, setTopic] = useState("payout-retry");
  const [data, setData] = useState<WhoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(t: string) {
    const text = t.trim();
    if (!text || loading) return;
    setLoading(true);
    try {
      setData(await api.whoKnows(text));
    } catch {
      setData({ topic: text, experts: [], error: "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    lookup("payout-retry");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const experts = data?.experts ?? [];
  const top = experts.reduce((m, e) => Math.max(m, e.score), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-hairline bg-white p-5">
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup(topic)}
            placeholder="Topic, for example payout-retry"
            className="flex-1 rounded-card border border-hairline px-4 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            onClick={() => lookup(topic)}
            disabled={loading}
            className="rounded-card bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Looking..." : "Look up"}
          </button>
        </div>
      </div>

      {data?.error ? (
        <div className="rounded-card border border-hairline bg-white p-8 text-center text-sm text-muted">
          No experts found for &ldquo;{data.topic}&rdquo;.
        </div>
      ) : (
        experts.map((e) => (
          <div
            key={e.person}
            className="rounded-card border border-hairline bg-white p-5"
          >
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium">{e.person}</div>
              <div className="text-2xl font-semibold">{e.score.toFixed(1)}</div>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full bg-accent"
                style={{ width: `${top ? (e.score / top) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted">
              <div>
                worked_on x1.0 <span className="text-ink">{e.breakdown.worked_on}</span>
              </div>
              <div>
                authored x1.5 <span className="text-ink">{e.breakdown.authored}</span>
              </div>
              <div>
                resolved x2.0 <span className="text-ink">{e.breakdown.resolved}</span>
              </div>
              {e.latest && <div>latest activity {e.latest}</div>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
