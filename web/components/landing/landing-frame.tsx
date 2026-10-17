"use client";

import { YoutubeIcon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { Logo } from "@/components/_common/logo";
import { makeIcon } from "@/components/_common/huge-icon";
import { buttonVariants } from "@/components/_ui/button";
import { DEMO_VIDEO_ID, REPO_URL, YOUTUBE_URL } from "@/lib/landing-links";
import { scrollToAnchor, scrollToTop } from "@/lib/landing-scroll";
import { cn } from "@/lib/utils";
import { pressable } from "./motion";

// Defined here rather than in the shared icons module so this change stays
// scoped to the landing page.
const YoutubeHIcon = makeIcon(YoutubeIcon);

const ANCHORS = [
  { href: "#pillars", label: "Pillars" },
  { href: "#proof", label: "Proof" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-landing-scroll
      className="scroll-smooth fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <header className="border-border sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-[62px] w-full max-w-[1080px] items-center gap-3 px-5 sm:px-8">
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="group/logo -ml-1 flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-1 py-1 outline-none transition-opacity duration-150 ease-power2-out hover:opacity-70 focus-visible:shadow-focus active:opacity-60"
          >
            <Logo role="img" aria-label="Recall" className="size-[26px]" />
            <span className="text-[14px] leading-none font-semibold tracking-[0em]">
              Recall
            </span>
          </button>
          <nav aria-label="Sections" className="ml-auto hidden items-center gap-1 sm:flex">
            {ANCHORS.map((a) => (
              <a
                key={a.href}
                href={a.href}
                onClick={(e) => scrollToAnchor(e, a.href)}
                className="text-muted-foreground rounded-lg px-2.5 py-1.5 text-[14px] leading-none font-medium tracking-[0em] transition-colors duration-150 ease-power2-out hover:bg-foreground/[0.04] hover:text-foreground"
              >
                {a.label}
              </a>
            ))}
          </nav>
          <a
            href={DEMO_VIDEO_ID ? YOUTUBE_URL : "#demo"}
            target={DEMO_VIDEO_ID ? "_blank" : undefined}
            rel={DEMO_VIDEO_ID ? "noreferrer" : undefined}
            onClick={DEMO_VIDEO_ID ? undefined : (e) => scrollToAnchor(e, "#demo")}
            className={pressable(
              cn(buttonVariants({ variant: "secondary", size: "sm" }), "ml-auto sm:ml-2")
            )}
          >
            <YoutubeHIcon aria-hidden className="size-3.5" />
            Watch the demo
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}