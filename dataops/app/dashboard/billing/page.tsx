"use client";

import { useState } from "react";
import { Check, Zap, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader, Panel } from "@/components/dash/Shell";
import { cn } from "@/lib/utils";

const PLANS = [
  { name: "Starter" as const, price: "₹0", sub: "Free forever", f: ["15 dataset uploads", "All 5 AI agents", "Excel + SQL + PDF reports"] },
  { name: "Pro" as const, price: "₹639", sub: "per month, billed yearly", f: ["Unlimited datasets", "Unlimited AI questions", "Anomaly alerts & PDF reports"] },
  { name: "Enterprise" as const, price: "Custom", sub: "annual contract", f: ["SSO & RBAC", "Warehouse connectors", "Private LLM"] },
];

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const p = limit ? Math.min(100, (used / limit) * 100) : 8;
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-white/80">{label}</span><span className="tabular-nums text-mute">{used.toLocaleString("en-IN")} / {limit ? limit.toLocaleString("en-IN") : "∞"}</span></div>
      <div className="mt-2 h-2 rounded-full bg-white/5"><div className={cn("h-full rounded-full", p > 85 ? "bg-rose" : p > 60 ? "bg-amber" : "bg-lime")} style={{ width: `${p}%` }} /></div>
    </div>
  );
}

export default function BillingPage() {
  const { user, updateUser, usage, uploadsUsed, uploadLimit, mode } = useApp();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  if (!user) return null;
  const pro = user.plan !== "Starter";

  function choose(p: (typeof PLANS)[number]["name"]) {
    if (p === "Enterprise") { window.location.href = "mailto:hello@dataops.app?subject=DataOps%20Enterprise"; return; }
    if (mode === "cloud") {
      // real accounts: plans are changed by the owner in Supabase until online payments are connected
      setNote("Online payments aren’t live yet. We’ve opened an email to request the upgrade — your plan is switched within a day.");
      window.location.href = `mailto:hello@dataops.app?subject=${encodeURIComponent(`DataOps ${p} upgrade`)}&body=${encodeURIComponent(`Please upgrade my account (${user!.email}) to ${p}.`)}`;
      return;
    }
    setBusy(p);
    setTimeout(() => { updateUser({ plan: p }); setBusy(null); }, 900);
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Plan & Usage" sub="Manage your subscription and see how much of your plan you’ve used." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Current plan">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime/15"><Zap size={18} className="text-lime" /></span>
            <div>
              <div className="text-xl font-semibold text-white">{user.plan}</div>
              <div className="text-xs text-mute">{pro ? "Renews on the 1st of next month" : "Free forever — upgrade anytime"}</div>
            </div>
          </div>
        </Panel>
        <Panel title="This month’s usage">
          <div className="space-y-4">
            <Meter label="Dataset uploads (lifetime)" used={uploadsUsed} limit={Number.isFinite(uploadLimit) ? uploadLimit : null} />
            <Meter label="AI questions" used={usage.queries} limit={pro ? null : 1500} />
            <Meter label="AI tokens" used={usage.tokens} limit={pro ? null : 200000} />
          </div>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = p.name === user.plan;
          return (
            <div key={p.name} className={cn("flex flex-col rounded-2xl p-6", current ? "border-glow bg-ink-800" : "card")}>
              <div className="flex items-center justify-between"><h3 className="font-semibold text-white">{p.name}</h3>{current && <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-semibold text-ink-950">CURRENT</span>}</div>
              <div className="mt-4 text-3xl font-semibold text-white">{p.price}</div>
              <div className="text-xs text-mute">{p.sub}</div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">{p.f.map((f) => <li key={f} className="flex gap-2 text-white/80"><Check size={15} className="mt-0.5 text-lime" />{f}</li>)}</ul>
              <button disabled={current || !!busy} onClick={() => choose(p.name)} className={cn("mt-6", current ? "btn-ghost" : "btn-primary")}>
                {busy === p.name ? <Loader2 size={15} className="animate-spin" /> : current ? "Current plan" : p.name === "Enterprise" ? "Contact sales" : p.name === "Starter" ? "Downgrade" : "Upgrade to Pro"}
              </button>
            </div>
          );
        })}
      </div>
      {note && <p className="mt-4 rounded-xl border border-lime/30 bg-lime/10 p-3 text-center text-sm text-lime">{note}</p>}
      <p className="mt-4 text-center text-xs text-mute">{mode === "cloud" ? "Online payments are not connected yet — upgrades are applied manually." : "Demo workspace — plan changes are simulated."}</p>
    </div>
  );
}
