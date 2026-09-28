"use client";

import { useState } from "react";
import { Download, TableProperties, BarChart3 } from "lucide-react";
import type { Row } from "@/lib/sample-data";
import { downloadText, cn } from "@/lib/utils";
import { toCSV } from "@/lib/analytics";
import { RankedBars, TrendArea } from "@/components/charts";

export function autoChartable(columns: string[], rows: Row[]) {
  if (rows.length < 2 || columns.length < 2) return null;
  const numCol = [...columns].reverse().find((c) => rows.every((r) => typeof r[c] === "number" || r[c] === null));
  const labelCol = columns.find((c) => c !== numCol && rows.every((r) => typeof r[c] === "string" || typeof r[c] === "number"));
  if (!numCol || !labelCol) return null;
  const isTime = rows.every((r) => typeof r[labelCol] === "string" && /^\d{4}-\d{2}/.test(r[labelCol]));
  return { numCol, labelCol, isTime, data: rows.slice(0, 40).map((r) => ({ name: String(r[labelCol]), value: Number(r[numCol]) || 0 })) };
}

export function ResultTable({ columns, rows, error, ms, compact }: { columns: string[]; rows: Row[]; error?: string; ms?: number; compact?: boolean }) {
  const chart = autoChartable(columns, rows);
  const [view, setView] = useState<"table" | "chart">(chart && !compact ? "chart" : "table");
  if (error)
    return (
      <div className="mt-3 rounded-xl border border-rose/30 bg-rose/[0.07] p-3 font-mono text-xs text-rose">
        <b>Query error:</b> {error}
      </div>
    );
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-ink-950/60">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 font-mono text-[11px] text-mute">
        <span>{rows.length} row{rows.length === 1 ? "" : "s"}{ms !== undefined && ` · ${ms} ms`}</span>
        <div className="ml-auto flex items-center gap-1">
          {chart && (
            <div className="flex rounded-md border border-white/10 p-0.5">
              <button onClick={() => setView("table")} aria-label="Table view" className={cn("rounded px-1.5 py-0.5", view === "table" && "bg-white/10 text-white")}><TableProperties size={12} /></button>
              <button onClick={() => setView("chart")} aria-label="Chart view" className={cn("rounded px-1.5 py-0.5", view === "chart" && "bg-white/10 text-white")}><BarChart3 size={12} /></button>
            </div>
          )}
          <button onClick={() => downloadText("query_result.csv", toCSV(rows), "text/csv")} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-white/5 hover:text-white">
            <Download size={12} /> CSV
          </button>
        </div>
      </div>
      {view === "chart" && chart ? (
        <div className="p-3">
          {chart.isTime ? <TrendArea data={chart.data} height={240} name={chart.numCol} /> : <RankedBars data={chart.data} height={Math.max(160, Math.min(chart.data.length, 15) * 30)} name={chart.numCol} />}
        </div>
      ) : (
        <div className={cn("overflow-auto", compact ? "max-h-72" : "max-h-[420px]")}>
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink-900">
              <tr>
                {columns.map((c) => <th key={c} className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-medium text-mute">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  {columns.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-white/85">
                      {r[c] === null || r[c] === undefined ? <span className="text-white/25">null</span> : typeof r[c] === "number" ? r[c].toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
