"use client";

import { Eyebrow, Section, SectionTitle } from "./section";
import { Reveal } from "./reveal";

const ROWS: { category: string; n: number; graph: number; rag: number }[] = [
  { category: "Causal why", n: 10, graph: 8.667, rag: 8.417 },
  { category: "Blast radius", n: 6, graph: 5.0, rag: 3.334 },
  { category: "Ownership", n: 6, graph: 5.0, rag: 4.5 },
  { category: "Temporal", n: 4, graph: 4.0, rag: 2.0 },
  { category: "Memory", n: 4, graph: 2.0, rag: 1.0 },
];

const TOTAL_N = 30;
const TOTAL_GRAPH = 24.667;
const TOTAL_RAG = 19.251;

// Trim trailing zeros but always keep one decimal, so 5 reads 5.0 and 8.667
// stays 8.667. Matches the eval table in the repo README exactly.
function fmt(value: number) {
  return value
    .toFixed(3)
    .replace(/\.?0+$/, "")
    .replace(/^(\d+)$/, "$1.0");
}

function Bar({ value, max, tone }: { value: number; max: number; tone: "graph" | "rag" }) {
  return (
    <span className="bg-muted block h-1 w-full overflow-hidden rounded-full">
      <span
        className={tone === "graph" ? "bg-foreground block h-full" : "bg-border block h-full"}
        style={{ width: `${Math.max(2, Math.round((value / max) * 100))}%` }}
      />
    </span>
  );
}

export default function Proof() {
  const max = TOTAL_GRAPH;
  return (
    <Section id="proof">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>Proof</Eyebrow>
          <SectionTitle>Graph beats document search on the same evidence</SectionTitle>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div className="flex flex-col">
            <span className="label-style text-subtle">Graph traversal</span>
            <span className="font-display tabular-nums text-[44px] leading-[100%] font-semibold tracking-[-0.045em] sm:text-[56px]">
              {TOTAL_GRAPH}
            </span>
          </div>
          <span className="text-subtle pb-2 text-[20px] font-medium">vs</span>
          <div className="flex flex-col">
            <span className="label-style text-subtle">Flat RAG</span>
            <span className="text-muted-foreground tabular-nums font-display text-[44px] leading-[100%] font-semibold tracking-[-0.045em] sm:text-[56px]">
              {TOTAL_RAG}
            </span>
          </div>
          <span className="label-style text-subtle pb-3">{TOTAL_N} questions scored</span>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="shadow-card mt-9 overflow-hidden rounded-2xl">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Correct answers out of 30 questions, graph traversal versus flat RAG
            </caption>
            <thead>
              <tr className="border-card-border border-b">
                <th scope="col" className="label-style text-subtle px-5 py-3 font-normal">
                  Category
                </th>
                <th scope="col" className="label-style text-subtle px-5 py-3 text-right font-normal">
                  n
                </th>
                <th scope="col" className="label-style text-subtle px-5 py-3 font-normal">
                  Graph
                </th>
                <th scope="col" className="label-style text-subtle px-5 py-3 font-normal">
                  Flat RAG
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.category} className="border-card-border border-b last:border-b-0">
                  <td className="px-5 py-3.5 text-[14px] font-medium tracking-[-0.02em]">
                    {row.category}
                  </td>
                  <td className="text-subtle tabular-nums px-5 py-3.5 text-right text-[13px]">
                    {row.n}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="tabular-nums flex items-center gap-3 text-[14px] font-medium">
                      <span className="w-10">{fmt(row.graph)}</span>
                      <span className="w-full max-w-[120px]">
                        <Bar value={row.graph} max={max} tone="graph" />
                      </span>
                    </span>
                  </td>
                  <td className="text-muted-foreground px-5 py-3.5">
                    <span className="tabular-nums flex items-center gap-3 text-[14px] font-medium">
                      <span className="w-10">{fmt(row.rag)}</span>
                      <span className="w-full max-w-[120px]">
                        <Bar value={row.rag} max={max} tone="rag" />
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary">
                <td className="px-5 py-3.5 text-[14px] font-semibold tracking-[-0.02em]">Total</td>
                <td className="tabular-nums px-5 py-3.5 text-right text-[13px] font-semibold">
                  {TOTAL_N}
                </td>
                <td className="tabular-nums px-5 py-3.5 text-[14px] font-semibold">
                  {TOTAL_GRAPH}
                </td>
                <td className="text-muted-foreground tabular-nums px-5 py-3.5 text-[14px] font-semibold">
                  {TOTAL_RAG}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="text-muted-foreground mt-4 max-w-[74ch] text-[13px] leading-[160%]">
          Same corpus, same Groq model, same 30 questions, same
          expected-evidence definitions for both arms; the RAG index is a static
          snapshot taken before the memory mutations while the graph arm reads
          live data. Remaining zeros are reported in the repo, not hidden.
        </p>
      </Reveal>
    </Section>
  );
}