import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      className={cn("mx-auto w-full max-w-[1080px] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24", className)}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="label-style text-brand">{children}</p>;
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-display text-[26px] leading-[118%] font-semibold tracking-[-0.035em] text-foreground sm:text-[32px]",
        className
      )}
    >
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
    <p
      className={cn(
        "text-[15px] leading-[155%] font-medium tracking-[-0.02em] text-muted-foreground sm:text-[16px]",
        className
      )}
    >
      {children}
    </p>
  );
}