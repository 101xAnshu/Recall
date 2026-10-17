"use client";

import { Eyebrow, Section, SectionTitle, TYPE } from "./section";
import { Reveal } from "./motion";
import { cn } from "@/lib/utils";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is any of this data real?",
    a: "No. Meridian Pay and everything in it is synthetic test data. The graph, the queries, and the agent behavior are real.",
  },
  {
    q: "What do I need to run it?",
    a: "Docker, Python 3.12 or newer, Node 18 or newer, and a free Groq API key. Six steps, in the README.",
  },
  {
    q: "Which tracks does this enter?",
    a: "All three. Agents That Act on Connected Data, Agent Memory and Coordination, and Company Brain. One entry, one repo.",
  },
];

export default function Faq() {
  return (
    <Section id="faq">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>FAQ</Eyebrow>
          <SectionTitle>The short version</SectionTitle>
        </div>
      </Reveal>

      <div className="mt-9 flex flex-col">
        {FAQ.map((item, index) => (
          <Reveal key={item.q} delay={index * 0.06}>
            <div className="border-border grid gap-2 border-t py-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-10">
              <h3 className={cn(TYPE.sub, "text-balance")}>{item.q}</h3>
              <p className={cn(TYPE.body, "text-muted-foreground max-w-[68ch] text-pretty")}>
                {item.a}
              </p>
            </div>
          </Reveal>
        ))}
        <div className="border-border border-t" />
      </div>
    </Section>
  );
}