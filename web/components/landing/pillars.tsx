"use client";

import { ApprovalHIcon, LedgerHIcon, MemoryHIcon } from "@/components/icons";
import { Eyebrow, Lead, Section, SectionTitle } from "./section";
import { Reveal } from "./reveal";
import type { IconComponent } from "@/components/_common/huge-icon";

const PILLARS: { icon: IconComponent; title: string; body: string }[] = [
  {
    icon: LedgerHIcon,
    title: "Answers with proof",
    body: "Every claim cites its graph path: incident to pull request, ADR to commit, message to author. Ask why and the answer arrives as a traced chain, not a paragraph.",
  },
  {
    icon: MemoryHIcon,
    title: "Memory that respects people",
    body: "One isolated graph per employee. New facts supersede old ones with history intact, and forgetting writes an erasure receipt you can verify against negative recall.",
  },
  {
    icon: ApprovalHIcon,
    title: "Acts only with permission",
    body: "The agent can propose a migration, never perform one blind. Blast radius picks the services, a human approves, and every decision lands in an audit trail.",
  },
];

export default function Pillars() {
  return (
    <Section id="pillars">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>What it does</Eyebrow>
          <SectionTitle>Three promises, kept structurally</SectionTitle>
          <Lead className="mt-1 max-w-[58ch]">
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
              <h3 className="font-display mt-1 text-[17px] leading-[125%] font-semibold tracking-[-0.03em]">
                {pillar.title}
              </h3>
              <p className="text-muted-foreground text-[14px] leading-[160%] font-medium tracking-[-0.02em]">
                {pillar.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}