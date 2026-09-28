"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Sparkles, X, Database, Gauge, Rows3, Activity } from "lucide-react";
import { useApp, useActiveDataset } from "@/lib/store";
import { AGENTS } from "@/lib/agents";
import { AgentBadge } from "@/components/ui/AgentIcon";
import { PageHeader, Panel, EmptyData } from "@/components/dash/Shell";
import { Donut, RankedBars, Sparkline, TrendArea } from "@/components/charts";
import { detectAnomalies, groupBy, label, timeSeries, fmtShort } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Overview() {
  const { user, settings } = useApp();
  const { dataset, rows, profile } = useActiveDataset();
  const [welcome, setWelcome] = useState(false);
  const [grain, setGrain] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    if (window.location.search.includes("welcome=1")) setWelcome(true);
  }, []);

  const d = useMemo(() => {
    if (!profile || !rows.length) return null;
    const m = profile.primaryMetric;
    const dt = profile.primaryDate;
    const total = m ? rows.reduce((s, r) => s + (Number(r[m]) || 0), 0) : rows.length;
    let series = dt ? timeSeries(rows, dt, m, grain) : [];
    // drop partial first/last calendar buckets so the trend doesn't fake a dip at the edges
    if (grain === "week" && series.length > 4) series = series.slice(1, -1);
    const weekly = dt ? timeSeries(rows, dt, m, "week") : [];
    const daily = dt ? timeSeries(rows, dt, m, "day") : [];
    // last 7 days vs the 7 before — avoids comparing a partial calendar week
    const lastW = daily.slice(-7).reduce((s, x) => s + x.value, 0);
    const prevW = daily.slice(-14, -7).reduce((s, x) => s + x.value, 0);
    const anomalies = detectAnomalies(daily, 14, settings.anomalyThreshold);
    const byDim = profile.primaryDim ? groupBy(rows, profile.primaryDim, m).slice(0, 8) : [];
    const small = profile.cols.find((c) => c.type === "category" && c.unique >= 2 && c.unique <= 6 && c.name !== profile.primaryDim);
    const share = small ? groupBy(rows, small.name, m) : [];
    const second = [/rating|score|satisf/i, /minutes|time|days|duration/i, /km|distance/i, /price|cost/i].map((re) => profile.numeric.find((n) => n !== m && re.test(n))).find(Boolean) || profile.numeric.find((n) => n !== m);
    const secondCol = profile.cols.find((c) => c.name === second);
    const anomalyByKey = new Map<string, "spike" | "drop">();
    if (grain === "day") anomalies.forEach((a) => anomalyByKey.set(a.date, a.direction));
    return {
      m, dt, total, series, weekly, anomalies, byDim, small, share, secondCol, lastW, prevW,
      spark: weekly.slice(-12).map((x) => x.value),
      anomalyDots: grain === "day" ? series.filter((s) => anomalyByKey.has(s.date)).map((s) => ({ x: s.date, y: s.value, kind: anomalyByKey.get(s.date)! })) : [],
    };
  }, [rows, profile, grain, settings.anomalyThreshold]);

  if (!profile || !d) return <EmptyData />;
  const wow = d.prevW ? (d.lastW - d.prevW) / d.prevW : 0;

  const kpis = [
    { label: d.m ? `Total ${label(d.m)}` : "Rows", value: fmtShort(d.total), icon: Activity, delta: wow, spark: d.spark },
    { label: "Records", value: profile.rows.toLocaleString("en-IN"), icon: Rows3, sub: `${profile.columns} columns` },
    { label: d.secondCol ? `Avg ${label(d.secondCol.name)}` : "Numeric columns", value: d.secondCol ? fmtShort(d.secondCol.mean!) : String(profile.numeric.length), icon: Database, sub: d.secondCol ? `median ${fmtShort(d.secondCol.median!)}` : "" },
    { label: "Data quality", value: `${profile.qualityScore}`, icon: Gauge, sub: `${profile.issues.length} open issues`, quality: profile.qualityScore },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      {welcome && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-glow relative mb-6 flex items-start gap-4 rounded-2xl bg-ink-850 p-5">
          <Sparkles className="mt-0.5 shrink-0 text-lime" size={20} />
          <div>
            <div className="font-medium text-white">Welcome to DataOps, {user?.name.split(" ")[0]}! 🎉</div>
            <p className="mt-1 text-sm text-mute">We’ve loaded the Quick-Commerce sample so you can explore right away. Try asking the Advisor for an executive summary, or upload your own CSV.</p>
          </div>
          <button aria-label="Dismiss" onClick={() => setWelcome(false)} className="ml-auto text-mute hover:text-white"><X size={16} /></button>
        </motion.div>
      )}

      <PageHeader
        title={<>{greet()}, {user?.name.split(" ")[0]}</>}
        sub={<>Here’s what’s happening in <span className="text-white">{dataset?.name}</span>{d.dt && profile.cols.find((c) => c.name === d.dt)?.minDate && <> · {profile.cols.find((c) => c.name === d.dt)!.minDate} → {profile.cols.find((c) => c.name === d.dt)!.maxDate}</>}</>}
        actions={
          <>
            <Link href="/dashboard/reports" className="btn-ghost">Generate report</Link>
            <Link href="/dashboard/assistant" className="btn-primary">Ask AI <ArrowRight size={15} /></Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card relative overflow-hidden p-5">
            <div className="flex items-center justify-between text-xs text-mute">
              {k.label}
              <k.icon size={15} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <div className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-white">
                  {k.value}
                  {k.quality !== undefined && <span className="text-base text-mute">/100</span>}
                </div>
                {k.delta !== undefined ? (
                  <div className={cn("mt-2 inline-flex items-center gap-1 text-xs", k.delta >= 0 ? "text-lime" : "text-rose")}>
                    {k.delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {(Math.abs(k.delta) * 100).toFixed(1)}% <span className="text-mute">vs prior 7 days</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-mute">{k.sub}</div>
                )}
              </div>
              {k.spark && k.spark.length > 1 && <div className="h-10 w-24"><Sparkline data={k.spark} /></div>}
              {k.quality !== undefined && (
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full", k.quality >= 85 ? "bg-lime" : k.quality >= 65 ? "bg-amber" : "bg-rose")} style={{ width: `${k.quality}%` }} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={d.m ? `${label(d.m)} over time` : "Records over time"}
          sub={grain === "day" && d.anomalyDots.length ? `${d.anomalyDots.length} anomalies marked · amber = spike, red = drop` : "Switch to Daily to see anomalies"}
          action={
            <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
              {(["day", "week", "month"] as const).map((g) => (
                <button key={g} onClick={() => setGrain(g)} className={cn("rounded-md px-2.5 py-1 capitalize transition", grain === g ? "bg-white/10 text-white" : "text-mute hover:text-white")}>
                  {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          }
        >
          {d.series.length ? <TrendArea data={d.series} xKey="date" name={d.m ? label(d.m) : "Rows"} height={300} anomalies={d.anomalyDots} /> : <p className="py-20 text-center text-sm text-mute">No date column detected.</p>}
        </Panel>

        <Panel title={d.small ? `Share by ${label(d.small.name)}` : "Composition"} sub={d.m ? `of total ${label(d.m).toLowerCase()}` : undefined}>
          {d.share.length ? <Donut data={d.share.map((s) => ({ name: s.name, value: Math.round(s.value) }))} height={200} /> : <p className="py-20 text-center text-sm text-mute">No low-cardinality column found.</p>}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={profile.primaryDim ? `${d.m ? label(d.m) : "Rows"} by ${label(profile.primaryDim)}` : "Breakdown"} sub="Ranked, highest first">
          {d.byDim.length ? <RankedBars data={d.byDim.map((x) => ({ name: x.name, value: Math.round(x.value) }))} height={Math.max(330, d.byDim.length * 36)} name={d.m ? label(d.m) : "Rows"} /> : <p className="py-16 text-center text-sm text-mute">No categorical column found.</p>}
        </Panel>

        <Panel title="Ask your AI team" sub="One click to a full analysis">
          <div className="space-y-2">
            {AGENTS.map((a) => (
              <Link key={a.id} href={`/dashboard/assistant?agent=${a.id}&q=${encodeURIComponent(a.suggestions[0])}`} className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04]">
                <AgentBadge agent={a} size={34} />
                <div className="min-w-0">
                  <div className="text-sm text-white">{a.short}</div>
                  <div className="truncate text-xs text-mute">{a.suggestions[0]}</div>
                </div>
                <ArrowRight size={15} className="ml-auto shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Data health" sub="Top issues detected by the Cleaner agent" action={<Link href="/dashboard/datasets" className="text-xs text-lime hover:underline">Fix issues →</Link>}>
          <ul className="space-y-2">
            {profile.issues.slice(0, 5).map((i) => (
              <li key={i.title} className="flex items-start gap-3 rounded-xl bg-white/[0.02] p-3 text-sm">
                <span className={cn("mt-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase", i.severity === "high" ? "bg-rose/15 text-rose" : i.severity === "medium" ? "bg-amber/15 text-amber" : "bg-white/10 text-white/60")}>{i.severity}</span>
                <div>
                  <div className="text-white/90">{i.title}</div>
                  <div className="text-xs text-mute">{i.fix}</div>
                </div>
              </li>
            ))}
            {!profile.issues.length && <li className="py-8 text-center text-sm text-lime">✓ This dataset is clean.</li>}
          </ul>
        </Panel>
        <Panel title="Recent anomalies" sub={`Rolling 14-day z-score · threshold ${settings.anomalyThreshold}σ`} action={<Link href="/dashboard/anomalies" className="text-xs text-lime hover:underline">Open Anomaly Watch →</Link>}>
          <ul className="space-y-2">
            {d.anomalies.slice(-5).reverse().map((a) => (
              <li key={a.date} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3 text-sm">
                {a.direction === "spike" ? <ArrowUpRight size={16} className="text-amber" /> : <ArrowDownRight size={16} className="text-rose" />}
                <span className="text-white/90">{a.date}</span>
                <span className="text-mute">{a.direction === "spike" ? "spike" : "drop"} · expected {fmtShort(a.expected)}, got {fmtShort(a.value)}</span>
                <span className={cn("ml-auto font-mono text-xs", a.severity === "critical" ? "text-rose" : "text-amber")}>{a.z > 0 ? "+" : ""}{a.z.toFixed(1)}σ</span>
              </li>
            ))}
            {!d.anomalies.length && <li className="py-8 text-center text-sm text-mute">No anomalies at the current threshold.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
