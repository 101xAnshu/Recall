"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../lib/api";
import Sidebar, { NAV } from "../components/sidebar";
import Button from "../components/_ui/button";
import AskScreen from "../components/AskScreen";
import BlastScreen from "../components/BlastScreen";
import WhoKnowsScreen from "../components/WhoKnowsScreen";
import ApprovalsScreen from "../components/ApprovalsScreen";
import MemoryScreen from "../components/MemoryScreen";
import { useUiStore, type NavId } from "../stores/ui-store";
import { cn } from "../lib/utils";
import {
  ChevronRightHIcon,
  SidebarCollapseHIcon,
  UserHIcon,
} from "../components/icons";

const TITLES: Record<NavId, string> = {
  ask: "Ask",
  blast: "Blast radius",
  who: "Who knows",
  approvals: "Approvals",
  memory: "Memory",
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export default function Home() {
  const [nav, setNav] = useState<NavId>("ask");
  const [user, setUser] = useState("anshu");
  const [health, setHealth] = useState<"ok" | "down">("ok");
  const [toggling, setToggling] = useState(false);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await api<{ falkordb: "ok" | "down" }>("/health");
        setHealth(h.falkordb);
      } catch {
        setHealth("down");
      }
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, []);

  const mainRef = useRef<HTMLElement>(null);

  const currentNav = NAV.find((n) => n.id === nav) ?? NAV[0];

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [nav]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "[") {
        event.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebarCollapsed]);

  return (
    <div className="bg-background flex h-dvh w-full overflow-hidden">
        <Sidebar nav={nav} setNav={setNav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border flex h-[62px] shrink-0 items-center gap-2 border-b px-4">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <SidebarCollapseHIcon className="size-3.5" aria-hidden />
            </Button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-muted-foreground hidden shrink-0 sm:inline">Meridian Pay</span>
              <ChevronRightHIcon
                aria-hidden
                className="text-muted-foreground hidden size-3.5 shrink-0 sm:block"
              />
              <currentNav.icon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
              <h1 className="min-w-0 truncate">{TITLES[nav]}</h1>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={toggling}
                title="Demo control: simulate a FalkorDB outage and recovery"
                onClick={async () => {
                  setToggling(true);
                  try {
                    await api(
                      health === "ok" ? "/admin/disconnect" : "/admin/reconnect",
                      { method: "POST" }
                    );
                    const h = await api<{ falkordb: "ok" | "down" }>("/health");
                    setHealth(h.falkordb);
                  } catch {
                    setHealth("down");
                  } finally {
                    setToggling(false);
                  }
                }}
                className="hidden sm:inline-flex"
              >
                {health === "ok" ? "Demo: disconnect FalkorDB" : "Demo: reconnect FalkorDB"}
              </Button>
              <span
                className={cn(
                  "shadow-ring hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-[12px] sm:inline-flex",
                  health === "ok" ? "text-success" : "text-danger"
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", health === "ok" ? "bg-success" : "bg-danger")}
                />
                {health === "ok" ? "connected" : "down"}
              </span>
              <div className="divide-border shadow-control hidden shrink-0 divide-x overflow-hidden rounded-[10px] bg-white sm:flex">
                {(["anshu", "priya"] as const).map((u) => (
                  <Button
                    key={u}
                    variant="ghost"
                    size="sm"
                    data-active={user === u}
                    aria-pressed={user === u}
                    onClick={() => setUser(u)}
                    className="rounded-none px-3 capitalize"
                  >
                    <UserHIcon aria-hidden className="size-3.5" />
                    {u}
                  </Button>
                ))}
              </div>
            </div>
          </header>

          {/* mobile employee switcher */}
          <div className="border-border flex items-center gap-2 border-b px-4 py-2 sm:hidden">
            <span className="text-muted-foreground">Employee</span>
            <div className="divide-border shadow-control flex shrink-0 divide-x overflow-hidden rounded-[10px] bg-white">
              {(["anshu", "priya"] as const).map((u) => (
                <Button
                  key={u}
                  variant="ghost"
                  size="sm"
                  data-active={user === u}
                  onClick={() => setUser(u)}
                  className="rounded-none px-3 capitalize"
                >
                  {u}
                </Button>
              ))}
            </div>
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 font-mono text-[12px]",
                health === "ok" ? "text-success" : "text-danger"
              )}
            >
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", health === "ok" ? "bg-success" : "bg-danger")}
              />
              {health === "ok" ? "connected" : "down"}
            </span>
          </div>

          <main ref={mainRef} className="scroll-thin bg-background min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-[960px] flex-col gap-3.5 p-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={nav + user}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex min-h-full w-full flex-col gap-3.5"
                >
              {nav === "ask" && <AskScreen user={user} />}
              {nav === "blast" && <BlastScreen />}
              {nav === "who" && <WhoKnowsScreen />}
              {nav === "approvals" && <ApprovalsScreen user={user} />}
              {nav === "memory" && <MemoryScreen user={user} />}
              </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
  );
}
