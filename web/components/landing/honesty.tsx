"use client";

import { ReliabilityHIcon } from "@/components/icons";
import { Eyebrow, Section, TYPE } from "./section";
import { Reveal } from "./motion";
import { cn } from "@/lib/utils";

export default function Honesty() {
  return (
    <Section className="py-14 sm:py-16">
      <Reveal>
        <aside className="bg-secondary flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="bg-background flex size-8 items-center justify-center rounded-[10px]">
              <ReliabilityHIcon aria-hidden className="text-foreground size-4" />
            </span>
            <Eyebrow>What is real</Eyebrow>
          </div>
          <p className={cn(TYPE.sub, "max-w-[62ch] text-pretty")}>
            The FalkorDB instance, the Groq calls, and the kill-switch behavior
            are all real and live. Meridian Pay is fictional; every person,
            incident, message, and decision in it is seeded test data.
          </p>
          <p className={cn(TYPE.body, "text-muted-foreground max-w-[68ch] text-pretty")}>
            Every node in every graph carries{" "}
            <code className="font-mono text-foreground">source_type: synthetic</code>.
            No real company data, no real user data, no scraped content, and no
            API key committed anywhere.
          </p>
        </aside>
      </Reveal>
    </Section>
  );
}