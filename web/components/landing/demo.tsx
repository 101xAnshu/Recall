"use client";

import { useState } from "react";
import { Eyebrow, Lead, SectionTitle, TYPE } from "./section";
import { Reveal, pressable } from "./motion";
import { cn } from "@/lib/utils";
import { DEMO_POSTER, DEMO_VIDEO_ID, YOUTUBE_URL } from "@/lib/landing-links";

export default function Demo() {
  // The YouTube player is roughly 1MB of JavaScript plus cookies. Holding it
  // behind a click means page load costs one local JPEG and nothing else, and
  // nothing reaches YouTube until someone asks for the video.
  const [playing, setPlaying] = useState(false);

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
          {DEMO_VIDEO_ID && playing ? (
            <div className="aspect-video w-full bg-secondary">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0`}
                title="Recall demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play the Recall demo video (also on YouTube at ${YOUTUBE_URL})`}
              className={cn(
                "group/play relative block aspect-video w-full cursor-pointer overflow-hidden bg-secondary outline-none",
                "focus-visible:shadow-focus"
              )}
            >
              <img
                src={DEMO_POSTER}
                alt=""
                width={1280}
                height={720}
                className="size-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors duration-150 ease-power2-out group-hover/play:bg-foreground/10"
              >
                <span className="shadow-popover flex size-14 items-center justify-center rounded-full bg-primary/90 transition-[opacity,scale] duration-150 ease-power2-out group-hover/play:scale-105 group-hover/play:bg-primary sm:size-16">
                  {/* The glyph path leans right of the viewBox centre, so it is pulled back with
                      a negative margin. No positive nudge, that is what pushed it
                      further off-centre. */}
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="-ml-[3px] size-6 fill-white sm:-ml-[3.5px] sm:size-7"
                  >
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.1-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
                  </svg>
                </span>
              </span>
              <span className="sr-only">Watch on YouTube</span>
            </button>
          )}
        </div>
      </Reveal>
    </section>
  );
}