import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing page type scale. Three heading sizes only, descending:
 *   display (hero) -> title (section) -> sub (card and question)
 * Body copy is 14px at 1.6 line-height. Uppercase micro-labels are 12px at
 * 0.05em. Nothing between them.
 */
export const TYPE = {
  display: "text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-[56px]",
  title: "text-[24px] leading-[1.25] font-semibold tracking-[-0.015em] sm:text-[28px]",
  sub: "text-[16px] leading-[1.3] font-semibold tracking-[-0.01em]",
  body: "text-[14px] leading-[1.6] font-medium tracking-[0em]",
  label: "text-[12px] leading-none font-medium tracking-[0.05em] uppercase",
} as const;

/** Cap on measure, in characters per line. */
export const MEASURE = "max-w-[68ch]";

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto w-full max-w-[1080px] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24",
        className
      )}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={cn(TYPE.label, "text-brand")}>{children}</p>;
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn(TYPE.title, "text-foreground text-balance", className)}>
      {children}
    </h2>
  );
}

export function Lead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn(TYPE.body, "text-muted-foreground text-pretty", MEASURE, className)}>
      {children}
    </p>
  );
}