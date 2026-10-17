"use client";

import { Eyebrow, Lead, SectionTitle, TYPE } from "./section";
import { Reveal } from "./motion";
import { DEMO_VIDEO_ID } from "@/lib/landing-links";
import { cn } from "@/lib/utils";

export default function Demo() {
  return (
    <section
      id="demo"
      className="mx-auto w-full max-w-[1080px] scroll-mt-20 px-5 py-12 sm:px-8 sm:py-16"
    >
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <Eyebrow>The demo</Eyebrow>
            <SectionTitle>Four minutes inside the live app</SectionTitle>
          </div>
          <Lead className="sm:max-w-[42ch]">
            A real FalkorDB, a real Groq model, and the real kill-switch. The
            only fictional part is the company.
          </Lead>
        </div>
      </Reveal>

      <Reveal delay={0.06} className="mt-8">
        <div className="shadow-card overflow-hidden rounded-2xl">
          {DEMO_VIDEO_ID ? (
            <div className="aspect-video w-full bg-secondary">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?rel=0`}
                title="Recall demo"
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          ) : (
            <div className="bg-secondary flex aspect-video w-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className={cn(TYPE.sub, "text-balance")}>Demo video not published yet</p>
              <p className={cn(TYPE.body, "text-muted-foreground max-w-[46ch] text-pretty")}>
                Paste the YouTube URL into{" "}
                <code className="font-mono text-foreground">web/lib/landing-links.ts</code>{" "}
                and this plate becomes the player.
              </p>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}