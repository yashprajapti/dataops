"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Download, FileSpreadsheet, PlayCircle } from "lucide-react";
import { PageShell } from "@/components/landing/PageShell";
import { SAMPLE_DATASETS, getSample } from "@/lib/sample-data";
import { profileDataset, toCSV } from "@/lib/analytics";
import { downloadText } from "@/lib/utils";
import { useApp } from "@/lib/store";

export default function PublicDatasets() {
  const { user, addSample } = useApp();
  const meta = useMemo(() => SAMPLE_DATASETS.map((s) => { const rows = getSample(s.id); const p = profileDataset(rows); return { s, rows, p }; }), []);
  return (
    <PageShell eyebrow="Sample datasets" title={<>Real-world data, <span className="text-grad">ready to explore</span></>} sub="Curated, realistic datasets — including the messy bits — so you can practise cleaning, SQL and storytelling end to end.">
      <div className="grid gap-5 lg:grid-cols-3">
        {meta.map(({ s, rows, p }) => (
          <div key={s.id} className="card flex flex-col p-6">
            <FileSpreadsheet className="text-cyan" />
            <h2 className="mt-4 text-xl font-semibold text-white">{s.name}</h2>
            <div className="text-xs text-lime">{s.domain}</div>
            <p className="mt-3 flex-1 text-sm text-mute">{s.description}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/[0.03] p-2"><div className="text-mute">rows</div><div className="font-semibold text-white">{rows.length.toLocaleString("en-IN")}</div></div>
              <div className="rounded-lg bg-white/[0.03] p-2"><div className="text-mute">cols</div><div className="font-semibold text-white">{p.columns}</div></div>
              <div className="rounded-lg bg-white/[0.03] p-2"><div className="text-mute">quality</div><div className="font-semibold text-white">{p.qualityScore}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">{p.cols.map((c) => <span key={c.name} className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/60">{c.name}</span>)}</div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={() => downloadText(s.file, toCSV(rows), "text/csv")} className="btn-ghost"><Download size={14} /> CSV</button>
              <Link href={user ? "/dashboard" : "/demo"} onClick={() => user && addSample(s.id)} className="btn-primary"><PlayCircle size={14} /> Explore</Link>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
