"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import Sidebar, { NAV } from "../components/sidebar";
import Button from "../components/_ui/button";
import { useUiStore, type NavId } from "../stores/ui-store";
import { cn } from "../lib/utils";
import {
  ChevronRightHIcon,
  SidebarCollapseHIcon,
  UserHIcon,
} from "../components/icons";

const SLUG: Record<NavId, string> = {
  ask: "ask",
  blast: "blast-radius",
  who: "who-knows",
  approvals: "approvals",
  memory: "memory",
};

const TITLES: Record<NavId, string> = {
  ask: "Ask",
  blast: "Blast radius",
  who: "Who knows",
  approvals: "Approvals",
  memory: "Memory",
};

const ShellCtx = createContext<{
  user: string;
  graphDown: boolean;
}>({ user: "anshu", graphDown: false });

export function useShell() {
  return useContext(ShellCtx);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const seg = pathname.split("/")[1];
  const found = (Object.entries(SLUG) as [NavId, string][]).find(
    ([, slug]) => slug === seg
  );
  const nav: NavId = found ? found[0] : "ask";
  // The landing page is standalone: no sidebar, no header, no employee switcher.
  // Mounting that chrome behind a full-viewport overlay leaves it in the DOM,
  // where it can still be tabbed to, read by a screen reader, or caught by a
  // text selection dragging across the translucent navbar.
  const isLanding = seg === "";
  const [user, setUser] = useState("anshu");
  const [health, setHealth] = useState<"ok" | "down">("ok");
  const [toggling, setToggling] = useState(false);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);

  useEffect(() => {
    // No health polling behind the landing page: nothing there shows it.
    if (isLanding) return;
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
  }, [isLanding]);

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

  const go = (id: NavId) => {
    router.push("/" + SLUG[id]);
  };

  // After every hook, so hook order is identical on both branches.
  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <ShellCtx.Provider value={{ user, graphDown: health === "down" }}>
      <div className="bg-background flex h-dvh w-full overflow-hidden">
        <Sidebar nav={nav} setNav={go} />
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
              <Link href="/ask" className="text-muted-foreground hidden shrink-0 sm:inline">
                Meridian Pay
              </Link>
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
                    {u === "anshu" ? "Anshu" : "Priya"}
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
                  {u === "anshu" ? "Anshu" : "Priya"}
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
              {children}
            </div>
          </main>
        </div>
      </div>
    </ShellCtx.Provider>
  );
}
