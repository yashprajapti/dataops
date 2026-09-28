"use client";

import { createContext, useContext } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ReferenceDot, LabelList,
} from "recharts";
import type { ChartSpec } from "@/lib/insights";
import { fmtShort } from "@/lib/analytics";
import { PRIMARY, SERIES } from "@/lib/palette";

/* ----------------------------------------------------------------------------- */
/* Theme: dark (app) and light (reports / PDF)                                    */
/* ----------------------------------------------------------------------------- */
const DARK = { grid: "rgba(255,255,255,0.06)", axis: "#6B7488", label: "#aab2c4", primary: PRIMARY, surface: "#0A0D18", cursor: "rgba(255,255,255,.25)", band: "rgba(255,255,255,.04)", text: "#fff" };
const LIGHT = { grid: "rgba(15,23,42,0.08)", axis: "#64748b", label: "#334155", primary: "#1B9FC0", surface: "#ffffff", cursor: "rgba(15,23,42,.25)", band: "rgba(15,23,42,.04)", text: "#0f172a" };
const ThemeCtx = createContext(DARK);
export function ChartTheme({ light, children }: { light?: boolean; children: React.ReactNode }) {
  return <ThemeCtx.Provider value={light ? LIGHT : DARK}>{children}</ThemeCtx.Provider>;
}
const useT = () => useContext(ThemeCtx);
const isLight = (t: typeof DARK) => t === LIGHT;

const fmt = (v: number, money?: boolean) => (money ? "₹" : "") + fmtShort(v);

export function TooltipBox({ active, payload, label, suffix = "", money }: any) {
  const t = useT();
  if (!active || !payload?.length) return null;
  return (
    <div className={isLight(t) ? "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg" : "rounded-xl border border-white/10 bg-ink-900/95 px-3 py-2 text-xs shadow-2xl backdrop-blur"}>
      {label !== undefined && label !== "" && <div className={isLight(t) ? "mb-1 font-mono text-[11px] text-slate-500" : "mb-1 font-mono text-[11px] text-mute"}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill || t.primary }} />
          <span className={isLight(t) ? "text-slate-600" : "text-white/70"}>{p.name}</span>
          <span className="ml-auto font-medium tabular-nums">{typeof p.value === "number" ? fmt(p.value, money) : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendArea({ data, height = 260, dataKey = "value", xKey = "name", name = "Value", anomalies, money, line }: { data: any[]; height?: number; dataKey?: string; xKey?: string; name?: string; anomalies?: { x: string; y: number; kind: "spike" | "drop" }[]; money?: boolean; line?: boolean }) {
  const t = useT();
  const tick = { fill: t.axis, fontSize: 11 };
  const gid = `areaFill-${isLight(t) ? "l" : "d"}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.primary} stopOpacity={line ? 0 : 0.28} />
            <stop offset="100%" stopColor={t.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, money)} width={58} />
        <Tooltip content={<TooltipBox money={money} />} cursor={{ stroke: t.cursor, strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={t.primary} strokeWidth={2} fill={`url(#${gid})`} dot={line && data.length <= 30 ? { r: 3, fill: t.primary, stroke: t.surface, strokeWidth: 1.5 } : false} activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} isAnimationActive={!isLight(t)} />
        {anomalies?.map((a, i) => (
          <ReferenceDot key={i} x={a.x} y={a.y} r={6} fill={a.kind === "spike" ? "#FFB547" : "#FF5C5C"} stroke={t.surface} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RankedBars({ data, height = 260, name = "Value", horizontal = true, suffix = "", money, labels }: { data: { name: string; value: number }[]; height?: number; name?: string; horizontal?: boolean; suffix?: string; money?: boolean; labels?: boolean }) {
  const t = useT();
  const tick = { fill: t.axis, fontSize: 11 };
  const longest = Math.max(...data.map((d) => String(d.name).length), 4);
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: labels ? 56 : 16, left: 4, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={t.grid} horizontal={false} />
          <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, money)} />
          <YAxis type="category" dataKey="name" tick={{ ...tick, fill: t.label }} tickLine={false} axisLine={false} width={Math.min(150, 12 + longest * 6.5)} interval={0} />
          <Tooltip content={<TooltipBox suffix={suffix} money={money} />} cursor={{ fill: t.band }} />
          <Bar dataKey="value" name={name} fill={t.primary} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={!isLight(t)}>
            {labels && <LabelList dataKey="value" position="right" formatter={(v: number) => fmt(v, money) + suffix} style={{ fill: t.label, fontSize: 10 }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, money)} width={58} />
        <Tooltip content={<TooltipBox suffix={suffix} money={money} />} cursor={{ fill: t.band }} />
        <Bar dataKey="value" name={name} fill={t.primary} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={!isLight(t)} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  const t = useT();
  // fold beyond 5 into "Other" so we never exceed the fixed palette
  const d = data.length > 6 ? [...data.slice(0, 5), { name: "Other", value: data.slice(5).reduce((s, x) => s + x.value, 0) }] : data;
  const total = d.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div style={{ width: height, height }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<TooltipBox />} />
            <Pie data={d} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke={t.surface} strokeWidth={2} isAnimationActive={!isLight(t)}>
              {d.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={isLight(t) ? "text-[11px] uppercase tracking-wider text-slate-500" : "text-[11px] uppercase tracking-wider text-mute"}>Total</span>
          <span className="text-lg font-semibold tabular-nums">{fmtShort(total)}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-xs">
        {d.map((x, i) => (
          <li key={x.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            <span className={isLight(t) ? "truncate text-slate-700" : "truncate text-white/80"}>{x.name}</span>
            <span className="ml-auto tabular-nums">{((x.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Histogram({ data, height = 200, money }: { data: { bin?: string; name?: string; count?: number; value?: number }[]; height?: number; money?: boolean }) {
  const t = useT();
  const tick = { fill: t.axis, fontSize: 11 };
  const d = data.map((x) => ({ bin: x.bin ?? (money ? "₹" : "") + x.name, count: x.count ?? x.value ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={d} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="bin" tick={tick} tickLine={false} axisLine={false} interval={d.length > 8 ? 1 : 0} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={36} tickFormatter={(v) => fmtShort(v)} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: t.band }} />
        <Bar dataKey="count" name="Records" fill={t.primary} radius={[4, 4, 0, 0]} isAnimationActive={!isLight(t)} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScatterPlot({ data, x = "x", y = "y", height = 260, xLabel, yLabel }: { data: any[]; x?: string; y?: string; height?: number; xLabel?: string; yLabel?: string }) {
  const t = useT();
  const tick = { fill: t.axis, fontSize: 11 };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: xLabel ? 14 : 0 }}>
        <CartesianGrid stroke={t.grid} />
        <XAxis type="number" dataKey={x} name={xLabel || x} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} label={xLabel ? { value: xLabel, position: "insideBottom", offset: -8, fill: t.axis, fontSize: 11 } : undefined} />
        <YAxis type="number" dataKey={y} name={yLabel || y} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} width={58} />
        <Tooltip content={<TooltipBox />} cursor={{ strokeDasharray: "3 3", stroke: t.cursor }} />
        <Scatter data={data} fill={t.primary} fillOpacity={0.55} stroke={t.surface} strokeWidth={1} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, color = PRIMARY, height = 40 }: { data: number[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Renders any ChartSpec produced by the engine */
export function ChartBody({ spec, height }: { spec: ChartSpec; height?: number }) {
  const data = spec.data || [];
  switch (spec.type) {
    case "donut":
      return <Donut data={data} height={height ?? 180} />;
    case "area":
    case "line":
      return <TrendArea data={data} height={height ?? 230} money={spec.money} line={spec.type === "line"} name={spec.yLabel || "Value"} />;
    case "hist":
      return <Histogram data={data} height={height ?? 210} money={spec.money} />;
    case "scatter":
      return <ScatterPlot data={spec.points || []} height={height ?? 260} xLabel={spec.xLabel} yLabel={spec.yLabel} />;
    default:
      return <RankedBars data={data} height={height ?? Math.max(160, Math.min(data.length, 14) * 30)} suffix={spec.valueLabel} money={spec.money} labels={data.length <= 12} />;
  }
}

export function SpecChart({ spec }: { spec: ChartSpec }) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-ink-950/60 p-3">
      <div className="text-xs font-medium text-white/85">{spec.title}</div>
      {spec.subtitle && <div className="mb-2 text-[11px] text-mute">{spec.subtitle}</div>}
      <div className={spec.subtitle ? "" : "mt-2"}>
        <ChartBody spec={spec} />
      </div>
    </div>
  );
}
