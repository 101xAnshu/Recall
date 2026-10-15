"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import SidebarItem, { sidebarFade } from "@/components/sidebar-item";
import HelpDialog from "@/components/help-dialog";
import Button from "@/components/_ui/button";
import { useUiStore, type NavId } from "@/stores/ui-store";
import { ease } from "@/lib/easings";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/_common/logo";
import type { IconComponent } from "@/components/_common/huge-icon";
import {
  AskHIcon,
  BlastHIcon,
  ExpertsHIcon,
  HelpHIcon,
  ApprovalHIcon,
  MemoryHIcon,
  SidebarCollapseHIcon,
} from "@/components/icons";

export const NAV: { id: NavId; label: string; icon: IconComponent }[] = [
  { id: "ask", label: "Ask", icon: AskHIcon },
  { id: "blast", label: "Blast radius", icon: BlastHIcon },
  { id: "who", label: "Who knows", icon: ExpertsHIcon },
  { id: "approvals", label: "Approvals", icon: ApprovalHIcon },
  { id: "memory", label: "Memory", icon: MemoryHIcon },
];

function SidebarLabel({ collapsed, children }: { collapsed: boolean; children: string }) {
  return (
    <span
      data-collapsed={collapsed}
      className={cn("label-style text-muted-foreground px-2 py-1 whitespace-nowrap", sidebarFade)}
    >
      {children}
    </span>
  );
}

export function SidebarContent({
  nav,
  setNav,
  collapsed,
  onToggle,
  toggleLabel,
  onHelp,
  onOpenHelp,
}: {
  nav: NavId;
  setNav: (nav: NavId) => void;
  collapsed: boolean;
  onToggle: () => void;
  toggleLabel: string;
  onHelp: () => void;
  onOpenHelp: () => void;
}) {
  const openHelp = () => {
    onHelp();
    onOpenHelp();
  };
  return (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border relative h-[62px] shrink-0 border-b">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={onToggle}
            className="group/logo absolute top-4 left-4"
          >
            <span className="relative block size-[30px]">
              <Logo
                aria-hidden
                className="absolute inset-0 size-full transition-opacity duration-150 ease-power2-out group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0"
              />
              <SidebarCollapseHIcon
                aria-hidden
                className="text-muted-foreground absolute inset-0 m-auto size-3.5 opacity-0 transition-opacity duration-150 ease-power2-out group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100"
              />
            </span>
          </Button>
        ) : (
          <>
            <Logo
              role="img"
              aria-label="Meridian"
              className="absolute top-4 left-4 size-[30px]"
            />
            <Button
              variant="secondary"
              size="icon"
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={onToggle}
              className="shadow-ring absolute top-4 left-[214px]"
            >
              <SidebarCollapseHIcon
                aria-hidden
                className="text-icon size-3.5"
              />
            </Button>
          </>
        )}
        <span
          data-collapsed={collapsed}
          className={cn(
            "lead-style absolute top-4 left-[54px] flex h-[30px] items-center whitespace-nowrap",
            sidebarFade
          )}
        >
          Meridian
        </span>
      </div>

      <nav aria-label="Workspace" className="flex flex-col gap-1 p-4">
        <SidebarLabel collapsed={collapsed}>Workspace</SidebarLabel>
        {NAV.map((n) => (
          <SidebarItem
            key={n.id}
            icon={n.icon}
            label={n.label}
            collapsed={collapsed}
            active={nav === n.id}
            onClick={() => setNav(n.id)}
          />
        ))}
      </nav>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto" />

      <div className="flex flex-col p-4">
        <SidebarItem
          label="Connect GitHub"
          collapsed={collapsed}
          className="gap-2"
          onClick={() => window.open("https://github.com", "_blank", "noreferrer")}
        />
        <SidebarItem icon={HelpHIcon} label="Help and resource" collapsed={collapsed} className="gap-2" onClick={openHelp} />
      </div>
    </div>
  );
}

export default function Sidebar({ nav, setNav }: { nav: NavId; setNav: (nav: NavId) => void }) {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const noop = () => {};
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <aside
        className={cn(
          "border-sidebar-border bg-sidebar ease-smooth-in-out hidden h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 lg:flex",
          collapsed ? "w-[60px]" : "w-[260px]"
        )}
      >
        <SidebarContent
          nav={nav}
          setNav={setNav}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onHelp={noop}
          onOpenHelp={() => setHelpOpen(true)}
          toggleLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        />
      </aside>
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setSidebarOpen(false)}
              className="bg-foreground/40 absolute inset-0"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.24, ease: ease.power3Out }}
              className="bg-sidebar shadow-popover absolute inset-y-0 left-0 flex w-[260px] flex-col"
            >
              <SidebarContent
                nav={nav}
                setNav={(id) => {
                  setNav(id);
                  setSidebarOpen(false);
                }}
                collapsed={false}
                onToggle={() => setSidebarOpen(false)}
                onHelp={() => setSidebarOpen(false)}
                onOpenHelp={() => setHelpOpen(true)}
                toggleLabel="Close menu"
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
