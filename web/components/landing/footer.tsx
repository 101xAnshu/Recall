"use client";

import Link from "next/link";
import { Logo } from "@/components/_common/logo";
import { GithubHIcon } from "@/components/icons";
import { buttonVariants } from "@/components/_ui/button";
import { Reveal, pressable } from "./motion";
import { TYPE } from "./section";
import { REPO_URL } from "@/lib/landing-links";
import { cn } from "@/lib/utils";

export default function LandingFooter() {
  return (
    <footer className="border-border mt-8 border-t">
      <div className="mx-auto w-full max-w-[1080px] px-5 py-12 sm:px-8 sm:py-14">
        <Reveal>
          {/* Desktop: the disclosure sits to the right of the controls on one
              line. Mobile: it wraps below them, since there is no room beside. */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className="flex items-center gap-2">
                <Logo role="img" aria-label="Recall" className="size-[22px]" />
                <span className={cn(TYPE.body)}>Recall</span>
              </span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className={pressable(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                <GithubHIcon aria-hidden className="size-3.5" />
                View the repo
              </a>
              <Link
                href="/ask"
                className={pressable(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Open the live app
              </Link>
            </div>

            <p
              className={cn(
                TYPE.body,
                "text-subtle max-w-[68ch] text-pretty sm:max-w-none sm:shrink-0 sm:whitespace-nowrap sm:text-right"
              )}
            >
              Meridian Pay is fictional demo data. Built with OpenCode, guided by Muse.
            </p>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}