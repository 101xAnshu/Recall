"use client";

import { Eyebrow, Section, SectionTitle, TYPE } from "./section";
import { Reveal } from "./motion";
import { cn } from "@/lib/utils";

const ROWS: { category: string; n: number; graph: number; rag: number }[] = [
  { category: "Causal why", n: 10, graph: 8.667, rag: 8.417 },
  { category: "Blast radius", n: 6, graph: 5.0, rag: 3.334 },
  { category: "Ownership", n: 6, graph: 5.0, rag: 4.5 },
  { category: "Temporal", n: 4, graph: 4.0, rag: 2.0 },
  { category: "Memory", n: 4, graph: 2.0, rag: 1.0 },
];

// Derived from the same numbers in the table, never hard-coded per row.
function winner(graph: number, rag: number) {
  if (graph > rag) return "Graph";
  if (rag > graph) return "Flat RAG";
  return "Tie";
}

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

export default function Proof() {
  return (
    <Section id="proof">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>Proof</Eyebrow>
          <SectionTitle>The graph beats flat RAG</SectionTitle>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div className="flex flex-col">
            <span className={cn(TYPE.label, "text-subtle")}>Graph traversal</span>
            <span
              className={cn(
                TYPE.display,
                "font-display tabular-nums mt-2"
              )}
            >
              {TOTAL_GRAPH}
            </span>
          </div>
          <span className={cn(TYPE.body, "text-subtle pb-2")}>vs</span>
          <div className="flex flex-col">
            <span className={cn(TYPE.label, "text-subtle")}>Flat RAG</span>
            <span
              className={cn(
                TYPE.display,
                "text-muted-foreground font-display tabular-nums mt-2"
              )}
            >
              {TOTAL_RAG}
            </span>
          </div>
          <span className={cn(TYPE.label, "text-subtle pb-3")}>
            {TOTAL_N} questions scored
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="shadow-card mt-9 overflow-hidden rounded-2xl">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col />
              {/* Mobile: percentages that sum to 100% so the row is filled edge to
                  edge with no dead gap. Desktop: fixed widths, category takes the
                  slack and the numeric columns sit at their natural size. */}
              <col className="w-[14%] sm:w-[176px]" />
              <col className="w-[18%] sm:w-[116px]" />
              <col className="w-[18%] sm:w-[128px]" />
              <col className="w-[18%] sm:w-[116px]" />
            </colgroup>
            <caption className="sr-only">
              Correct answers out of 30 questions, graph traversal versus flat RAG
            </caption>
            <thead>
              <tr className="border-card-border border-b">
                <th scope="col" className={cn(TYPE.label, "text-subtle px-2.5 py-3.5 sm:px-6 sm:py-3.5 font-normal")}>
                  Category
                </th>
                <th
                  scope="col"
                  className={cn(
                    TYPE.label,
                    "text-subtle tabular-nums px-2.5 py-3.5 sm:px-6 sm:py-3.5 text-right font-normal"
                  )}
                >
                  <span className="hidden whitespace-nowrap sm:inline">No. of Question</span>
                  <span className="sm:hidden">n</span>
                </th>
                <th
                  scope="col"
                  className={cn(TYPE.label, "text-subtle tabular-nums px-2.5 py-3.5 sm:px-6 sm:py-3.5 text-right font-normal")}
                >
                  Graph
                </th>
                <th
                  scope="col"
                  className={cn(TYPE.label, "text-subtle tabular-nums px-2.5 py-3.5 sm:px-6 sm:py-3.5 text-right font-normal")}
                >
                  <span className="hidden sm:inline">Flat RAG</span>
                  <span className="sm:hidden">RAG</span>
                </th>
                <th
                  scope="col"
                  className={cn(
                    TYPE.label,
                    "text-subtle px-2.5 py-3.5 text-right font-normal sm:px-6 sm:py-3.5"
                  )}
                >
                  Winner
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.category} className="border-card-border border-b last:border-b-0">
                  <td className={cn(TYPE.body, "px-2.5 py-4 sm:px-6 sm:py-4")}>{row.category}</td>
                  <td className={cn(TYPE.body, "text-subtle tabular-nums px-2.5 py-4 sm:px-6 sm:py-4 text-right")}>
                    {row.n}
                  </td>
                  <td className={cn(TYPE.body, "tabular-nums px-2.5 py-4 sm:px-6 sm:py-4 text-right")}>
                    {fmt(row.graph)}
                  </td>
                  <td
                    className={cn(
                      TYPE.body,
                      "text-muted-foreground tabular-nums px-2.5 py-4 sm:px-6 sm:py-4 text-right"
                    )}
                  >
                    {fmt(row.rag)}
                  </td>
                  <td
                    className={cn(
                      TYPE.body,
                      "px-2.5 py-4 text-right sm:px-6 sm:py-4"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block",
                        winner(row.graph, row.rag) === "Tie"
                          ? "text-subtle"
                          : "text-foreground"
                      )}
                    >
                      <span className="hidden sm:inline">{winner(row.graph, row.rag)}</span>
                      <span className="sm:hidden">
                        {winner(row.graph, row.rag) === "Graph" ? "Graph" : winner(row.graph, row.rag) === "Flat RAG" ? "RAG" : "Tie"}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary">
                <td className={cn(TYPE.body, "px-2.5 py-4 sm:px-6 sm:py-5 font-semibold sm:text-[16px]")}>
                  Total
                </td>
                <td
                  className={cn(
                    TYPE.body,
                    "tabular-nums px-2.5 py-4 sm:px-6 sm:py-5 text-right font-semibold sm:text-[16px]"
                  )}
                >
                  {TOTAL_N}
                </td>
                <td
                  className={cn(
                    TYPE.body,
                    "tabular-nums px-2.5 py-4 sm:px-6 sm:py-5 text-right font-semibold sm:text-[20px] sm:leading-[1.25]"
                  )}
                >
                  {TOTAL_GRAPH}
                </td>
                <td
                  className={cn(
                    TYPE.body,
                    "text-muted-foreground tabular-nums px-2.5 py-4 sm:px-6 sm:py-5 text-right font-semibold sm:text-[20px] sm:leading-[1.25]"
                  )}
                >
                  {TOTAL_RAG}
                </td>
                <td
                  className={cn(
                    TYPE.body,
                    "px-2.5 py-4 text-right font-semibold sm:px-6 sm:py-5 sm:text-[16px]"
                  )}
                >
                  <span className="hidden sm:inline">{winner(TOTAL_GRAPH, TOTAL_RAG)}</span>
                  <span className="sm:hidden">
                    {winner(TOTAL_GRAPH, TOTAL_RAG) === "Flat RAG" ? "RAG" : winner(TOTAL_GRAPH, TOTAL_RAG)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <p className={cn(TYPE.body, "text-muted-foreground mt-4 max-w-[72ch] text-pretty")}>
          Thirty questions, same corpus, same Groq model, same scoring. The RAG index is a
          static snapshot taken before the memory mutations while the graph arm
          reads live data. Remaining zeros are reported in the repo, not hidden.
        </p>
      </Reveal>
    </Section>
  );
}