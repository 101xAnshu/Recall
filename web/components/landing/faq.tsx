"use client";

import { Eyebrow, Section, SectionTitle } from "./section";
import { Reveal } from "./reveal";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is the data real?",
    a: "No. Meridian Pay is synthetic and every node says so, but the graph is real: a live FalkorDB instance, real Cypher traversals, real calls to Groq. Nothing in the demo is a screenshot or a mock.",
  },
  {
    q: "What do I need to run it?",
    a: "Docker for FalkorDB, pinned to falkordb/falkordb:6.0.1. Python 3.12 or newer, Node 18 or newer, and a free Groq API key in the environment. That is the whole stack, and no key ever ships in the repo.",
  },
  {
    q: "Which tracks does this enter?",
    a: "All three, from one entry: Agents That Act on Connected Data, Agent Memory and Coordination, and Company Brain. The same graph serves all of them, which is why the product feels like one system instead of three demos.",
  },
];

export default function Faq() {
  return (
    <Section id="faq">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>FAQ</Eyebrow>
          <SectionTitle>The three questions judges always ask</SectionTitle>
        </div>
      </Reveal>

      <div className="mt-9 flex flex-col">
        {FAQ.map((item, index) => (
          <Reveal key={item.q} delay={index * 0.06}>
            <div className="border-border grid gap-2 border-t py-7 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-10">
              <h3 className="font-display text-[16px] leading-[135%] font-semibold tracking-[-0.03em]">
                {item.q}
              </h3>
              <p className="text-muted-foreground max-w-[70ch] text-[14px] leading-[165%] font-medium tracking-[-0.02em]">
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