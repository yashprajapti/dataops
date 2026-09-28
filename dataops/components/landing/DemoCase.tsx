"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { getSample } from "@/lib/sample-data";
import { groupBy, profileDataset, timeSeries, detectAnomalies } from "@/lib/analytics";
import { fmtINR } from "@/lib/utils";
import { SectionHeading, Reveal } from "@/components/ui/Reveal";
import { RankedBars, TrendArea } from "@/components/charts";

export function DemoCase() {
  const data = useMemo(() => {
    const rows = getSample("quick-commerce");
    const p = profileDataset(rows);
    const revenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);
    const weekly = timeSeries(rows, "order_date", "revenue", "week").map((d) => ({ name: d.date.slice(5), value: Math.round(d.value) }));
    const daily = timeSeries(rows, "order_date", "revenue", "day");
    const anomalies = detectAnomalies(daily);
    const byCity = groupBy(rows.map((r) => ({ ...r, city: r.city ? r.city[0] + r.city.slice(1).toLowerCase() : "Unknown" })), "city", "revenue").slice(0, 6).map((d) => ({ name: d.name, value: Math.round(d.value) }));
    const ratings = rows.filter((r) => r.rating != null);
    return { rows: rows.length, p, revenue, weekly, anomalies, byCity, avgRating: ratings.reduce((s, r) => s + r.rating, 0) / ratings.length };
  }, []);

  return (
    <section id="demo" className="py-28">
      <div className="container-x">
        <SectionHeading eyebrow="Live case study" title={<>Real data. <span className="text-grad">Real answers.</span></>} sub="This section is computed live, in your browser, from our Quick-Commerce Orders sample — the same engine that powers the app." />
        <Reveal className="mt-14">
          <div className="border-glow rounded-3xl bg-ink-900/80 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-mute">quick_commerce_orders.csv</div>
                <h3 className="mt-1 text-xl font-semibold text-white">Grocery delivery across 8 Indian cities · Oct 2025 – Mar 2026</h3>
              </div>
              <Link href="/demo" className="btn-primary">
                Open in the app <ArrowRight size={15} />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Revenue", fmtINR(data.revenue)],
                ["Orders", data.rows.toLocaleString("en-IN")],
                ["Quality score", `${data.p.qualityScore}/100`],
                ["Anomalies flagged", String(data.anomalies.length)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/[0.06] bg-ink-950/60 p-4">
                  <div className="text-xs text-mute">{k}</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/[0.06] bg-ink-950/60 p-4 lg:col-span-3">
                <div className="mb-2 text-sm font-medium text-white">Weekly revenue</div>
                <TrendArea data={data.weekly} height={240} name="Revenue" />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-ink-950/60 p-4 lg:col-span-2">
                <div className="mb-2 text-sm font-medium text-white">Revenue by city</div>
                <RankedBars data={data.byCity} height={240} name="Revenue" />
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber/[0.05] p-4 text-sm">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-amber" />
              <p className="text-white/80">
                <b className="text-white">Advisor:</b> Revenue grew steadily through the period, with a Republic Day spike on 26 Jan and a 3-day drop from 18–20 Feb that Anomaly Watch flagged. Average rating is {data.avgRating.toFixed(2)}★ — slower deliveries pull it down, so fixing SLA in the slowest cities is the fastest win.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
