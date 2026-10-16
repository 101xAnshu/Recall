"use client";

import { Eyebrow, Lead } from "./section";
import { Reveal } from "./reveal";
import { DEMO_VIDEO_ID } from "@/lib/landing-links";

export default function Demo() {
  return (
    <section id="demo" className="mx-auto w-full max-w-[1080px] scroll-mt-20 px-5 py-12 sm:px-8 sm:py-16">
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <Eyebrow>The demo</Eyebrow>
            <h2 className="font-display text-[22px] leading-[120%] font-semibold tracking-[-0.035em] sm:text-[26px]">
              Four minutes inside the live app
            </h2>
          </div>
          <Lead className="sm:max-w-[40ch]">
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
              <p className="font-display text-[17px] font-semibold tracking-[-0.03em]">
                Demo video not published yet
              </p>
              <p className="text-muted-foreground max-w-[46ch] text-[13px] leading-[150%]">
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