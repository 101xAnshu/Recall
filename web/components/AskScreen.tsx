"use client";
import { useEffect, useState } from "react";
import { api, type AskResp } from "../lib/api";
import { Card, CardBody, CardFooter } from "../components/card";
import { AnswerSkeleton } from "../components/skeleton";
import Button from "../components/_ui/button";
import { Input } from "../components/_ui/form/input";
import { FileHIcon, SearchHIcon, ArrowRightHIcon } from "@/components/icons";

const SAMPLES = [
  "Why did INC-231 happen?",
  "What breaks if we change Ledger?",
  "Who knows payout-retry?",
];

export default function AskScreen({ user }: { user: string }) {
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<AskResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEv, setShowEv] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setResp(null);
    setShowEv(false);
  }, [user]);

  const run = async (question: string) => {
    if (loading || !question.trim()) return;
    setQ(question);
    setLoading(true);
    try {
      const r = await api<AskResp>("/ask", {
        method: "POST",
        body: JSON.stringify({ question, user_id: user }),
      });
      setResp(r);
    } catch {
      setResp({ answer: "Request failed.", trace: [], evidence: [] });
    }
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
          <AnswerSkeleton />
        ) : resp ? (
          <div key={runId}>
            <Card>
              <CardBody className="gap-3">
                <div className="flex items-start gap-1.5">
                  <FileHIcon aria-hidden className="text-info mt-[2px] size-3.5 shrink-0" />
                  <h3 className="min-w-0 flex-1">Traced answer</h3>
                  <span className="text-subtle whitespace-nowrap font-mono text-[12px]">
                    user_{user}
                  </span>
                </div>
                <p className="text-[15px] leading-[150%]">{resp.answer}</p>
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
                    resp.evidence.map((e, i) => (
                      <span
                        key={i}
                        className="shadow-ring rounded-full bg-white px-2.5 py-1 font-mono text-[12px] text-muted-foreground"
                      >
                        {e.source_ref}
                      </span>
                    ))}
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
