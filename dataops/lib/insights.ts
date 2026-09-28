/**
 * Dataset-agnostic insight engine: turns any table into KPIs, findings and a
 * full dashboard of charts. Used by the agents, the Overview and the Report.
 */
import type { Row } from "./sample-data";
import { correlation, detectAnomalies, fmtShort, groupBy, label, timeSeries, type DatasetProfile } from "./analytics";
import { aggFor, aggLabel, categoricalCols, isMoney, numericCols, yearColumn } from "./semantics";

export interface ChartSpec {
  type: "bar" | "line" | "area" | "donut" | "hist" | "scatter";
  title: string;
  subtitle?: string;
  data?: { name: string; value: number }[];
  points?: { x: number; y: number; label?: string }[];
  xLabel?: string;
  yLabel?: string;
  valueLabel?: string;
  money?: boolean;
}

export const money = (n: number, isM: boolean) => (isM ? "₹" : "") + fmtShort(n);

/** Aggregate a metric by a dimension using the right aggregation (sum vs avg) */
export function metricBy(rows: Row[], dim: string, metric?: string, agg?: "sum" | "avg" | "count") {
  const a = agg || (metric ? aggFor(metric) : "count");
  return groupBy(rows, dim, a === "count" ? undefined : metric, a === "count" ? "count" : a);
}

/** Series over time: real dates by month, else a year-like column */
export function trendSeries(rows: Row[], p: DatasetProfile, metric?: string) {
  const agg = metric ? aggFor(metric) : "count";
  if (p.primaryDate) {
    const s = timeSeries(rows, p.primaryDate, agg === "sum" ? metric : undefined, "month");
    if (agg === "avg" && metric) {
      const cnt = new Map(timeSeries(rows, p.primaryDate, undefined, "month").map((x) => [x.date, x.value]));
      const sum = timeSeries(rows, p.primaryDate, metric, "month");
      return { axis: "Month", data: sum.map((x) => ({ name: x.date, value: x.value / (cnt.get(x.date) || 1) })) };
    }
    return { axis: "Month", data: s.map((x) => ({ name: x.date, value: x.value })) };
  }
  const y = yearColumn(p);
  if (y) {
    const g = groupBy(rows, y, agg === "count" ? undefined : metric, agg === "count" ? "count" : agg).sort((a, b) => Number(a.name) - Number(b.name));
    return { axis: label(y), data: g.filter((x) => x.name !== "Unknown").map((x) => ({ name: x.name, value: x.value })) };
  }
  return null;
}

export function histogramOf(rows: Row[], col: string, bins = 12) {
  const nums = rows.map((r) => Number(r[col])).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return [];
  const lo = nums[0];
  const hi = nums[Math.floor((nums.length - 1) * 0.99)];
  const w = (hi - lo) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({ name: fmtShort(lo + i * w), value: 0 }));
  nums.forEach((v) => (out[Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)))].value += 1));
  return out;
}

export function scatterOf(rows: Row[], x: string, y: string, labelCol?: string, max = 600) {
  const pts = rows
    .map((r) => ({ x: Number(r[x]), y: Number(r[y]), label: labelCol ? String(r[labelCol] ?? "") : undefined }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length <= max) return pts;
  const step = pts.length / max;
  return Array.from({ length: max }, (_, i) => pts[Math.floor(i * step)]);
}

export function topCorrelations(rows: Row[], p: DatasetProfile, n = 5) {
  const nums = numericCols(p).map((c) => c.name).slice(0, 10);
  const out: { a: string; b: string; r: number }[] = [];
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
    const r = correlation(rows, nums[i], nums[j]);
    if (Number.isFinite(r)) out.push({ a: nums[i], b: nums[j], r });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, n);
}

export function strength(r: number) {
  const a = Math.abs(r);
  const s = a >= 0.7 ? "strong" : a >= 0.4 ? "moderate" : a >= 0.2 ? "weak" : "no meaningful";
  return a < 0.2 ? s : `${s} ${r > 0 ? "positive" : "negative"}`;
}

/** Quantile bands (budget / mid / premium) of a metric */
export function bands(rows: Row[], metric: string) {
  const v = rows.map((r) => Number(r[metric])).filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length < 6) return null;
  const q1 = v[Math.floor(v.length / 3)], q2 = v[Math.floor((2 * v.length) / 3)];
  return { q1, q2, label: (x: number) => (x <= q1 ? "Budget" : x <= q2 ? "Mid-range" : "Premium") };
}

export interface Insights {
  metric?: string;
  metricAgg: "sum" | "avg" | "count";
  money: boolean;
  dim?: string;
  dim2?: string;
  kpis: { label: string; value: string; sub?: string }[];
  byDim: { name: string; value: number; share: number }[];
  countByDim: { name: string; value: number; share: number }[];
  trend: { axis: string; data: { name: string; value: number }[]; change?: number } | null;
  correlations: { a: string; b: string; r: number }[];
  anomalies: number;
  findings: string[];
}

export function computeInsights(rows: Row[], p: DatasetProfile): Insights {
  const metric = p.primaryMetric;
  const metricAgg = metric ? aggFor(metric) : "count";
  const m = isMoney(metric);
  const cats = categoricalCols(p);
  const dim = p.primaryDim && cats.some((c) => c.name === p.primaryDim) ? p.primaryDim : cats[0]?.name;
  const dim2 = cats.find((c) => c.name !== dim && c.unique <= 12)?.name;
  const total = metric ? rows.reduce((s, r) => s + (Number(r[metric]) || 0), 0) : rows.length;
  const avg = metric ? total / Math.max(1, rows.filter((r) => Number.isFinite(Number(r[metric]))).length) : 0;

  const withShare = (g: { name: string; value: number }[], denom: number) => g.map((x) => ({ ...x, share: x.value / (denom || 1) }));
  const byDimRaw = dim ? metricBy(rows, dim, metric).filter((x) => x.name !== "Unknown") : [];
  const byDim = withShare(byDimRaw, metricAgg === "sum" ? total : byDimRaw.reduce((s, x) => s + x.value, 0));
  const countByDim = dim ? withShare(groupBy(rows, dim, undefined, "count").filter((x) => x.name !== "Unknown"), rows.length) : [];

  const tr = trendSeries(rows, p, metric);
  let trend: Insights["trend"] = null;
  if (tr && tr.data.length >= 2) {
    const half = Math.floor(tr.data.length / 2);
    const a = tr.data.slice(0, half).reduce((s, x) => s + x.value, 0) / half;
    const b = tr.data.slice(half).reduce((s, x) => s + x.value, 0) / (tr.data.length - half);
    trend = { ...tr, change: a ? (b - a) / a : undefined };
  }
  const correlations = topCorrelations(rows, p);
  const anomalies = p.primaryDate && metric ? detectAnomalies(timeSeries(rows, p.primaryDate, metric, "day")).length : 0;

  const kpis: Insights["kpis"] = [{ label: "Records", value: rows.length.toLocaleString("en-IN"), sub: `${p.columns} columns` }];
  if (metric) {
    kpis.push({ label: `${metricAgg === "sum" ? "Total" : "Average"} ${label(metric)}`, value: money(metricAgg === "sum" ? total : avg, m), sub: metricAgg === "sum" ? `avg ${money(avg, m)} per row` : `median ${money(p.cols.find((c) => c.name === metric)?.median ?? 0, m)}` });
    const c = p.cols.find((x) => x.name === metric)!;
    kpis.push({ label: `${label(metric)} range`, value: `${money(c.min!, m)} – ${money(c.max!, m)}`, sub: `σ ${money(c.std!, m)}` });
  }
  if (dim) kpis.push({ label: `Distinct ${label(dim)}`, value: String(p.cols.find((c) => c.name === dim)?.unique ?? "—"), sub: countByDim[0] ? `most common: ${countByDim[0].name}` : undefined });
  kpis.push({ label: "Data quality", value: `${p.qualityScore}/100`, sub: `${p.issues.length} open issue${p.issues.length === 1 ? "" : "s"}` });

  const findings: string[] = [];
  if (metric && byDim.length >= 2) {
    const top = byDim[0], bot = byDim[byDim.length - 1];
    findings.push(
      metricAgg === "sum"
        ? `**${top.name}** leads ${label(dim!).toLowerCase()} with ${money(top.value, m)} (${(top.share * 100).toFixed(1)}% of total ${label(metric).toLowerCase()}); **${bot.name}** is lowest at ${money(bot.value, m)}.`
        : `**${top.name}** has the highest average ${label(metric).toLowerCase()} (${money(top.value, m)}), ${(top.value / (bot.value || 1)).toFixed(1)}× the lowest (**${bot.name}**, ${money(bot.value, m)}).`
    );
  }
  if (countByDim.length >= 2) findings.push(`**${countByDim[0].name}** is the most common ${label(dim!).toLowerCase()} — ${countByDim[0].value.toLocaleString("en-IN")} records (${(countByDim[0].share * 100).toFixed(1)}%).`);
  if (trend?.change !== undefined)
    findings.push(
      trend.axis === "Month"
        ? `${label(metric || "records")} is **${trend.change >= 0 ? "up" : "down"} ${(Math.abs(trend.change) * 100).toFixed(1)}%** in the later half of the period vs the earlier half.`
        : `Records with a more recent **${trend.axis.toLowerCase()}** have ${metric ? `${aggLabel(metric).toLowerCase()} ${label(metric).toLowerCase()}` : "counts"} **${(Math.abs(trend.change) * 100).toFixed(0)}% ${trend.change >= 0 ? "higher" : "lower"}** than older ones.`
    );
  const strong = correlations.filter((c) => Math.abs(c.r) >= 0.3);
  strong.slice(0, 2).forEach((c) => findings.push(`\`${c.a}\` and \`${c.b}\` show a ${strength(c.r)} relationship (r = ${c.r.toFixed(2)}).`));
  if (metric) {
    const c = p.cols.find((x) => x.name === metric)!;
    if (c.mean! > c.median! * 1.3) findings.push(`${label(metric)} is right-skewed (mean ${money(c.mean!, m)} vs median ${money(c.median!, m)}) — a few high values pull the average up; report the median.`);
  }
  if (anomalies) findings.push(`Anomaly Watch found **${anomalies} unusual days** in ${label(metric!).toLowerCase()}.`);
  if (p.issues.length) findings.push(`Data quality is **${p.qualityScore}/100** — ${p.issues.slice(0, 2).map((i) => i.title.toLowerCase()).join("; ")}.`);

  return { metric, metricAgg, money: m, dim, dim2, kpis, byDim, countByDim, trend, correlations, anomalies, findings };
}

/** A full analyst-style dashboard for any dataset */
export function buildDashboard(rows: Row[], p: DatasetProfile, ins = computeInsights(rows, p)): ChartSpec[] {
  const charts: ChartSpec[] = [];
  const { metric, dim, dim2, money: m } = ins;
  const al = aggLabel(metric);
  if (ins.trend && ins.trend.data.length >= 2)
    charts.push({ type: ins.trend.axis === "Month" ? "area" : "line", title: `${metric ? `${al} ${label(metric)}` : "Records"} by ${ins.trend.axis.toLowerCase()}`, data: ins.trend.data.map((d) => ({ ...d, value: Math.round(d.value * 100) / 100 })), xLabel: ins.trend.axis, money: m });
  if (dim && metric && ins.byDim.length)
    charts.push({ type: "bar", title: `${al} ${label(metric)} by ${label(dim)}`, subtitle: "Ranked, highest first", data: ins.byDim.slice(0, 12).map((d) => ({ name: d.name, value: Math.round(d.value * 100) / 100 })), money: m });
  if (dim && ins.countByDim.length)
    charts.push(ins.countByDim.length <= 6
      ? { type: "donut", title: `Share of records by ${label(dim)}`, data: ins.countByDim.map((d) => ({ name: d.name, value: d.value })) }
      : { type: "bar", title: `Records by ${label(dim)}`, subtitle: "Count of rows", data: ins.countByDim.slice(0, 12).map((d) => ({ name: d.name, value: d.value })) });
  if (metric) charts.push({ type: "hist", title: `Distribution of ${label(metric)}`, subtitle: "How values are spread", data: histogramOf(rows, metric), money: m });
  const pair = ins.correlations.find((c) => Math.abs(c.r) >= 0.15) || ins.correlations[0];
  if (pair) charts.push({ type: "scatter", title: `${label(pair.a)} vs ${label(pair.b)}`, subtitle: `r = ${pair.r.toFixed(2)} (${strength(pair.r)})`, points: scatterOf(rows, pair.a, pair.b), xLabel: label(pair.a), yLabel: label(pair.b) });
  if (dim2) {
    const g = metric ? metricBy(rows, dim2, metric) : groupBy(rows, dim2, undefined, "count");
    const clean = g.filter((x) => x.name !== "Unknown");
    charts.push(clean.length <= 6 && !metric
      ? { type: "donut", title: `Share by ${label(dim2)}`, data: clean }
      : { type: "bar", title: `${metric ? `${al} ${label(metric)}` : "Records"} by ${label(dim2)}`, data: clean.slice(0, 12).map((d) => ({ name: d.name, value: Math.round(d.value * 100) / 100 })), money: m && !!metric });
  }
  const other = numericCols(p).find((c) => c.name !== metric && c.name !== pair?.a && c.name !== pair?.b) || numericCols(p).find((c) => c.name !== metric);
  if (other && dim) charts.push({ type: "bar", title: `${aggLabel(other.name)} ${label(other.name)} by ${label(dim)}`, data: metricBy(rows, dim, other.name).filter((x) => x.name !== "Unknown").slice(0, 12).map((d) => ({ name: d.name, value: Math.round(d.value * 100) / 100 })), money: isMoney(other.name) });
  return charts.filter((c) => (c.data?.length ?? c.points?.length ?? 0) > 1);
}
