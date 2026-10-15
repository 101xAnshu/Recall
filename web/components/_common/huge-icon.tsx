"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export type IconComponent = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export function makeIcon(icon: IconSvgElement): IconComponent {
  return function HIcon({ className, ...props }) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={14}
        strokeWidth={1.5}
        color="currentColor"
        className={cn("size-3.5 shrink-0", className)}
        {...props}
      />
    );
  };
}
