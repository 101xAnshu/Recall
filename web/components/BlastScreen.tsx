"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/mock-api";
import { Card, CardBody } from "../components/card";
import { RowsSkeleton, TilesSkeleton } from "../components/skeleton";
import Button, { buttonVariants } from "../components/_ui/button";
import StatusBadge from "../components/_common/status-badge";
import { cn } from "../lib/utils";
import type { IconComponent } from "@/components/_common/huge-icon";
import {
  BarChartHIcon,
  CubeHIcon,
  GrowthHIcon,
  LedgerHIcon,
  NotificationsHIcon,
  PaymentsHIcon,
  ReliabilityHIcon,
  RetryHIcon,
  SettlementHIcon,
} from "@/components/icons";

type Row = { service: string; owner_team: string; hops: number; status: string };
const SVCS = ["Ledger", "Payments", "Retry", "Notifications", "Settlement"];

const SERVICE_ICONS: Record<string, IconComponent> = {
  Ledger: LedgerHIcon,
  Payments: PaymentsHIcon,
  Retry: RetryHIcon,
  Notifications: NotificationsHIcon,
  Settlement: SettlementHIcon,
};

const TEAM_ICONS: Record<string, IconComponent> = {
  payments: PaymentsHIcon,
  reliability: ReliabilityHIcon,
  growth: GrowthHIcon,
};

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="shadow-card flex flex-col gap-3 rounded-2xl bg-white p-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums", tone)}>
        {value}
      </span>
    </div>
  );
}

export default function BlastScreen() {
  const [svc, setSvc] = useState("Ledger");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);
  const reqId = useRef(0);

  const load = async (s: string) => {
    const id = ++reqId.current;
    if (booted) setLoading(true);
    try {
      const r = await api<{ affected: Row[] }>(`/blast-radius?service=${encodeURIComponent(s)}`);
      if (reqId.current !== id) return;
      setRows(r.affected || []);
    } catch {
      if (reqId.current !== id) return;
      setRows([]);
    }
    if (reqId.current !== id) return;
    setLoading(false);
    setBooted(true);
  };

  useEffect(() => {
    load(svc);
  }, []);

  const chip = buttonVariants({ variant: "chip", size: "md" });
  const teams = new Set(rows.map((r) => r.owner_team)).size;
  const depth = rows.reduce((m, r) => Math.max(m, r.hops), 0);

  return (
    <>
      <Card>
        <CardBody className="gap-3">
          <span className="label-style text-muted-foreground px-0.5 py-1">Changed service</span>
          <div className="flex flex-wrap gap-2">
            {SVCS.map((s) => {
              const ServiceIcon = SERVICE_ICONS[s] ?? CubeHIcon;
              return (
                <Button
                  key={s}
                  variant="chip"
                  size="md"
                  data-active={svc === s}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (s === svc && booted) return;
                    setSvc(s);
                    load(s);
                  }}
                >
                  <ServiceIcon aria-hidden className="size-3.5" />
                  {s}
                </Button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {!booted ? (
        <TilesSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Tile label="Services affected" value={rows.length} tone={rows.length ? "text-danger" : undefined} />
          <Tile label="Owner teams" value={teams} />
          <Tile label="Max depth" value={depth} />
          <Tile label="Changed" value={svc} tone="text-info" />
        </div>
      )}

      <Card>
        <CardBody className="gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2>By status</h2>
            <span className="text-subtle font-mono text-[12px] tabular-nums">
              {loading && !booted ? "…" : `${rows.length} downstream`}
            </span>
          </div>
          <div aria-live="polite" className="flex min-h-[180px] flex-col gap-3">
            {!booted ? (
              <RowsSkeleton rows={3} />
            ) : (
              <>
                {rows.map((r) => {
                  const RowServiceIcon = SERVICE_ICONS[r.service] ?? CubeHIcon;
                  const RowTeamIcon = TEAM_ICONS[r.owner_team] ?? BarChartHIcon;
                  return (
                    <div key={r.service} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <StatusBadge icon={RowServiceIcon} tone={r.hops === 1 ? "danger" : "info"} />
                      <span className="w-24 truncate sm:w-28">{r.service}</span>
                      <span className="bg-muted h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full">
                        <span
                          className="ease-power3-out block h-full rounded-full bg-danger transition-[width] duration-300"
                          style={{ width: `${Math.min(100, (r.hops / Math.max(depth, 1)) * 100)}%` }}
                        />
                      </span>
                      <span className={cn(chip, "pointer-events-none hidden md:inline-flex")}>
                        <RowTeamIcon aria-hidden className="text-subtle size-3.5" />
                        {r.owner_team}
                      </span>
                      <span className="text-muted-foreground w-14 text-right font-mono text-[12px] tabular-nums">
                        {r.hops} hop{r.hops > 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
                {rows.length === 0 && (
                  <p className="text-subtle">Nothing downstream. {svc} is isolated.</p>
                )}
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
