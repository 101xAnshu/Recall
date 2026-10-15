import type { ReactNode } from "react";
import Button from "@/components/_ui/button";
import { cn } from "@/lib/utils";
import type { IconComponent } from "./_common/huge-icon";

type SidebarItemProps = {
  icon?: IconComponent;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
};

export const sidebarFade =
  "transition-opacity duration-150 ease-power2-out data-[collapsed=true]:opacity-0 data-[collapsed=false]:delay-100";

export default function SidebarItem({
  icon: Icon,
  label,
  active = false,
  collapsed = false,
  onClick,
  trailing,
  className,
}: SidebarItemProps) {
  return (
    <Button
      variant="ghost"
      size="md"
      data-active={active}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={cn(
        "group/item w-full justify-start gap-1.5 px-2",
        className,
        collapsed && "justify-center gap-0 px-0"
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 transition-colors duration-150",
            active
              ? "text-foreground"
              : "text-icon group-hover/item:text-muted-foreground"
          )}
        />
      )}
      <span
        data-collapsed={collapsed}
        className={cn(
          "overflow-hidden text-left whitespace-nowrap",
          collapsed ? "w-0 flex-none px-0" : "min-w-0 flex-1 px-0.5",
          sidebarFade
        )}
      >
        {label}
      </span>
      {trailing && (
        <span
          data-collapsed={collapsed}
          className={cn(
            "shrink-0 items-center",
            collapsed ? "hidden" : "flex",
            sidebarFade
          )}
        >
          {trailing}
        </span>
      )}
    </Button>
  );
}
