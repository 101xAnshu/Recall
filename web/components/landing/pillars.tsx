"use client";

import { ApprovalHIcon, LedgerHIcon, MemoryHIcon } from "@/components/icons";
import type { IconComponent } from "@/components/_common/huge-icon";
import { Eyebrow, Lead, Section, SectionTitle, TYPE } from "./section";
import { Reveal } from "./motion";
import { cn } from "@/lib/utils";

const PILLARS: { icon: IconComponent; title: string; body: string }[] = [
  {
    icon: LedgerHIcon,
    title: "Answers with proof",
    body: "Ask why an incident happened, what breaks if a service changes, or who knows the system best. Every answer traces its path through the graph and cites its sources. Every claim carries the evidence behind it.",
  },
  {
    icon: MemoryHIcon,
    title: "Memory that respects people",
    body: "Each person gets their own memory graph. Facts can be superseded when they change, or forgotten entirely with an erasure receipt. The past is versioned, never rewritten.",
  },
  {
    icon: ApprovalHIcon,
    title: "Acts only with permission",
    body: "The agent drafts a plan and stops. Nothing executes until a human approves. Every approval and execution lands in an audit trail.",
  },
];

export default function Pillars() {
  return (
    <Section id="pillars">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>What it does</Eyebrow>
          <SectionTitle>Three promises, kept structurally</SectionTitle>
          <Lead className="mt-1">
            None of these are prompt instructions. Each one is enforced by the
            data model, so the model cannot quietly skip it.
          </Lead>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PILLARS.map((pillar, index) => (
          <Reveal key={pillar.title} delay={index * 0.08} className="h-full">
            <article className="shadow-card hover:shadow-card-hover flex h-full flex-col gap-3 rounded-2xl bg-white p-6 transition-[box-shadow] duration-200 ease-power2-out">
              <span className="bg-secondary flex size-9 items-center justify-center rounded-[10px]">
                <pillar.icon aria-hidden className="text-foreground size-4" />
              </span>
              <h3 className={cn(TYPE.sub, "mt-1 text-balance")}>{pillar.title}</h3>
              <p className={cn(TYPE.body, "text-muted-foreground text-pretty")}>
                {pillar.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}