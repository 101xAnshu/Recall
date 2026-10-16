"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/_common/logo";
import { buttonVariants } from "@/components/_ui/button";
import { GithubHIcon } from "@/components/icons";
import { REPO_URL } from "@/lib/landing-links";
import { cn } from "@/lib/utils";

const ANCHORS = [
  { href: "#pillars", label: "Pillars" },
  { href: "#proof", label: "Proof" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingFrame({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-thin scroll-smooth fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background">
      <header className="border-border sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-[62px] w-full max-w-[1080px] items-center gap-3 px-5 sm:px-8">
          <span className="flex min-w-0 items-center gap-2">
            <Logo role="img" aria-label="Recall" className="size-[26px]" />
            <span className="lead-style truncate">Recall</span>
          </span>
          <nav aria-label="Sections" className="ml-auto hidden items-center gap-1 sm:flex">
            {ANCHORS.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="text-muted-foreground rounded-lg px-2.5 py-1.5 text-[13px] font-medium tracking-[-0.02em] transition-colors duration-150 ease-power2-out hover:bg-foreground/[0.04] hover:text-foreground"
              >
                {a.label}
              </a>
            ))}
          </nav>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "ml-auto sm:ml-2")}
          >
            <GithubHIcon aria-hidden className="size-3.5" />
            GitHub
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}

export function GoToAppButton() {
  return (
    <Link
      href="/ask"
      className="text-muted-foreground inline-flex items-center gap-1 text-[13px] font-medium tracking-[-0.02em] transition-colors duration-150 ease-power2-out hover:text-foreground"
    >
      Open the live app
    </Link>
  );
}