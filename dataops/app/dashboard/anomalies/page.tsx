"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BellRing, Mail, MessageSquare, Slack, Sparkles } from "lucide-react";
import { useApp, useActiveDataset } from "@/lib/store";
import { PageHeader, Panel, EmptyData } from "@/components/dash/Shell";
import { TrendArea } from "@/components/charts";
import { detectAnomalies, groupBy, label, timeSeries, fmtShort } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export default function AnomaliesPage() {
  const { rows, profile } = useActiveDataset();
  const { settings, updateSettings } = useApp();
  const [metric, setMetric] = useState<string | undefined>(undefined);
  const [win, setWin] = useState(14);
  const [channels, setChannels] = useState({ email: true, slack: false, whatsapp: false });
  const m = metric ?? profile?.primaryMetric;

  const data = useMemo(() => {
    if (!profile?.primaryDate) return null;
    const series = timeSeries(rows, profile.primaryDate, m, "day");
    const anomalies = detectAnomalies(series, win, settings.anomalyThreshold);
    const set = new Map(anomalies.map((a) => [a.date, a]));
    // root-cause hint: which dimension value moved most on the anomaly date
    const dim = profile.primaryDim;
    const causes = new Map<string, string>();
    if (dim) {
      anomalies.forEach((a) => {
        const day = rows.filter((r) => r[profile.primaryDate!] === a.date);
        const g = groupBy(day, dim, m);
        if (g[0]) causes.set(a.date, `${g[0].name} contributed ${fmtShort(g[0].value)} (${((g[0].value / (a.value || 1)) * 100).toFixed(0)}% of the day)`);
      });
    }
    return {
      series,
      anomalies,
      dots: series.filter((s) => set.has(s.date)).map((s) => ({ x: s.date, y: s.value, kind: set.get(s.date)!.direction })),
      causes,
    };
  }, [rows, profile, m, win, settings.anomalyThreshold]);

  if (!profile) return <EmptyData />;
  if (!data) return <div className="card p-10 text-center text-mute">Anomaly Watch needs a date column. Upload a dataset with dates to enable monitoring.</div>;

  const critical = data.anomalies.filter((a) => a.severity === "critical").length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title={<span className="flex items-center gap-3">Anomaly Watch <span className="rounded-md bg-lime px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-950">NEW</span></span>}
        sub="Robust rolling z-score monitoring on your daily metrics. Spikes and drops are flagged automatically — with a likely cause."
        actions={<Link href={`/dashboard/assistant?agent=advisor&q=${encodeURIComponent("Explain the anomalies in this data and what caused them")}`} className="btn-primary"><Sparkles size={15} /> Explain with AI</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Days monitored", data.series.length, "text-white"],
          ["Anomalies found", data.anomalies.length, "text-amber"],
          ["Critical (|z| ≥ 5)", critical, "text-rose"],
        ].map(([k, v, c]: any) => (
          <div key={k} className="card p-5">
            <div className="text-xs text-mute">{k}</div>
            <div className={cn("mt-2 text-3xl font-semibold tabular-nums", c)}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel
          title={`Daily ${label(m || "rows")}`}
          sub="Amber = spike · Red = drop"
          action={
            <select value={m} onChange={(e) => setMetric(e.target.value)} className="input !w-auto !py-1.5 text-xs">
              {profile.numeric.map((n) => <option key={n} value={n}>{label(n)}</option>)}
            </select>
          }
        >
          <TrendArea data={data.series} xKey="date" name={label(m || "rows")} height={320} anomalies={data.dots} />
        </Panel>

        <Panel title="Detection rules">
          <label className="block text-xs text-mute">
            Sensitivity threshold: <span className="font-mono text-white">{settings.anomalyThreshold.toFixed(1)}σ</span>
            <input type="range" min={1.5} max={4} step={0.1} value={settings.anomalyThreshold} onChange={(e) => updateSettings({ anomalyThreshold: Number(e.target.value) })} className="mt-2 w-full accent-[#C6FF3D]" />
            <span className="flex justify-between text-[10px]"><span>More alerts</span><span>Fewer alerts</span></span>
          </label>
          <label className="mt-5 block text-xs text-mute">
            Baseline window: <span className="font-mono text-white">{win} days</span>
            <input type="range" min={7} max={30} step={1} value={win} onChange={(e) => setWin(Number(e.target.value))} className="mt-2 w-full accent-[#C6FF3D]" />
          </label>
          <div className="mt-6 text-xs text-mute">Notify me via</div>
          <div className="mt-2 space-y-2">
            {[
              ["email", "Email", Mail],
              ["slack", "Slack", Slack],
              ["whatsapp", "WhatsApp", MessageSquare],
            ].map(([k, l, I]: any) => (
              <button key={k} onClick={() => setChannels((c: any) => ({ ...c, [k]: !c[k] }))} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2 text-sm text-white/80">
                <I size={15} className="text-mute" /> {l}
                <span className={cn("relative ml-auto h-5 w-9 rounded-full transition", (channels as any)[k] ? "bg-lime" : "bg-white/10")}>
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", (channels as any)[k] ? "left-[18px]" : "left-0.5")} />
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Alert feed" sub="Newest first">
        <ul className="divide-y divide-white/[0.05]">
          {[...data.anomalies].reverse().map((a) => (
            <li key={a.date} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", a.direction === "spike" ? "bg-amber/10 text-amber" : "bg-rose/10 text-rose")}>
                {a.direction === "spike" ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">
                  {label(m || "value")} {a.direction === "spike" ? "spiked" : "dropped"} <b>{Math.abs((a.value / a.expected - 1) * 100).toFixed(0)}%</b> on {a.date}
                </div>
                <div className="text-xs text-mute">Expected ≈ {fmtShort(a.expected)}, observed {fmtShort(a.value)}{data.causes.get(a.date) ? ` · Top driver: ${data.causes.get(a.date)}` : ""}</div>
              </div>
              <span className={cn("w-fit rounded-md px-2 py-0.5 font-mono text-[11px]", a.severity === "critical" ? "bg-rose/15 text-rose" : "bg-amber/15 text-amber")}>
                {a.severity} · {a.z > 0 ? "+" : ""}{a.z.toFixed(1)}σ
              </span>
            </li>
          ))}
          {!data.anomalies.length && <li className="flex items-center justify-center gap-2 py-10 text-sm text-mute"><BellRing size={15} /> No anomalies at this sensitivity.</li>}
        </ul>
      </Panel>
    </div>
  );
}
