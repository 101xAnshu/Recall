"use client";

import Link from "next/link";
import { Logo } from "@/components/_common/logo";
import { GithubHIcon } from "@/components/icons";
import { buttonVariants } from "@/components/_ui/button";
import { Reveal } from "./reveal";
import { REPO_URL } from "@/lib/landing-links";

export default function LandingFooter() {
  return (
    <footer className="border-border mt-8 border-t">
      <div className="mx-auto w-full max-w-[1080px] px-5 py-12 sm:px-8 sm:py-14">
        <Reveal>
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className="flex items-center gap-2">
                <Logo role="img" aria-label="Recall" className="size-[22px]" />
                <span className="text-[13px] font-medium tracking-[-0.02em]">Recall</span>
              </span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <GithubHIcon aria-hidden className="size-3.5" />
                View the repo
              </a>
              <Link
                href="/ask"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Open the live app
              </Link>
            </div>

            <p className="text-subtle max-w-[80ch] text-[12px] leading-[165%]">
              Meridian Pay is fictional demo data. Built with OpenCode, an
              agentic coding assistant, guided by Muse.
            </p>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}