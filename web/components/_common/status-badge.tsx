import { cn } from "@/lib/utils";
import type { IconComponent } from "./huge-icon";

type Props = {
  icon: IconComponent;
  tone?: "info" | "success" | "danger" | "neutral";
  className?: string;
};

const TONES: Record<string, string> = {
  info: "bg-info/[0.08] text-info",
  success: "bg-success/[0.1] text-success",
  danger: "bg-danger/[0.08] text-danger",
  neutral: "bg-muted text-muted-foreground",
};

export default function StatusBadge({ icon: Icon, tone = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "flex size-[30px] shrink-0 items-center justify-center rounded-[10px]",
        TONES[tone],
        className
      )}
    >
      <Icon aria-hidden className="size-3.5" />
    </span>
  );
}
