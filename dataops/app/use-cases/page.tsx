"use client";

import Link from "next/link";
import { ArrowRight, ScanSearch } from "lucide-react";
import { PageShell } from "@/components/landing/PageShell";
import { USE_CASES } from "@/components/landing/Sections";
import { Reveal } from "@/components/ui/Reveal";

const DETAIL: Record<string, { kpis: string[]; agents: string }> = {
  retail: { kpis: ["GMV & AOV", "Orders per store", "Stock-out rate", "Delivery SLA", "Repeat rate"], agents: "Cleaner → SQL → Advisor" },
  marketing: { kpis: ["ROAS", "CAC", "CTR & CVR", "New vs returning", "LTV:CAC"], agents: "Marketing → Viz → Advisor" },
  finance: { kpis: ["Revenue variance", "Burn & runway", "Expense mix", "Collections", "Unusual transactions"], agents: "SQL → Anomaly Watch → Advisor" },
  ops: { kpis: ["P90 delivery time", "Throughput", "Late-order rate", "Hub utilisation", "Cost per order"], agents: "Cleaner → Anomaly Watch → Viz" },
  auto: { kpis: ["Avg price by model", "Depreciation curve", "Days to sell", "Fuel mix", "Price per km"], agents: "SQL → Viz → Advisor" },
};

export default function UseCases() {
  return (
    <PageShell eyebrow="Use cases" title={<>One platform. <span className="text-grad">Every data question.</span></>} sub="See how teams use DataOps agents across retail, marketing, finance, operations and automotive.">
      <div className="space-y-5">
        {USE_CASES.map((u, i) => (
          <Reveal key={u.id} delay={i * 0.05}>
            <div className="card grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.1fr_1fr_1fr]">
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]"><u.icon size={22} className="text-lime" /></span>
                <h2 className="mt-4 text-2xl font-semibold text-white">{u.t}</h2>
                <p className="mt-2 text-mute">{u.d}</p>
                <p className="mt-4 font-mono text-xs text-cyan">{DETAIL[u.id].agents}</p>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-mute">KPIs tracked</div>
                <ul className="mt-3 flex flex-wrap gap-2">{DETAIL[u.id].kpis.map((k) => <li key={k} className="chip">{k}</li>)}</ul>
              </div>
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-widest text-mute">Ask</div>
                {u.qs.map((q) => (
                  <Link key={q} href={`/dashboard/assistant?agent=sql&q=${encodeURIComponent(q)}`} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-ink-950/50 px-3 py-2.5 text-sm text-white/85 transition hover:border-lime/30">
                    <ScanSearch size={14} className="shrink-0 text-cyan" /> {q}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link href="/signup" className="btn-primary h-12 px-6">Start free <ArrowRight size={15} /></Link>
      </div>
    </PageShell>
  );
}
