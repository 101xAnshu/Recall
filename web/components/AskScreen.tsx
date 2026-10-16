"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, channelOf, shortDate, shortRef, type AskResp } from "../lib/api";
import { Card, CardBody, CardFooter } from "../components/card";
import { AnswerSkeleton } from "../components/skeleton";
import Button from "../components/_ui/button";
import { Input } from "../components/_ui/form/input";
import { FileHIcon, SearchHIcon, ArrowRightHIcon } from "@/components/icons";

const SAMPLES = [
  "Why did INC-231 happen?",
  "What breaks if we change Ledger?",
  "Who knows payout-retry?",
  "What did the team say about payout-retry?",
];

export default function AskScreen({
  user,
  graphDown = false,
}: {
  user: string;
  graphDown?: boolean;
}) {
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<AskResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showEv, setShowEv] = useState(false);
  const [runId, setRunId] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    setResp(null);
    setShowEv(false);
  }, [user]);

  const run = async (question: string) => {
    if (loading || !question.trim()) return;
    setQ(question);
    setLoading(true);
    setShowSkeleton(false);
    if (!graphDown) {
      timer.current = window.setTimeout(() => setShowSkeleton(true), 250);
    }
    try {
      const r = await api<AskResp>("/ask", {
        method: "POST",
        body: JSON.stringify({ question, user_id: user }),
      });
      setResp(r);
    } catch {
      setResp({ answer: "Request failed.", trace: [], evidence: [] });
    }
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setShowSkeleton(false);
    setShowEv(false);
    setRunId((id) => id + 1);
    setLoading(false);
  };

  return (
    <>
      <Card>
        <CardBody className="gap-3">
          <div className="flex flex-row items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <SearchHIcon
                aria-hidden
                className="text-icon pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run(q)}
                placeholder="Ask about an incident, a service, or a person."
                aria-label="Ask a question"
                className="pr-3 pl-9"
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => run(q)}
              aria-busy={loading}
              className="w-[76px] shrink-0"
            >
              Ask
            </Button>
          </div>
        </CardBody>
        <CardFooter className="gap-2">
          {SAMPLES.map((s) => (
            <Button
              key={s}
              variant="chip"
              size="sm"
              data-active={q === s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(s)}
            >
              {s}
            </Button>
          ))}
        </CardFooter>
      </Card>

      <div aria-live="polite" className="flex min-h-[280px] flex-col">
        {loading ? (
          showSkeleton ? (
            <AnswerSkeleton />
          ) : (
            <div aria-hidden className="min-h-[280px]" />
          )
        ) : resp ? (
          <div key={runId}>
            <Card>
              <CardBody className="gap-3">
                {resp.trace.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <FileHIcon aria-hidden className="text-info mt-[2px] size-3.5 shrink-0" />
                  <h3 className="min-w-0 flex-1">Traced answer</h3>
                </div>
                )}
                {resp.scopeLabel && (
                  <div className="font-mono text-[11px] text-faint">
                    {resp.scopeLabel}
                  </div>
                )}
                {resp.isOutage && (
                  <div className="rounded-[10px] border border-hairline bg-wash p-3 text-sm">
                    FalkorDB is disconnected, so graph answers are unavailable.
                  </div>
                )}
                {(resp.expertsBlock || []).length === 0 &&
                  (resp.messagesBlock || []).length === 0 &&
                  (resp.blastBlock || []).length === 0 &&
                  (resp.proceduresBlock || []).length === 0 && (
                    <p className="text-[15px] leading-[150%]">{resp.answer}</p>
                  )}
                {(resp.proceduresBlock || []).length > 0 && (
                  <div className="flex flex-col gap-4 border-t border-hairline pt-4">
                    {(resp.proceduresBlock || []).map((p) => (
                      <div key={p.source_ref || p.title}>
                        <div className="text-sm font-medium">{p.title}</div>
                        <ol className="mt-1.5 flex flex-col">
                          {p.steps.map((step, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 border-t border-hairline py-2 text-sm first:border-0"
                            >
                              <span className="w-6 shrink-0 font-mono text-[11px] text-faint">
                                {i + 1}
                              </span>
                              <span className="min-w-0 flex-1">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
                {resp.action_id && (resp.plan || []).length > 0 && (
                  <div className="flex flex-col gap-2.5 border-t border-hairline pt-4">
                    <div className="text-sm font-medium">
                      Waiting for approval
                    </div>
                    <ol>
                      {(resp.plan || []).map((step, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 border-t border-hairline py-2 text-sm first:border-0"
                        >
                          <span className="w-6 shrink-0 font-mono text-[11px] text-faint">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <Link
                      href="/approvals"
                      className="w-fit rounded-[10px] bg-ink px-4 py-2 text-sm font-medium text-white"
                    >
                      Review in Approvals
                    </Link>
                  </div>
                )}
                {(resp.expertsBlock || []).length > 0 && (
                  <div className="flex flex-col gap-2.5 border-t border-hairline pt-4">
                    {(resp.expertsBlock || []).map((e) => {
                      const top = Math.max(
                        0.1,
                        ...(resp.expertsBlock || []).map((x) => x.score)
                      );
                      return (
                        <div
                          key={e.person}
                          className="flex flex-col gap-1 rounded-[10px] border border-hairline bg-wash/60 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {e.person}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              confidence
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] shadow-card">
                              {e.score.toFixed(1)}
                            </span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-hairline">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${(e.score / top) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            worked_on {e.breakdown.worked_on} · authored{" "}
                            {e.breakdown.authored} · resolved{" "}
                            {e.breakdown.resolved}
                            {e.latest ? ` · latest ${shortDate(e.latest)}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(resp.messagesBlock || []).length > 0 && (
                  <div className="flex flex-col divide-y divide-hairline border-t border-hairline">
                    {(resp.messagesBlock || []).map((m, i) => (
                      <div key={m.source_ref || i} className="flex flex-col gap-1 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-ink">{m.author}</span>
                          {m.at && (
                            <span className="text-muted-foreground">{shortDate(m.at)}</span>
                          )}
                          {m.channel && (
                            <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] text-muted-foreground shadow-card">
                              #{m.channel}
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(resp.blastBlock || []).length > 0 && (
                  <div className="flex flex-col gap-2.5 border-t border-hairline pt-4">
                    <p className="text-sm">
                      Changing {resp.blastService || "this service"} affects{" "}
                      {(resp.blastBlock || []).length} service
                      {(resp.blastBlock || []).length === 1 ? "" : "s"}:
                    </p>
                    {(resp.blastBlock || []).map((b) => (
                      <div
                        key={b.service}
                        className="flex items-center gap-3 rounded-[10px] border border-hairline bg-wash/60 p-3"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {b.service}
                        </span>
                        {b.owner && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            owner: {b.owner}
                          </span>
                        )}
                        {b.hops !== null && (
                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-[11px] shadow-card">
                            {b.hops} hop{b.hops === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {resp.trace.length > 0 && (
                  <div className="flex flex-col">
                    {resp.trace.map((t, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="mt-1.5 size-1.5 rounded-full bg-brand" />
                          {i < resp.trace.length - 1 && <span className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-3">
                          <div className="font-mono text-[12px] text-info">{t.edge}</div>
                          <div className="text-muted-foreground flex items-center gap-1 tabular-nums">
                            <span>{t.from}</span>
                            <ArrowRightHIcon aria-hidden className="size-3" />
                            <span>{t.to}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
              {resp.evidence.length > 0 && (
                <CardFooter className="gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowEv(!showEv)}>
                    {showEv ? "Hide evidence" : `Evidence · ${resp.evidence.length}`}
                  </Button>
                  {showEv &&
                    resp.evidence.map((e, i) => {
                      const channel = e.channel || channelOf(e.source_ref);
                      const primary = e.author
                        ? channel
                          ? `${e.author} · #${channel} · ${shortDate(e.at)}`
                          : `${e.author} · ${shortDate(e.at) || shortRef(e.source_ref)}`
                        : shortRef(e.source_ref) || e.source_ref;
                      return (
                        <span
                          key={i}
                          title={e.source_ref}
                          className="shadow-ring rounded-full bg-white px-2.5 py-1 font-mono text-[12px] text-muted-foreground"
                        >
                          {primary}
                        </span>
                      );
                    })}
                </CardFooter>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <CardBody className="items-center gap-2 py-10 text-center">
              <span className="text-subtle">No question asked yet</span>
              <p className="text-subtle">Ask about an incident, a service, or a person.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
