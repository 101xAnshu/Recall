"use client";

import { Logo } from "@/components/_common/logo";
import { buttonVariants } from "@/components/_ui/button";
import { ArrowRightHIcon, GithubHIcon } from "@/components/icons";
import { Reveal } from "./reveal";
import { DEMO_VIDEO_ID, REPO_URL, YOUTUBE_URL } from "@/lib/landing-links";
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
      <Reveal>
        <span className="text-muted-foreground inline-flex items-center gap-2 text-[13px] font-medium tracking-[-0.02em]">
          <Logo role="img" aria-label="Recall" className="size-[22px]" />
          Recall
        </span>
      </Reveal>

      <Reveal delay={0.05}>
        <h1 className="font-display mt-5 max-w-[16ch] text-[40px] leading-[104%] font-semibold tracking-[-0.045em] text-foreground sm:text-[68px]">
          The company brain that shows its work.
        </h1>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-6 max-w-[62ch] text-[16px] leading-[155%] font-medium tracking-[-0.02em] text-muted-foreground sm:text-[18px]">
          Company knowledge dies in chat threads. Six months after the incident,
          nobody can say why the decision was made, what breaks if a service
          changes, or who actually knows the system best.
        </p>
      </Reveal>

      <Reveal delay={0.15}>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-[155%] font-medium tracking-[-0.02em] text-muted-foreground sm:text-[18px]">
          Recall keeps the causal history in a graph and reasons over it, so
          every claim arrives with the path that produced it.
        </p>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <a
            href={DEMO_VIDEO_ID ? YOUTUBE_URL : "#demo"}
            target={DEMO_VIDEO_ID ? "_blank" : undefined}
            rel={DEMO_VIDEO_ID ? "noreferrer" : undefined}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "px-4")}
          >
            Watch the demo
            <ArrowRightHIcon aria-hidden className="size-3.5" />
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "px-4")}
          >
            <GithubHIcon aria-hidden className="size-3.5" />
            View the GitHub repo
          </a>
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <ul className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2">
          {TICKER.map((item) => (
            <li
              key={item}
              className="text-subtle label-style flex items-center gap-2 before:size-1 before:rounded-full before:bg-border before:content-['']"
            >
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}