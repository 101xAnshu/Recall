"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Card, CardBody } from "../components/card";
import { RowsSkeleton } from "../components/skeleton";
import Button from "../components/_ui/button";
import { Input } from "../components/_ui/form/input";
import { cn } from "../lib/utils";
import { ApprovalHIcon, PlusHIcon } from "@/components/icons";

type Entry = {
  id: string;
  goal: string;
  plan: string[];
  status: string;
  at: string;
  by: string | null;
  reason?: string | null;
  decided_at?: string | null;
};

export default function ApprovalsScreen({ user }: { user: string }) {
  const [goal, setGoal] = useState("Migrate Retry to the new queue");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reason, setReason] = useState("");
  const [booted, setBooted] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const reqId = useRef(0);

  const refresh = async () => {
    const id = ++reqId.current;
    try {
      const r = await api<{ entries: Entry[] }>("/audit");
      if (reqId.current !== id) return;
      setEntries(r.entries || []);
    } catch {
      if (reqId.current !== id) return;
      setEntries([]);
    }
    if (reqId.current !== id) return;
    setBooted(true);
  };
  useEffect(() => {
    refresh();
  }, []);

  const propose = async () => {
    if (!goal.trim()) return;
    await api("/actions/propose", { method: "POST", body: JSON.stringify({ goal }) });
    refresh();
  };
  const act = async (actionId: string, path: string, body: object) => {
    setActing(actionId);
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
    } finally {
      setActing(null);
    }
    refresh();
  };

  const pending = entries.filter((e) => e.status === "proposed");

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex flex-row items-center gap-2">
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Goal" className="flex-1" />
            <Button
              variant="primary"
              size="lg"
              onClick={propose}
              onMouseDown={(e) => e.preventDefault()}
              className="shrink-0"
            >
              <PlusHIcon aria-hidden className="size-3.5" />
              Propose
            </Button>
          </div>
        </CardBody>
      </Card>

      <div aria-live="polite" className="flex min-h-[200px] flex-col gap-3.5">
        {!booted ? (
          <RowsSkeleton rows={2} />
        ) : (
          <>
            {pending.length === 0 && (
              <Card>
                <div className="border-border bg-secondary flex h-[130px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed">
                  <span className="text-subtle">No pending approvals</span>
                  <p className="text-subtle">Propose a migration above. It pauses here for approval.</p>
                </div>
              </Card>
            )}

            {pending.map((a) => (
              <div key={a.id}>
                <Card>
                  <CardBody className="gap-2">
                    <div className="flex items-start gap-1.5">
                      <ApprovalHIcon aria-hidden className="text-warning mt-[2px] size-3.5 shrink-0" />
                      <h3 className="line-clamp-2 min-w-0 flex-1">{a.goal}</h3>
                    </div>
                    <div className="text-subtle flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="whitespace-nowrap font-mono text-[12px]">{a.id}</span>
                      <span aria-hidden className="size-[3px] rounded-full bg-[#d9d9d9]" />
                      <span className="whitespace-nowrap text-warning">paused for approval</span>
                    </div>
                  </CardBody>
                  <div className="border-card-border border-t px-4 py-2">
                    <div className="divide-border flex flex-col divide-y">
                      {a.plan.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5">
                          <span className="text-subtle w-6 shrink-0 font-mono text-[12px] tabular-nums">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-card-border flex flex-wrap items-center gap-2 border-t p-4">
                    <Button
                      variant="primary"
                      size="md"
                      aria-busy={acting === a.id}
                      onClick={() => act(a.id, "/actions/approve", { action_id: a.id, user_id: user })}
                    >
                      Approve
                    </Button>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reject reason"
                      aria-label="Reject reason"
                      className="h-[30px] min-w-[140px] flex-1"
                    />
                    <Button
                      variant="secondary"
                      size="md"
                      aria-busy={acting === a.id}
                      onClick={() =>
                        act(a.id, "/actions/reject", { action_id: a.id, reason, user_id: user })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </>
        )}
      </div>

      <Card>
        <CardBody className="gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2>Audit trail</h2>
            <span className="text-subtle font-mono text-[12px] tabular-nums">
              {entries.length} action{entries.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex min-h-[80px] flex-col">
            {!booted ? (
              <div className="flex flex-col gap-2.5 py-1">
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div aria-hidden className="bg-muted size-1.5 animate-pulse rounded-full" />
                    <div aria-hidden className="bg-muted h-3 flex-1 animate-pulse rounded-[6px]" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {entries.map((e, i) => (
                  <div key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 rounded-full transition-colors duration-150",
                          e.status === "approved"
                            ? "bg-success"
                            : e.status === "rejected"
                              ? "bg-danger"
                              : "bg-warning"
                        )}
                      />
                      {i < entries.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">{e.goal}</div>
                        <span
                          className={cn(
                            "shrink-0 rounded-[10px] px-2 py-0.5 font-mono text-[12px] transition-colors duration-150",
                            e.status === "approved"
                              ? "bg-success/[0.1] text-success"
                              : e.status === "rejected"
                                ? "bg-danger/[0.08] text-danger"
                                : "bg-warning/[0.1] text-warning"
                          )}
                        >
                          {e.status}
                        </span>
                      </div>
                      <div className="font-mono text-[12px] text-muted-foreground">
                        {e.id}
                        {e.by ? ` · by ${e.by}` : ""}
                        {e.decided_at ? ` · ${e.decided_at}` : ""}
                      </div>
                      {e.status === "rejected" && e.reason && (
                        <div className="text-muted-foreground">Reason: “{e.reason}”</div>
                      )}
                    </div>
                  </div>
                ))}
                {entries.length === 0 && <p className="text-subtle">No actions yet. Propose one above.</p>}
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
