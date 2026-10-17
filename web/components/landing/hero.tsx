"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/_ui/button";
import { ArrowRightHIcon, GithubHIcon } from "@/components/icons";
import { HeroEnter, pressable } from "./motion";
import { MEASURE, TYPE } from "./section";
import { REPO_URL } from "@/lib/landing-links";
import { cn } from "@/lib/utils";

const TICKER = [
  "Graph-native agent",
  "All three tracks",
  "Zero paid APIs",
  "Traced every answer",
];

export default function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1080px] px-5 pt-16 pb-12 sm:px-8 sm:pt-24 sm:pb-16">
      <HeroEnter
        className="contents"
        step={0.1}
        children={[
          <h1
            key="title"
            className={cn(
              TYPE.display,
              "font-display max-w-[18ch] text-foreground text-balance"
            )}
          >
            The company brain that shows its work.
          </h1>,
          <p
            key="body"
            className={cn(
              TYPE.body,
              "text-muted-foreground mt-6 max-w-[64ch] text-pretty sm:text-[15px]"
            )}
          >
            Company knowledge dies in chat threads and docs. Recall keeps the
            causal history in a graph and reasons over it, so every answer shows
            its path and its evidence.
          </p>,
          <div key="cta" className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link
              href="/ask"
              className={pressable(
                cn(buttonVariants({ variant: "primary", size: "lg" }), "px-4")
              )}
            >
              Open the live app
              <ArrowRightHIcon aria-hidden className="size-3.5" />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className={pressable(
                cn(buttonVariants({ variant: "secondary", size: "lg" }), "px-4")
              )}
            >
              <GithubHIcon aria-hidden className="size-3.5" />
              View the GitHub repo
            </a>
          </div>,
          <ul
            key="ticker"
            className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {TICKER.map((item) => (
              <li
                key={item}
                className={cn(
                  TYPE.label,
                  "text-subtle flex items-center gap-2 before:size-1 before:rounded-full before:bg-border before:content-['']"
                )}
              >
                {item}
              </li>
            ))}
          </ul>,
        ]}
      />
    </section>
  );
}