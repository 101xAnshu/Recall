"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Button from "@/components/_ui/button";
import { ease } from "@/lib/easings";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import {
  ArrowRightHIcon,
  AskHIcon,
  BlastHIcon,
  CloseHIcon,
  ExpertsHIcon,
  ApprovalHIcon,
  MemoryHIcon,
} from "@/components/icons";

function ArrowText({ text }: { text: string }) {
  const parts = text.split(" → ");
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && (
            <ArrowRightHIcon
              aria-hidden
              className="mx-0.5 inline size-3 align-[-1px]"
            />
          )}
          {part}
        </span>
      ))}
    </>
  );
}

const SECTIONS = [
  {
    icon: AskHIcon,
    tone: "text-info",
    title: "Ask",
    body: "Ask about an incident, a service, or a person. Answers come back with a traced graph path and evidence chips carrying source_refs.",
  },
  {
    icon: BlastHIcon,
    tone: "text-danger",
    title: "Blast radius",
    body: "Pick a changed service to see downstream dependents via incoming DEPENDS_ON. Try Ledger → Payments, Retry, Notifications.",
  },
  {
    icon: ExpertsHIcon,
    tone: "text-success",
    title: "Who knows",
    body: "Who knows scores experts 1.0 / 1.5 / 2.0 across worked_on, authored and resolved.",
  },
  {
    icon: MemoryHIcon,
    tone: "text-info",
    title: "Memory",
    body: "Memory is per-employee (user_anshu vs user_priya) with remember → supersede → forget + receipts.",
  },
  {
    icon: ApprovalHIcon,
    tone: "text-warning",
    title: "Approvals",
    body: "Propose a migration, it pauses here. Approve writes APPROVED_BY, reject writes REJECTED_BY with your reason. Everything lands in the audit trail.",
  },
];

export default function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
    target?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: ease.power3Out }}
            onClick={onClose}
            className="bg-foreground/40 absolute inset-0"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Help and resource"
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: ease.power3Out }}
            className="shadow-popover relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white outline-none sm:max-w-[520px] sm:rounded-2xl"
          >
            <div className="border-border flex items-start gap-3 border-b p-4">
              <div className="min-w-0 flex-1">
                <h2 className="lead-style">Help and resource</h2>
                <p className="text-muted-foreground mt-1">
                  Meridian Pay: the company that remembers. Five screens, one graph.
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-m-2" data-autofocus>
                <CloseHIcon className="size-3.5" aria-hidden />
              </Button>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3.5">
                {SECTIONS.map((s) => (
                  <div
                    key={s.title}
                    className="shadow-card flex w-full flex-col gap-2 rounded-2xl bg-white p-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <s.icon aria-hidden className={cn("size-3.5 shrink-0", s.tone)} />
                      <h3 className="min-w-0 flex-1">{s.title}</h3>
                    </div>
                    <p className="text-muted-foreground">
                      <ArrowText text={s.body} />
                    </p>
                  </div>
                ))}
                <div className="shadow-card flex w-full flex-col gap-2 rounded-2xl bg-white p-4">
                  <h3>ID glossary</h3>
                  <div className="text-muted-foreground flex flex-col gap-1.5">
                    <p><span className="font-mono text-[12px] text-foreground">MSG-</span> team chat messages (#incidents, #backend).</p>
                    <p><span className="font-mono text-[12px] text-foreground">ADR-</span> architecture decision records.</p>
                    <p><span className="font-mono text-[12px] text-foreground">PM-</span> fix pull requests.</p>
                    <p><span className="font-mono text-[12px] text-foreground">INC-</span> incidents.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t p-4">
              <Button variant="primary" size="md" onClick={onClose}>
                Got it
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
