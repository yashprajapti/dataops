"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Bot, Terminal, Database, BellRing, FileText, UserRound, Settings, CreditCard, LogOut,
  Search, ChevronDown, PanelLeftClose, PanelLeft, Menu, X, Command, Check, Sparkles, ArrowRight,
  Cloud, CloudOff, Loader2, HardDrive,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { useApp, useActiveDataset } from "@/lib/store";
import { AGENTS } from "@/lib/agents";
import { detectAnomalies, timeSeries } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const NAV = [
  { group: "Workspace", items: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/assistant", label: "AI Agents", icon: Bot, badge: "5" },
    { href: "/dashboard/sql", label: "SQL Studio", icon: Terminal },
    { href: "/dashboard/datasets", label: "Datasets", icon: Database },
    { href: "/dashboard/anomalies", label: "Anomaly Watch", icon: BellRing, badge: "NEW" },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
  ]},
  { group: "Account", items: [
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
    { href: "/dashboard/billing", label: "Plan & Usage", icon: CreditCard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]},
];

function NavList({ collapsed, onNav }: { collapsed?: boolean; onNav?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group}>
          {!collapsed && <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-mute/70">{g.group}</div>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.href === "/dashboard" ? path === it.href : path.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNav}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition",
                      active ? "bg-white/[0.07] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {active && <motion.span layoutId="navActive" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-lime" />}
                    <it.icon size={17} className={active ? "text-lime" : ""} />
                    {!collapsed && <span className="flex-1">{it.label}</span>}
                    {!collapsed && it.badge && (
                      <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-semibold", it.badge === "NEW" ? "bg-lime/15 text-lime" : "bg-white/10 text-white/60")}>{it.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function DatasetSwitcher() {
  const { datasets, activeId, setActive } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = datasets.find((d) => d.id === activeId) || datasets[0];
  useEffect(() => {
    const on = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex max-w-[240px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white transition hover:border-white/20">
        <Database size={14} className="shrink-0 text-cyan" />
        <span className="truncate">{active?.name ?? "No dataset"}</span>
        <ChevronDown size={14} className="shrink-0 text-mute" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-white/10 bg-ink-850 p-2 shadow-2xl">
            <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-mute">Switch dataset</div>
            {datasets.map((d) => (
              <button key={d.id} onClick={() => { setActive(d.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/85 hover:bg-white/5">
                <span className="truncate">{d.name}</span>
                {d.cleaned && <span className="rounded bg-lime/15 px-1.5 text-[10px] text-lime">clean</span>}
                {d.id === active?.id && <Check size={14} className="ml-auto text-lime" />}
              </button>
            ))}
            <Link href="/dashboard/datasets" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg border-t border-white/5 px-2 py-2 text-sm text-lime hover:bg-white/5">
              + Upload or add a dataset
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const items = useMemo(
    () => [
      ...NAV.flatMap((g) => g.items.map((i) => ({ label: `Go to ${i.label}`, hint: "Navigate", run: () => router.push(i.href) }))),
      ...AGENTS.map((a) => ({ label: `Ask ${a.name}`, hint: a.role, run: () => router.push(`/dashboard/assistant?agent=${a.id}`) })),
      { label: "Upload a CSV", hint: "Datasets", run: () => router.push("/dashboard/datasets") },
      { label: "Generate executive report", hint: "Reports", run: () => router.push("/dashboard/reports") },
    ],
    [router]
  );
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  const [sel, setSel] = useState(0);
  useEffect(() => { setSel(0); }, [q, open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-start bg-black/60 px-4 pt-[15vh] backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.97, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }} onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
              <Search size={17} className="text-mute" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
                  if (e.key === "Enter" && filtered[sel]) { filtered[sel].run(); onClose(); }
                  if (e.key === "Escape") onClose();
                }}
                placeholder="Search pages, agents, actions…"
                className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-mute"
              />
              <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-mute">ESC</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {filtered.map((i, k) => (
                <li key={i.label}>
                  <button onMouseEnter={() => setSel(k)} onClick={() => { i.run(); onClose(); }} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm", k === sel ? "bg-white/[0.07] text-white" : "text-white/70")}>
                    <ArrowRight size={14} className={k === sel ? "text-lime" : "text-mute"} />
                    {i.label}
                    <span className="ml-auto text-xs text-mute">{i.hint}</span>
                  </button>
                </li>
              ))}
              {!filtered.length && <li className="px-3 py-6 text-center text-sm text-mute">No results</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Notifications() {
  const { rows, profile } = useActiveDataset();
  const [open, setOpen] = useState(false);
  const anomalies = useMemo(() => {
    if (!profile?.primaryDate || !profile.primaryMetric) return [];
    return detectAnomalies(timeSeries(rows, profile.primaryDate, profile.primaryMetric, "day")).slice(-5).reverse();
  }, [rows, profile]);
  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen((o) => !o)} className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 hover:text-white">
        <BellRing size={16} />
        {anomalies.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">{anomalies.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-white/10 bg-ink-850 p-2 shadow-2xl">
            <div className="flex items-center justify-between px-2 py-1.5 text-xs text-mute">
              <span>Anomaly alerts</span>
              <Link href="/dashboard/anomalies" onClick={() => setOpen(false)} className="text-lime">View all</Link>
            </div>
            {anomalies.length ? anomalies.map((a) => (
              <div key={a.date} className="flex gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/5">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.direction === "spike" ? "bg-amber" : "bg-rose")} />
                <div>
                  <div className="text-white/90">{a.direction === "spike" ? "Spike" : "Drop"} in {profile?.primaryMetric} · {((a.value / a.expected - 1) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-mute">{a.date} · z = {a.z.toFixed(1)}</div>
                </div>
              </div>
            )) : <div className="px-2 py-6 text-center text-sm text-mute">All quiet. No anomalies.</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SyncBadge() {
  const { mode, sync, syncError, cloudEnabled } = useApp();
  if (mode === "local") {
    return (
      <span title={cloudEnabled ? "Demo workspace — saved in this browser only. Sign up to save to the cloud." : "Browser-only mode — add Supabase keys to enable cloud accounts."} className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-mute sm:flex">
        <HardDrive size={12} /> Local
      </span>
    );
  }
  const map = {
    idle: [Cloud, "Synced", "text-mute"],
    saved: [Cloud, "Synced", "text-lime"],
    saving: [Loader2, "Saving…", "text-cyan"],
    error: [CloudOff, "Sync error", "text-rose"],
  } as const;
  const [I, label, color] = map[sync];
  return (
    <span title={syncError || "Your workspace is saved to your account"} className={cn("hidden items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-[11px] sm:flex", color)}>
      <I size={12} className={sync === "saving" ? "animate-spin" : ""} /> {label}
    </span>
  );
}

function UserMenu() {
  const { user, logout } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-white/5">
        <Avatar seed={user.avatarSeed} name={user.name} src={user.avatarUrl} className="h-8 w-8" />
        <ChevronDown size={14} className="hidden text-mute sm:block" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-white/10 bg-ink-850 p-2 shadow-2xl" onMouseLeave={() => setOpen(false)}>
            <div className="px-3 py-2">
              <div className="truncate text-sm font-medium text-white">{user.name}</div>
              <div className="truncate text-xs text-mute">{user.email}</div>
              <span className="mt-2 inline-block rounded-md bg-lime/15 px-2 py-0.5 text-[10px] font-semibold text-lime">{user.plan.toUpperCase()} PLAN</span>
            </div>
            <div className="my-1 h-px bg-white/5" />
            {[["Profile", "/dashboard/profile", UserRound], ["Plan & Usage", "/dashboard/billing", CreditCard], ["Settings", "/dashboard/settings", Settings]].map(([l, h, I]: any) => (
              <Link key={l} href={h} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white">
                <I size={15} /> {l}
              </Link>
            ))}
            <div className="my-1 h-px bg-white/5" />
            <button onClick={async () => { await logout(); window.location.assign("/"); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose/90 hover:bg-rose/10">
              <LogOut size={15} /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { ready, user } = useApp();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LogoMark className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/60 backdrop-blur transition-[width] duration-300 lg:flex", collapsed ? "w-[76px]" : "w-64")}>
        <div className={cn("flex h-16 items-center border-b border-white/[0.06] px-5", collapsed && "justify-center px-0")}>
          {collapsed ? <LogoMark /> : <Logo href="/dashboard" />}
        </div>
        <NavList collapsed={collapsed} />
        {!collapsed && user.plan === "Starter" && (
          <div className="m-3 rounded-2xl border border-lime/20 bg-gradient-to-br from-lime/[0.08] to-transparent p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><Sparkles size={15} className="text-lime" /> Go Pro</div>
            <p className="mt-1 text-xs text-mute">Unlimited datasets, anomaly alerts and PDF reports.</p>
            <Link href="/dashboard/billing" className="btn-primary mt-3 w-full !py-1.5 text-xs">Upgrade</Link>
          </div>
        )}
        <button onClick={() => setCollapsed((c) => !c)} className="m-3 flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] py-2 text-xs text-mute hover:text-white">
          {collapsed ? <PanelLeft size={15} /> : <><PanelLeftClose size={15} /> Collapse</>}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobile && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-ink-900">
              <div className="flex h-16 items-center justify-between px-5">
                <Logo href="/dashboard" />
                <button aria-label="Close menu" onClick={() => setMobile(false)}><X size={20} /></button>
              </div>
              <NavList onNav={() => setMobile(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-950/75 px-4 backdrop-blur-xl sm:px-6">
          <button aria-label="Open menu" onClick={() => setMobile(true)} className="lg:hidden"><Menu size={20} /></button>
          <DatasetSwitcher />
          <button onClick={() => setPalette(true)} className="ml-auto hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-mute transition hover:text-white md:flex md:w-64">
            <Search size={14} /> Search or jump to…
            <kbd className="ml-auto flex items-center gap-0.5 rounded border border-white/10 px-1.5 font-mono text-[10px]"><Command size={10} />K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <SyncBadge />
            <Notifications />
            <UserMenu />
          </div>
        </header>
        <SyncErrorBanner />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

function SyncErrorBanner() {
  const { sync, syncError, mode } = useApp();
  if (mode !== "cloud" || sync !== "error" || !syncError) return null;
  return (
    <div className="flex items-center gap-2 border-b border-rose/20 bg-rose/[0.07] px-6 py-2 text-xs text-rose">
      <CloudOff size={13} /> {syncError}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, sub, action, children, className }: { title?: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-medium text-white">{title}</h3>}
            {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyData() {
  const { loading } = useActiveDataset();
  if (loading)
    return (
      <div className="card grid place-items-center p-12 text-center">
        <Loader2 size={26} className="animate-spin text-lime" />
        <p className="mt-3 text-sm text-mute">Loading your dataset from the cloud…</p>
      </div>
    );
  return (
    <div className="card grid place-items-center p-12 text-center">
      <Database size={28} className="text-mute" />
      <h3 className="mt-3 font-medium text-white">No dataset loaded</h3>
      <p className="mt-1 max-w-sm text-sm text-mute">Upload a CSV or load a sample dataset to get started.</p>
      <Link href="/dashboard/datasets" className="btn-primary mt-5">Go to Datasets</Link>
    </div>
  );
}
