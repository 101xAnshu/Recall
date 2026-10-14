"use client";

import { useEffect, useState } from "react";
import { api, type BlastResponse } from "../../lib/api";

export default function BlastPage() {
  const [services, setServices] = useState<{ name: string; owner_team: string }[]>([]);
  const [service, setService] = useState("Ledger");
  const [data, setData] = useState<BlastResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.services().then((s) => setServices(s.services ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .blast(service)
      .then(setData)
      .catch(() => setData({ service, affected: [], error: "Request failed." }))
      .finally(() => setLoading(false));
  }, [service]);

  const affected = data?.affected ?? [];
  const owners = new Set(affected.map((a) => a.owner_team));
  const maxDepth = affected.reduce((m, a) => Math.max(m, a.hops ?? 0), 0);
  const hit = new Set(affected.map((a) => a.affected));

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-hairline bg-white p-5">
        <label className="text-xs text-muted">Changed service</label>
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="mt-1 w-full rounded-card border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        >
          {services.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {data?.error ? (
        <div className="rounded-card border border-hairline bg-white p-5 text-sm">
          {data.error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Services affected", String(affected.length)],
              ["Owner teams", String(owners.size)],
              ["Max depth", String(maxDepth)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-card border border-hairline bg-white p-4"
              >
                <div className="text-2xl font-semibold">{value}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-card border border-hairline bg-white">
            <div className="border-b border-accent px-5 py-3 text-sm font-medium">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />
              {service} <span className="text-muted">(changed)</span>
            </div>
            {affected
              .slice()
              .sort((a, b) => (a.hops ?? 0) - (b.hops ?? 0))
              .map((a) => (
                <div
                  key={a.affected}
                  className="flex items-center justify-between border-b border-hairline px-5 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-2 w-2 rounded-full bg-ink" />
                    <span className="text-sm font-medium">{a.affected}</span>
                    <span className="text-xs text-muted">{a.owner_team}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-muted">
                      {a.hops} hop{(a.hops ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span className="text-[11px] text-muted">affected</span>
                  </div>
                </div>
              ))}
            {services
              .filter((s) => s.name !== service && !hit.has(s.name))
              .map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between border-b border-hairline px-5 py-3 text-muted last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-2 w-2 rounded-full bg-hairline" />
                    <span className="text-sm">{s.name}</span>
                    <span className="text-xs">{s.owner_team}</span>
                  </div>
                  <span className="text-[11px]">unaffected</span>
                </div>
              ))}
            {loading && (
              <div className="px-5 py-3 text-xs text-muted">Loading...</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
