"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Card, CardBody, CardFooter } from "../components/card";
import { RowsSkeleton } from "../components/skeleton";
import Button from "../components/_ui/button";
import { Input } from "../components/_ui/form/input";
import { cn } from "../lib/utils";
import { UserHIcon, ArrowRightHIcon } from "@/components/icons";
import SupersedeDialog from "@/components/supersede-dialog";

type Fact = {
  id: string;
  text: string;
  salience: number;
  at: string;
  valid_until?: string | null;
  superseded_by?: string | null;
  source_ref?: string;
};

export default function MemoryScreen({ user }: { user: string }) {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [history, setHistory] = useState(false);
  const [text, setText] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supersedeTarget, setSupersedeTarget] = useState<Fact | null>(null);
  const reqId = useRef(0);

  const refresh = async (h: boolean) => {
    const id = ++reqId.current;
    try {
      const r = await api<{ facts: Fact[] }>(`/memory?user_id=${user}&history=${h}`);
      if (reqId.current !== id) return;
      setFacts(r.facts || []);
    } catch {
      if (reqId.current !== id) return;
      setFacts([]);
    }
    if (reqId.current !== id) return;
    setBooted(true);
  };
  useEffect(() => {
    setBooted(false);
    setReceipt(null);
    refresh(history);
  }, [user, history]);

  const remember = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await api("/memory/remember", { method: "POST", body: JSON.stringify({ user_id: user, text }) });
      setText("");
      await refresh(history);
    } finally {
      setBusy(false);
    }
  };
  const supersede = (f: Fact) => {
    if (busy) return;
    setSupersedeTarget(f);
  };
  const confirmSupersede = async (newText: string) => {
    const f = supersedeTarget;
    if (!f || !newText.trim() || busy) return;
    setBusy(true);
    try {
      await api("/memory/supersede", {
        method: "POST",
        body: JSON.stringify({ fact_id: f.id, new_text: newText, user_id: user }),
      });
      setSupersedeTarget(null);
      await refresh(history);
    } finally {
      setBusy(false);
    }
  };
  const forget = async (f: Fact) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ receipt_id: string }>("/memory/forget", {
        method: "POST",
        body: JSON.stringify({ fact_id: f.id, user_id: user }),
      });
      setReceipt(r.receipt_id);
      await refresh(history);
    } finally {
      setBusy(false);
    }
  };

  const visible = facts.filter((f) => history || !f.valid_until);

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex flex-row items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <UserHIcon
                aria-hidden
                className="text-icon pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && remember()}
                placeholder={`Remember something for ${user}…`}
                aria-label="New memory"
                className="pr-3 pl-9"
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={remember}
              aria-busy={busy}
              onMouseDown={(e) => e.preventDefault()}
              className="shrink-0"
            >
              Remember
            </Button>
          </div>
        </CardBody>
        <CardFooter>
          <Button
            variant="chip"
            size="sm"
            data-active={history}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHistory(!history)}
            aria-pressed={history}
          >
            Show history
          </Button>
          <span className="text-subtle font-mono text-[12px]">
            user_{user} · {visible.length} fact{visible.length === 1 ? "" : "s"}
          </span>
        </CardFooter>
      </Card>

      <Card>
        <CardBody className="gap-2">
          <div className="flex items-start gap-1.5">
            <UserHIcon aria-hidden className="text-info mt-[2px] size-3.5 shrink-0" />
            <h3 className="min-w-0 flex-1 capitalize">{user}’s memory</h3>
          </div>
          <div className="text-subtle flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="whitespace-nowrap font-mono text-[12px]">user_{user}</span>
            <span aria-hidden className="size-[3px] rounded-full bg-[#d9d9d9]" />
            <span className="whitespace-nowrap">current facts only</span>
          </div>
        </CardBody>
        <div className="border-card-border flex min-h-[180px] flex-col gap-3.5 border-t p-4">
          {!booted ? (
            <RowsSkeleton rows={2} />
          ) : (
            <>
              {visible.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "shadow-card relative flex w-full flex-col overflow-clip rounded-2xl bg-white transition-opacity duration-150",
                    f.valid_until && "opacity-70"
                  )}
                >
                  <div className="flex flex-col gap-2 p-4">
                    <h3 className={cn("min-w-0 flex-1 break-words", f.valid_until && "line-through")}>
                      {f.text}
                    </h3>
                    <div className="text-subtle flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="whitespace-nowrap font-mono text-[12px]">{f.id}</span>
                      <span aria-hidden className="size-[3px] rounded-full bg-[#d9d9d9]" />
                      <span className="whitespace-nowrap">{f.at}</span>
                      {f.valid_until && (
                        <>
                          <span aria-hidden className="size-[3px] rounded-full bg-[#d9d9d9]" />
                          <span className="whitespace-nowrap text-warning">superseded</span>
                        </>
                      )}
                    </div>
                    {f.superseded_by && (
                      <div className="flex items-center gap-1 font-mono text-[12px] text-warning">
                        <ArrowRightHIcon aria-hidden className="size-3" />
                        <span>SUPERSEDES {f.superseded_by}</span>
                      </div>
                    )}
                  </div>
                  {!f.valid_until && (
                    <div className="border-card-border flex flex-wrap items-center gap-2 border-t p-4">
                      <Button variant="chip" size="md" onClick={() => supersede(f)}>
                        Supersede
                      </Button>
                      <Button variant="danger" size="md" onClick={() => forget(f)}>
                        Forget
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {visible.length === 0 && (
                <div className="border-border bg-secondary flex h-[130px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed">
                  <span className="text-subtle">No facts here yet</span>
                  <p className="text-subtle">Remember something for {user} above.</p>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {receipt && (
        <div>
          <Card>
            <CardBody className="gap-2">
              <h3>Erasure receipt</h3>
              <p className="text-muted-foreground">
                I no longer have that fact in active memory. I can show you the erasure receipt.
              </p>
              <span className="shadow-ring w-fit rounded-full bg-white px-2.5 py-1 font-mono text-[12px] text-muted-foreground">
                {receipt}
              </span>
            </CardBody>
          </Card>
        </div>
      )}

      <SupersedeDialog
        open={supersedeTarget !== null}
        fact={supersedeTarget}
        busy={busy}
        onClose={() => {
          if (!busy) setSupersedeTarget(null);
        }}
        onSubmit={confirmSupersede}
      />
    </>
  );
}
