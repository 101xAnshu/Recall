"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Button from "@/components/_ui/button";
import { Input } from "@/components/_ui/form/input";
import { ease } from "@/lib/easings";
import { useMounted } from "@/hooks/use-mounted";
import { CloseHIcon, UserHIcon } from "@/components/icons";

type Fact = {
  id: string;
  text: string;
};

export default function SupersedeDialog({
  open,
  fact,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  fact: Fact | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (newText: string) => void;
}) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open && fact) setDraft(fact.text);
  }, [open, fact]);

  useEffect(() => {
    if (!open) return;
    const target =
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
    // wait a tick so the panel has mounted inside the portal
    const t = setTimeout(() => target?.focus({ preventScroll: true }), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const trimmed = draft.trim();
  const unchanged = fact ? trimmed === fact.text.trim() : true;
  const canSave = trimmed.length > 0 && !unchanged && !busy;

  return createPortal(
    <AnimatePresence>
      {open && fact && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: ease.power3Out }}
            onClick={() => {
              if (!busy) onClose();
            }}
            className="bg-foreground/40 absolute inset-0"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Supersede memory"
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: ease.power3Out }}
            className="shadow-popover relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white outline-none sm:max-w-[440px] sm:rounded-2xl"
          >
            <div className="border-border flex items-start gap-3 border-b p-4">
              <div className="min-w-0 flex-1">
                <h2 className="lead-style">Supersede memory</h2>
                <p className="text-muted-foreground mt-1">
                  Replace this fact with a corrected version. The old one stays in history.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={onClose}
                disabled={busy}
                className="-m-2"
              >
                <CloseHIcon className="size-3.5" aria-hidden />
              </Button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                <div className="shadow-card flex w-full flex-col gap-2 rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-1.5">
                    <UserHIcon aria-hidden className="text-info size-3.5 shrink-0" />
                    <h3 className="min-w-0 flex-1">Current</h3>
                    <span className="text-subtle font-mono text-[12px]">{fact.id}</span>
                  </div>
                  <p className="text-muted-foreground line-through">{fact.text}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="label-style text-muted-foreground px-0.5 py-1">
                    New text
                  </span>
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSave) onSubmit(trimmed);
                    }}
                    aria-label="New memory text"
                    data-autofocus
                    disabled={busy}
                  />
                </div>
              </div>
            </div>

            <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t p-4">
              <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!canSave}
                aria-busy={busy}
                onClick={() => onSubmit(trimmed)}
              >
                Save replacement
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
