"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, FileSpreadsheet, Database, Package, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { useApp, useActiveDataset, datasetRows } from "@/lib/store";
import { PageHeader, EmptyData } from "@/components/dash/Shell";
import { Markdown } from "@/components/Markdown";
import { ChartBody, ChartTheme } from "@/components/charts";
import { LogoMark } from "@/components/Logo";
import { buildReport, reportMarkdown, type ReportModel } from "@/lib/report";
import { buildSQLScript, buildWorkbook, buildZip, DIALECTS, saveBlob, type Dialect } from "@/lib/exports";
import { cloudEnabled, fetchDatasetRows } from "@/lib/cloud";
import { fmtShort, label } from "@/lib/analytics";
import type { Row } from "@/lib/sample-data";
import { cn, downloadText } from "@/lib/utils";

function Section({ n, title, children, className }: { n: number; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("report-section px-10 py-8", className)}>
      <h2 className="mb-4 flex items-baseline gap-3 border-b border-slate-200 pb-2 text-xl font-semibold text-slate-900">
        <span className="font-mono text-sm text-cyan-700">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function cell(v: any) {
  if (v === null || v === undefined) return <span className="text-slate-300">—</span>;
  if (typeof v === "number") return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return String(v);
}

function DataTable({ columns, rows, max = 10 }: { columns: string[]; rows: Row[]; max?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, max).map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {columns.map((c) => <td key={c} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-slate-800">{cell(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { user, datasets } = useApp();
  const { dataset, rows, profile, loading } = useActiveDataset();
  const [report, setReport] = useState<ReportModel | null>(null);
  const [building, setBuilding] = useState(false);
  const [dialect, setDialect] = useState<Dialect>("mssql");
  const [busy, setBusy] = useState<string | null>(null);

  const parent = useMemo(() => (dataset?.parentId ? datasets.find((d) => d.id === dataset.parentId) : undefined), [dataset, datasets]);
  const queries = useMemo(() => [...(dataset?.queries || []), ...(parent?.queries || [])], [dataset, parent]);

  useEffect(() => {
    if (!dataset || !rows.length) { setReport(null); return; }
    let cancelled = false;
    (async () => {
      setBuilding(true);
      let parentRows: Row[] | null = parent ? datasetRows(parent) : null;
      if (parent && !parentRows?.length && parent.source === "upload" && cloudEnabled) {
        try { parentRows = await fetchDatasetRows(parent.id); } catch { parentRows = null; }
      }
      const r = await buildReport({ datasetName: parent?.name ?? dataset.name, rows, cleaned: !!dataset.cleaned, cleanLog: dataset.cleanLog, parentRows, queries, author: user?.name || "Analyst", role: user?.role });
      if (!cancelled) { setReport(r); setBuilding(false); }
    })();
    return () => { cancelled = true; };
  }, [dataset, rows, parent, queries, user?.name, user?.role]);

  async function run(kind: string, fn: () => Promise<void> | void) {
    setBusy(kind);
    try { await fn(); } finally { setBusy(null); }
  }

  if (loading || (!profile && !report)) return <EmptyData />;
  if (!report || building)
    return (
      <div className="card grid place-items-center p-16 text-center">
        <Loader2 className="animate-spin text-lime" />
        <p className="mt-3 text-sm text-mute">Building your report — cleaning, analysing and running SQL on {rows.length.toLocaleString("en-IN")} rows…</p>
      </div>
    );

  const r = report;
  const rawP = r.raw.profile, cleanP = r.cleaned.profile;
  const dLabel = DIALECTS.find((d) => d.id === dialect)!;

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="print:hidden">
        <PageHeader
          title="Reports"
          sub="Your complete analysis package: cleaned data, SQL analysis, dashboard and recommendations — ready to hand over."
        />
        <div className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button onClick={() => run("xlsx", async () => saveBlob(await buildWorkbook(r), `${r.baseName}_cleaned.xlsx`))} className="btn-primary">
              {busy === "xlsx" ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Cleaned Excel
            </button>
            <button onClick={() => run("sql", () => downloadText(`${r.baseName}_analysis_${dialect}.sql`, buildSQLScript(r, dialect), "application/sql"))} className="btn-ghost">
              {busy === "sql" ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} className="text-cyan" />} SQL file ({dLabel.label})
            </button>
            <button onClick={() => window.print()} className="btn-ghost"><Printer size={15} className="text-amber" /> Save as PDF</button>
            <button onClick={() => run("zip", async () => saveBlob(await buildZip(r, dialect), `${r.baseName}_dataops_package.zip`))} className="btn-ghost">
              {busy === "zip" ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} className="text-violet" />} Download all (.zip)
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-mute">
            SQL for
            <select value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)} className="input !w-auto !py-1.5 text-xs">
              {DIALECTS.map((d) => <option key={d.id} value={d.id}>{d.label} ({d.tool})</option>)}
            </select>
          </label>
        </div>
      </div>

      <ChartTheme light>
        <article id="report" className="paper overflow-hidden rounded-2xl bg-white text-slate-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)] print:rounded-none print:shadow-none">
          {/* Cover */}
          <header className="report-section relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white px-10 pb-8 pt-10">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500"><LogoMark className="h-5 w-5" /> DataOps · Data Analysis Report</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{r.datasetName.replace(/\.csv$/i, "").replace(/[_-]/g, " ")}</h1>
            <p className="mt-2 text-sm text-slate-500">Prepared by <b className="text-slate-700">{r.author}</b>{r.role ? `, ${r.role}` : ""} · {r.date}</p>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Records", `${rawP.rows.toLocaleString("en-IN")} → ${cleanP.rows.toLocaleString("en-IN")}`, "raw → cleaned"],
                ["Columns", String(rawP.columns), `${cleanP.numeric.length} numeric · ${cleanP.categorical.length} categorical`],
                ["Data quality", `${rawP.qualityScore} → ${cleanP.qualityScore}`, "score out of 100"],
                ["Issues fixed", String(rawP.issues.length), `${r.cleaned.log.length} cleaning steps`],
              ].map(([k, v, s]) => (
                <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{k}</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{v}</div>
                  <div className="text-[11px] text-slate-500">{s}</div>
                </div>
              ))}
            </div>
          </header>

          <Section n={1} title="Executive summary">
            <div className="prose-light"><Markdown text={r.summary.map((s) => `- ${s}`).join("\n")} /></div>
          </Section>

          <Section n={2} title="Data overview">
            <p className="mb-3 text-sm text-slate-600">{rawP.rows.toLocaleString("en-IN")} records and {rawP.columns} columns were received. Column types were detected automatically:</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>{["Column", "Type", "Missing (raw)", "Unique", "Summary"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {cleanP.cols.map((c) => {
                    const raw = rawP.cols.find((x) => x.name === c.name);
                    return (
                      <tr key={c.name} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-mono text-slate-900">{c.name}</td>
                        <td className="px-3 py-1.5 text-slate-600">{c.type}</td>
                        <td className={cn("px-3 py-1.5 tabular-nums", raw?.missing ? "font-medium text-rose-600" : "text-slate-500")}>{raw?.missing ?? 0}{raw?.missing ? ` (${(raw.missingPct * 100).toFixed(1)}%)` : ""}</td>
                        <td className="px-3 py-1.5 tabular-nums text-slate-600">{c.unique.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {c.type === "number" ? `mean ${fmtShort(c.mean!)} · median ${fmtShort(c.median!)} · ${fmtShort(c.min!)}–${fmtShort(c.max!)}` : c.type === "date" ? `${c.minDate} → ${c.maxDate}` : c.top?.slice(0, 3).map((t) => `${t.value} (${t.count})`).join(", ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section n={3} title="Data cleaning">
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Quality score</div>
                {[["Before", rawP.qualityScore, "bg-amber-400"], ["After", cleanP.qualityScore, "bg-emerald-500"]].map(([k, v, c]: any) => (
                  <div key={k} className="mt-3">
                    <div className="flex justify-between text-sm"><span className="text-slate-600">{k}</span><b className="text-slate-900">{v}/100</b></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", c)} style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Issues found in the raw data</h3>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {rawP.issues.length ? rawP.issues.map((i) => (
                    <li key={i.title} className="flex gap-2">
                      <AlertTriangle size={14} className={cn("mt-0.5 shrink-0", i.severity === "high" ? "text-rose-500" : i.severity === "medium" ? "text-amber-500" : "text-slate-400")} />
                      <span><b className="text-slate-800">{i.title}</b> <span className="text-slate-500">— {i.fix}</span></span>
                    </li>
                  )) : <li className="text-emerald-600">No issues — the data arrived clean.</li>}
                </ul>
                <h3 className="mt-5 text-sm font-semibold text-slate-900">What was done</h3>
                <ol className="mt-2 space-y-1.5 text-[13px]">
                  {(r.cleaned.log.length ? r.cleaned.log : ["No changes needed."]).map((l, i) => (
                    <li key={i} className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" /><span className="text-slate-700">{l}</span></li>
                  ))}
                </ol>
              </div>
            </div>
          </Section>

          <Section n={4} title="Analysis dashboard">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {r.insights.kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] font-medium text-slate-500">{k.label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{k.value}</div>
                  {k.sub && <div className="text-[11px] text-slate-500">{k.sub}</div>}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {r.charts.map((c, i) => (
                <div key={i} className={cn("report-chart rounded-xl border border-slate-200 p-4", (c.type === "area" || c.type === "line" || c.type === "scatter") && "md:col-span-2")}>
                  <div className="text-sm font-semibold text-slate-900">{c.title}</div>
                  {c.subtitle && <div className="text-[11px] text-slate-500">{c.subtitle}</div>}
                  <div className="mt-2"><ChartBody spec={c} /></div>
                </div>
              ))}
            </div>
          </Section>

          <Section n={5} title="SQL analysis">
            <p className="mb-4 text-sm text-slate-600">
              {r.sql.length} queries were run on the cleaned data — the standard analysis plus every query from SQL Studio and the SQL agent. The same queries are in the <b>SQL file</b> ({dLabel.label}) and the <b>SQL Analysis</b> sheet of the Excel workbook.
            </p>
            <div className="space-y-6">
              {r.sql.map((s, i) => (
                <div key={i} className="report-query">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xs text-cyan-700">Q{i + 1}</span>
                    <h3 className="text-[15px] font-semibold text-slate-900">{s.title}</h3>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", s.source === "auto" ? "bg-slate-100 text-slate-500" : "bg-cyan-50 text-cyan-700")}>{s.source === "auto" ? "standard" : s.source === "agent" ? "asked to SQL agent" : "SQL Studio"}</span>
                  </div>
                  <p className="text-[12px] text-slate-500">{s.purpose}</p>
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11.5px] leading-relaxed text-slate-800">{s.sql.replace(/`/g, "")}</pre>
                  <div className="mt-2">
                    {s.result.error ? <p className="text-xs text-rose-600">Error: {s.result.error}</p> : s.result.rows.length ? (
                      <>
                        <DataTable columns={s.result.columns} rows={s.result.rows} />
                        {s.result.total > 10 && <p className="mt-1 text-[11px] text-slate-400">Showing 10 of {s.result.total} rows.</p>}
                      </>
                    ) : <p className="text-xs text-slate-400">No rows returned.</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section n={6} title="Recommendations">
            <ol className="space-y-3">
              {r.recommendations.map((x, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                  <div className="prose-light -mt-1.5 text-[14px]"><Markdown text={x} /></div>
                </li>
              ))}
            </ol>
          </Section>

          <Section n={7} title="Deliverables">
            <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
              {[
                [`${r.baseName}_cleaned.xlsx`, "Cleaned data + cleaning log + quality + column profile + SQL results + raw data"],
                [`${r.baseName}_analysis_${dialect}.sql`, `Creates the table, loads ${cleanP.rows.toLocaleString("en-IN")} cleaned rows and runs all ${r.sql.length} queries (${dLabel.label})`],
                [`${r.baseName}_cleaned.csv`, "Cleaned data for Power BI, Tableau or Python"],
                ["This report (PDF)", "Save as PDF from the Reports page"],
              ].map(([f, d]) => (
                <li key={f} className="flex gap-2 rounded-lg border border-slate-200 p-3">
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-cyan-700" />
                  <span><b className="font-mono text-[12px] text-slate-900">{f}</b><br /><span className="text-slate-500">{d}</span></span>
                </li>
              ))}
            </ul>
          </Section>

          <footer className="border-t border-slate-200 px-10 py-4 text-[11px] text-slate-400">
            Generated with DataOps · Figures computed from {cleanP.rows.toLocaleString("en-IN")} cleaned records of {label(r.datasetName.replace(/\.csv$/i, ""))}. Verify before external distribution.
          </footer>
        </article>
      </ChartTheme>

      <div className="mt-4 flex justify-end print:hidden">
        <button onClick={() => downloadText(`${r.baseName}_report.md`, reportMarkdown(r), "text/markdown")} className="btn-ghost text-xs"><Download size={13} /> Report as Markdown</button>
      </div>
    </div>
  );
}
