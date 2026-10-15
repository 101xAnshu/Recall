import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const fieldClasses =
  "w-full rounded-[10px] bg-white text-[14px] font-medium tracking-[-0.02em] text-foreground shadow-ring outline-none transition-[box-shadow] duration-150 ease-power2-out placeholder:text-subtle focus:shadow-focus disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-[34px] px-3", className)} {...props} />;
}
