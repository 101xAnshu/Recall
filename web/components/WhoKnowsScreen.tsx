"use client";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { Card, CardBody } from "../components/card";
import { RowsSkeleton } from "../components/skeleton";
import Button, { buttonVariants } from "../components/_ui/button";
import { Input } from "../components/_ui/form/input";
import { cn } from "../lib/utils";
import { CalendarHIcon, SearchHIcon, UserHIcon } from "@/components/icons";

type Expert = {
  person: string;
  score: number;
  breakdown: { worked_on: number; authored: number; resolved: number };
  latest: string | null;
};

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const width = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
      <span
        className={cn("ease-power3-out block h-full rounded-full transition-[width] duration-300", className)}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

export default function WhoKnowsScreen() {
  const [topic, setTopic] = useState("payout-retry");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [ran, setRan] = useState(false);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const run = async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const r = await api<{ experts: Expert[] }>(`/who-knows?topic=${encodeURIComponent(topic)}`);
      if (reqId.current !== id) return;
      setExperts(r.experts || []);
    } catch {
      if (reqId.current !== id) return;
      setExperts([]);
    }
    if (reqId.current !== id) return;
    setRan(true);
    setLoading(false);
  };

  const chip = buttonVariants({ variant: "chip", size: "md" });
  const max = experts.reduce((m, e) => Math.max(m, e.score), 0.1);
  const top = experts[0];

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex flex-row items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <SearchHIcon
                aria-hidden
                className="text-icon pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              />
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="Topic, e.g. payout-retry"
                aria-label="Topic"
                className="pr-3 pl-9"
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={run}
              aria-busy={loading}
              className="w-[76px] shrink-0"
            >
              Find
            </Button>
          </div>
        </CardBody>
      </Card>

      <div aria-live="polite" className="flex min-h-[280px] flex-col">
        {loading ? (
          <RowsSkeleton rows={4} />
        ) : top ? (
          <Card>
            <CardBody className="gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2>By expertise</h2>
                <span className={cn(chip, "pointer-events-none")}>
                  <UserHIcon aria-hidden className="text-icon size-3.5" />
                  {experts.length} expert{experts.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {experts.map((e) => (
                  <div key={e.person} className="flex items-center gap-3">
                    <UserHIcon aria-hidden className="text-info size-3.5 shrink-0" />
                    <span className="w-24 truncate capitalize">{e.person}</span>
                    <Bar value={e.score} max={max} className="bg-info" />
                    <span className="text-muted-foreground w-8 text-right font-mono text-[12px] tabular-nums">
                      {e.score}
                    </span>
                  </div>
                ))}
              </div>

              <h2 className="mt-2">Evidence breakdown · {top.person}</h2>
              <div className="flex flex-col gap-3">
                {(
                  [
                    ["worked_on", "Worked on", 1.0, "text-subtle"],
                    ["authored", "Authored", 1.5, "text-info"],
                    ["resolved", "Resolved", 2.0, "text-success"],
                  ] as const
                ).map(([k, label, w, tone]) => (
                  <div key={k} className="flex items-center gap-3">
                    <UserHIcon aria-hidden className={cn("size-3.5 shrink-0", tone)} />
                    <span className="w-24">
                      {label} ×{w}
                    </span>
                    <Bar
                      value={top.breakdown[k]}
                      max={Math.max(1, ...experts.map((x) => x.breakdown[k]))}
                      className="bg-foreground"
                    />
                    <span className="text-muted-foreground w-6 text-right font-mono text-[12px] tabular-nums">
                      {top.breakdown[k]}
                    </span>
                  </div>
                ))}
              </div>
              {top.latest && (
                <div className="text-subtle flex items-center gap-2 font-mono text-[12px]">
                  <CalendarHIcon aria-hidden className="size-3.5" />
                  latest: {top.latest}
                </div>
              )}
            </CardBody>
          </Card>
        ) : ran ? (
          <Card>
            <CardBody className="items-center gap-2 py-10 text-center">
              <span className="text-subtle">No experts here yet</span>
              <p className="text-subtle">Nobody in the graph knows {topic} yet.</p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="items-center gap-2 py-10 text-center">
              <span className="text-subtle">No topic searched yet</span>
              <p className="text-subtle">Enter a topic to find who knows it.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
