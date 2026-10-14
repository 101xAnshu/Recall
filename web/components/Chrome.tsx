"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { EmployeeProvider, employeeName, useEmployee } from "../lib/employee";

const NAV = [
  { href: "/ask", label: "Ask" },
  { href: "/blast-radius", label: "Blast radius" },
  { href: "/who-knows", label: "Who knows" },
  { href: "/approvals", label: "Approvals" },
  { href: "/memory", label: "Memory" },
];

const TITLES: Record<string, string> = {
  "/ask": "Ask",
  "/blast-radius": "Blast radius",
  "/who-knows": "Who knows",
  "/approvals": "Approvals",
  "/memory": "Memory",
};

function Pill({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs ${
        up ? "text-green-700" : "text-red-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${up ? "bg-green-600" : "bg-red-600"}`}
      />
      {up ? "connected" : "down"}
    </span>
  );
}

function Topbar() {
  const pathname = usePathname();
  const { user, setUser } = useEmployee();
  const [up, setUp] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const h = await api.health();
      setUp(h.falkordb === "ok");
    } catch {
      setUp(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      if (up) await api.disconnect();
      else await api.reconnect();
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-hairline bg-white px-6 py-3">
      <div className="text-sm text-muted">
        Meridian Pay <span className="mx-1">›</span>
        <span className="text-ink">{TITLES[pathname] ?? ""}</span>
      </div>
      <div className="flex items-center gap-3">
        <Pill up={up} />
        <button
          onClick={toggle}
          disabled={busy}
          title="Demo control: simulate a FalkorDB outage and recovery"
          className="rounded-full border border-hairline px-3 py-1 text-xs text-muted hover:text-ink disabled:opacity-50"
        >
          {up ? "Demo: disconnect FalkorDB" : "Demo: reconnect FalkorDB"}
        </button>
        <div className="flex overflow-hidden rounded-full border border-hairline text-xs">
          {(["anshu", "priya"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUser(u)}
              className={`px-3 py-1 ${
                user === u ? "bg-ink text-white" : "text-muted"
              }`}
            >
              {employeeName(u)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-hairline bg-white">
      <div className="border-b border-hairline px-5 py-4">
        <div className="text-lg font-semibold">Meridian</div>
        <div className="text-xs text-muted">Company memory</div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <div className="px-2 pb-2 text-[11px] uppercase tracking-wide text-muted">
          Screens
        </div>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`mb-1 block rounded-[18px] px-3 py-2 text-sm ${
              pathname === n.href
                ? "bg-wash font-medium text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-hairline px-5 py-4 text-sm">
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="mb-2 block text-muted hover:text-ink"
        >
          Connect GitHub
        </a>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="block text-muted hover:text-ink"
        >
          Help
        </a>
      </div>
    </aside>
  );
}

export function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <EmployeeProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </EmployeeProvider>
  );
}
