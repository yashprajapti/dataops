"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, FileSpreadsheet, Trash2, Download, Wand2, CheckCircle2, Loader2, Hash, Calendar, Type, KeyRound, Sparkles, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import { useApp, useActiveDataset, datasetRows } from "@/lib/store";
import { cloudEnabled, fetchDatasetRows } from "@/lib/cloud";
import { SAMPLE_DATASETS } from "@/lib/sample-data";
import { coerceRows, toCSV, fmtShort, type ColumnProfile } from "@/lib/analytics";
import { PageHeader, Panel } from "@/components/dash/Shell";
import { Histogram } from "@/components/charts";
import { cn, downloadText, timeAgo } from "@/lib/utils";

const MAX_MB = 25;
const TYPE_ICON: Record<string, any> = { number: Hash, date: Calendar, category: Type, text: Type, id: KeyRound, boolean: Type };

function QualityGauge({ score }: { score: number }) {
  const color = score >= 85 ? "#C6FF3D" : score >= 65 ? "#FFB547" : "#FF5C8A";
  const c = 2 * Math.PI * 42;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1.1, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-semibold text-white">{score}</div>
          <div className="text-[10px] uppercase tracking-wider text-mute">quality</div>
        </div>
      </div>
    </div>
  );
}

function ColumnCard({ c }: { c: ColumnProfile }) {
  const I = TYPE_ICON[c.type] || Type;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <I size={14} className={c.type === "number" ? "text-cyan" : c.type === "date" ? "text-amber" : "text-violet"} />
        <span className="truncate font-mono text-[13px] text-white">{c.name}</span>
        <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-mute">{c.type}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-white/[0.03] p-1.5"><div className="text-mute">unique</div><div className="text-white">{fmtShort(c.unique)}</div></div>
        <div className={cn("rounded-lg p-1.5", c.missing ? "bg-rose/10" : "bg-white/[0.03]")}><div className="text-mute">missing</div><div className={c.missing ? "text-rose" : "text-white"}>{c.missing}</div></div>
        <div className={cn("rounded-lg p-1.5", c.outliers || c.inconsistentCase ? "bg-amber/10" : "bg-white/[0.03]")}>
          <div className="text-mute">{c.type === "number" ? "outliers" : "messy"}</div>
          <div className={c.outliers || c.inconsistentCase ? "text-amber" : "text-white"}>{c.type === "number" ? c.outliers : c.inconsistentCase ?? 0}</div>
        </div>
      </div>
      {c.type === "number" && c.histogram && (
        <>
          <div className="mt-3"><Histogram data={c.histogram} height={110} /></div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-mute">
            <span>min {fmtShort(c.min!)}</span><span>μ {fmtShort(c.mean!)}</span><span>max {fmtShort(c.max!)}</span>
          </div>
        </>
      )}
      {c.top && (
        <ul className="mt-3 space-y-1">
          {c.top.slice(0, 5).map((t) => (
            <li key={t.value} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 truncate text-white/75">{t.value}</span>
              <div className="h-1.5 flex-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-violet/80" style={{ width: `${(t.count / c.count) * 100}%` }} /></div>
              <span className="w-8 text-right tabular-nums text-mute">{t.count}</span>
            </li>
          ))}
        </ul>
      )}
      {c.type === "date" && <div className="mt-3 font-mono text-[11px] text-white/70">{c.minDate} → {c.maxDate}</div>}
    </div>
  );
}

export default function DatasetsPage() {
  const { datasets, activeId, setActive, addUpload, addSample, removeDataset, cleanDataset, mode, uploadsUsed, uploadLimit, canUpload, user } = useApp();
  const limited = Number.isFinite(uploadLimit);
  const { dataset, rows, profile } = useActiveDataset();
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [cleanLog, setCleanLog] = useState<string[] | null>(null);
  const [tab, setTab] = useState<"profile" | "preview">("profile");
  const input = useRef<HTMLInputElement>(null);

  function handle(file?: File) {
    setErr("");
    if (!file) return;
    if (!canUpload) return setErr(`You’ve used all ${uploadLimit} uploads on the free plan. Upgrade to Pro for unlimited uploads.`);
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) return setErr("Please upload a .csv file (export from Excel/Sheets with File → Save as CSV).");
    if (file.size > MAX_MB * 1024 * 1024) return setErr(`File is larger than ${MAX_MB} MB.`);
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const data = coerceRows(res.data as any[]);
        setLoading(false);
        if (!data.length || Object.keys(data[0]).length < 2) return setErr("Couldn’t read columns — make sure the first row contains headers.");
        if (!addUpload(file.name, data)) setErr(`You’ve used all ${uploadLimit} uploads on the free plan. Upgrade to Pro for unlimited uploads.`);
        setCleanLog(null);
      },
      error: (e) => { setLoading(false); setErr(e.message); },
    });
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Datasets" sub={mode === "cloud" ? "Upload CSVs or start from a curated sample. Files are parsed in your browser and saved privately to your account." : "Upload CSVs or start from a curated sample. Everything is parsed and kept in your browser."} />

      <div className="grid gap-4 lg:grid-cols-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
          onClick={() => input.current?.click()}
          className={cn("relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition lg:col-span-2", drag ? "border-lime bg-lime/[0.06]" : "border-white/10 bg-ink-850/60 hover:border-white/25")}
        >
          <div className="bg-dots absolute inset-0 opacity-40" />
          <input ref={input} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => handle(e.target.files?.[0])} />
          <div className="relative">
            {loading ? <Loader2 size={34} className="mx-auto animate-spin text-lime" /> : <UploadCloud size={34} className="mx-auto text-lime" />}
            <div className="mt-3 font-medium text-white">{loading ? "Parsing…" : "Drop a CSV here or click to browse"}</div>
            <div className="mt-1 text-xs text-mute">Up to {MAX_MB} MB · headers in the first row</div>
            {limited && (
              <div className="mx-auto mt-4 w-56" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between text-[11px]"><span className="text-mute">Free plan uploads</span><span className={cn("tabular-nums", canUpload ? "text-white" : "text-rose")}>{Math.min(uploadsUsed, uploadLimit)} / {uploadLimit}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className={cn("h-full rounded-full", uploadsUsed >= uploadLimit ? "bg-rose" : uploadsUsed >= uploadLimit - 3 ? "bg-amber" : "bg-lime")} style={{ width: `${Math.min(100, (uploadsUsed / uploadLimit) * 100)}%` }} /></div>
                {!canUpload && <a href="/dashboard/billing" className="mt-2 inline-block text-[11px] text-lime hover:underline">Upgrade to Pro →</a>}
              </div>
            )}
            {err && <div className="mt-3 rounded-lg bg-rose/10 px-3 py-2 text-xs text-rose">{err}</div>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-3">
          {SAMPLE_DATASETS.map((s) => (
            <div key={s.id} className="card flex flex-col p-4">
              <FileSpreadsheet size={18} className="text-cyan" />
              <div className="mt-2 text-sm font-medium text-white">{s.name}</div>
              <div className="text-[11px] text-lime">{s.domain}</div>
              <p className="mt-1.5 line-clamp-3 flex-1 text-xs text-mute">{s.description}</p>
              <button onClick={() => { addSample(s.id); setCleanLog(null); }} className="btn-ghost mt-3 !py-1.5 text-xs">Load sample</button>
            </div>
          ))}
        </div>
      </div>

      <Panel className="mt-4" title="Your datasets" sub={`${datasets.length} total`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-mute">
                <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Source</th><th className="pb-2 font-medium">Rows</th><th className="pb-2 font-medium">Added</th><th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => {
                const n = datasetRows(d).length || d.rowCount || 0;
                const on = d.id === (activeId ?? datasets[0]?.id);
                return (
                  <tr key={d.id} className={cn("border-t border-white/[0.05]", on && "bg-lime/[0.03]")}>
                    <td className="py-2.5">
                      <button onClick={() => setActive(d.id)} className="flex items-center gap-2 text-left text-white hover:text-lime">
                        {on ? <CheckCircle2 size={15} className="text-lime" /> : <span className="h-[15px] w-[15px] rounded-full border border-white/20" />}
                        {d.name}
                        {d.cleaned && <span className="rounded bg-lime/15 px-1.5 text-[10px] text-lime">cleaned</span>}
                        {d.localOnly && <span title="Too large to save to the cloud — available in this session only" className="rounded bg-amber/15 px-1.5 text-[10px] text-amber">this session only</span>}
                      </button>
                    </td>
                    <td className="text-mute">{d.source === "sample" ? "Sample" : "Upload"}</td>
                    <td className="tabular-nums text-white/80">{n.toLocaleString("en-IN")}</td>
                    <td className="text-mute">{timeAgo(d.createdAt)}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-1">
                        <button title="Download CSV" onClick={async () => { let r = datasetRows(d); if (!r.length && d.source === "upload" && cloudEnabled) { try { r = await fetchDatasetRows(d.id); } catch {} } downloadText(d.name.endsWith(".csv") ? d.name : d.name + ".csv", toCSV(r), "text/csv"); }} className="rounded-lg p-2 text-mute hover:bg-white/5 hover:text-white"><Download size={14} /></button>
                        <button title="Remove" onClick={() => removeDataset(d.id)} className="rounded-lg p-2 text-mute hover:bg-rose/10 hover:text-rose"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {profile && dataset && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="card flex flex-col items-center justify-center gap-3 p-6">
              <QualityGauge score={profile.qualityScore} />
              <div className="text-center text-xs text-mute">{profile.rows.toLocaleString("en-IN")} rows · {profile.columns} columns</div>
              <button onClick={() => setCleanLog(cleanDataset(dataset.id))} disabled={!profile.issues.length} className="btn-primary w-full">
                <Wand2 size={15} /> Auto-clean
              </button>
            </div>
            <Panel title="Cleaner agent report" sub={`${profile.issues.length} issues · ${profile.duplicates} duplicates · ${profile.missingCells} empty cells`}>
              <AnimatePresence>
                {cleanLog && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-3 rounded-xl border border-lime/25 bg-lime/[0.06] p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-lime"><Sparkles size={14} /> Cleaned copy created and set as active</div>
                    <ul className="mt-2 space-y-1 text-xs text-white/80">{cleanLog.map((l) => <li key={l}>✓ {l}</li>)}</ul>
                  </motion.div>
                )}
              </AnimatePresence>
              <ul className="grid gap-2 md:grid-cols-2">
                {profile.issues.map((i) => (
                  <li key={i.title} className="flex gap-3 rounded-xl bg-white/[0.02] p-3">
                    <AlertTriangle size={15} className={cn("mt-0.5 shrink-0", i.severity === "high" ? "text-rose" : i.severity === "medium" ? "text-amber" : "text-mute")} />
                    <div className="text-sm">
                      <div className="text-white/90">{i.title}</div>
                      <div className="text-xs text-mute">{i.detail} {i.fix}</div>
                    </div>
                  </li>
                ))}
                {!profile.issues.length && <li className="col-span-2 py-6 text-center text-sm text-lime">✓ No issues found — this dataset is analysis-ready.</li>}
              </ul>
            </Panel>
          </div>

          <div className="mb-3 mt-6 flex gap-1">
            {(["profile", "preview"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg px-3 py-1.5 text-sm capitalize", tab === t ? "bg-white/10 text-white" : "text-mute hover:text-white")}>
                {t === "profile" ? "Column profiles" : "Data preview"}
              </button>
            ))}
          </div>
          {tab === "profile" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {profile.cols.map((c) => <ColumnCard key={c.name} c={c} />)}
            </div>
          ) : (
            <div className="card max-h-[520px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-900">
                  <tr>{profile.cols.map((c) => <th key={c.name} className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-mono font-medium text-mute">{c.name}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      {profile.cols.map((c) => <td key={c.name} className="whitespace-nowrap px-3 py-1.5 text-white/80">{r[c.name] === null || r[c.name] === undefined ? <span className="rounded bg-rose/15 px-1 text-rose">null</span> : String(r[c.name])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
