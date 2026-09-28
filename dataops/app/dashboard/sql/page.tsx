"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Wand2, History, Copy, Hash, Calendar, Type, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useActiveDataset, useApp } from "@/lib/store";
import { PageHeader, Panel, EmptyData } from "@/components/dash/Shell";
import { ResultTable } from "@/components/dash/ResultTable";
import { runSQL, extractSQL } from "@/lib/sql";
import { textToSQL, explainSQL, profileContext } from "@/lib/local-engine";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, any> = { number: Hash, date: Calendar, category: Type, text: Type, id: KeyRound, boolean: Type };
const HKEY = "dataops:sql-history";

export default function SQLStudio() {
  const { rows, profile, dataset } = useActiveDataset();
  const { settings, trackUsage, logQuery } = useApp();
  const [nl, setNl] = useState("");
  const [sql, setSql] = useState("SELECT *\nFROM data\nLIMIT 50");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [gen, setGen] = useState(false);
  const [explain, setExplain] = useState("");
  const [history, setHistory] = useState<{ sql: string; ts: number; rows: number }[]>([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HKEY) || "[]")); } catch {}
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSql(q);
  }, []);

  const saveHistory = (h: typeof history) => {
    setHistory(h);
    try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 25))); } catch {}
  };

  async function run(q = sql, log = true, question?: string) {
    setRunning(true);
    const r = await runSQL(q, rows);
    setResult(r);
    setRunning(false);
    setExplain(explainSQL(q));
    if (!r.error && log && dataset) logQuery(dataset.id, { sql: q, rows: r.rows.length, source: "studio", question });
    if (!r.error) saveHistory([{ sql: q, ts: Date.now(), rows: r.rows.length }, ...history.filter((h) => h.sql !== q)]);
  }

  async function generate() {
    if (!nl.trim() || !profile) return;
    setGen(true);
    let q = textToSQL(nl, profile, rows);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "sql", messages: [{ role: "user", content: nl }], context: dataset ? profileContext(dataset.name, profile, rows) : undefined, apiKey: settings.geminiKey || undefined }),
      });
      const data = await res.json();
      const s = data.text && extractSQL(data.text);
      if (s) { q = s; trackUsage(data.tokens || 200); }
    } catch {}
    setSql(q);
    setGen(false);
    run(q, true, nl.trim());
  }

  // run default on first load
  useEffect(() => {
    if (rows.length && !result) run(sql, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const examples = useMemo(() => {
    if (!profile) return [];
    const d = profile.primaryDim, m = profile.primaryMetric;
    const n2 = profile.numeric.find((x) => x !== m);
    return [
      d && m && `Top 5 ${d} by total ${m}`,
      profile.primaryDate && m && `Monthly ${m} trend`,
      d && n2 && `Average ${n2} by ${d}`,
      d && `How many rows per ${d}?`,
    ].filter(Boolean) as string[];
  }, [profile]);

  if (!profile) return <EmptyData />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="SQL Studio" sub={<>Query <span className="text-white">{dataset?.name}</span> as table <code className="rounded bg-white/10 px-1.5 font-mono text-lime">data</code> — runs instantly in your browser.</>} />

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        {/* Schema */}
        <Panel title="Schema" sub={`data · ${profile.rows.toLocaleString("en-IN")} rows`} className="h-fit">
          <ul className="space-y-0.5">
            {profile.cols.map((c) => {
              const I = TYPE_ICON[c.type] || Type;
              return (
                <li key={c.name}>
                  <button onClick={() => setSql((s) => s + (s.endsWith(" ") || s.endsWith("\n") ? "" : " ") + c.name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[12px] text-white/80 hover:bg-white/5" title="Insert column">
                    <I size={12} className={c.type === "number" ? "text-cyan" : c.type === "date" ? "text-amber" : "text-violet"} />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-[10px] text-mute">{c.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {history.length > 0 && (
            <>
              <div className="mb-2 mt-5 flex items-center justify-between text-xs text-mute">
                <span className="flex items-center gap-1.5"><History size={12} /> History</span>
                <button onClick={() => saveHistory([])} aria-label="Clear history" className="hover:text-white"><Trash2 size={12} /></button>
              </div>
              <ul className="space-y-1">
                {history.slice(0, 8).map((h) => (
                  <li key={h.ts}>
                    <button onClick={() => { setSql(h.sql); run(h.sql); }} className="w-full truncate rounded-lg px-2 py-1.5 text-left font-mono text-[11px] text-white/60 hover:bg-white/5 hover:text-white">
                      {h.sql.replace(/\s+/g, " ")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <div className="min-w-0 space-y-4">
          {/* NL to SQL */}
          <div className="border-glow rounded-2xl bg-ink-850 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><Wand2 size={15} className="text-cyan" /> Ask in plain English</div>
            <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={nl} onChange={(e) => setNl(e.target.value)} placeholder="e.g. top 5 cities by revenue where category is Dairy & Breakfast" className="input h-11 flex-1" />
              <button disabled={gen || !nl.trim()} className="btn-primary h-11 shrink-0">
                {gen ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} Generate SQL
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((e) => (
                <button key={e} onClick={() => setNl(e)} className="chip hover:border-white/25 hover:text-white">{e}</button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-xs text-mute">query.sql</span>
              <div className="ml-auto flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(sql)} className="btn-ghost !py-1.5 text-xs"><Copy size={12} /> Copy</button>
                <button onClick={() => run()} disabled={running} className="btn-primary !py-1.5 text-xs">
                  {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run <kbd className="ml-1 hidden rounded bg-ink-950/20 px-1 font-mono text-[10px] sm:inline">⌘↵</kbd>
                </button>
              </div>
            </div>
            <div className="relative flex font-mono text-[13px] leading-6">
              <div aria-hidden className="select-none border-r border-white/[0.05] px-3 py-3 text-right text-white/20">
                {sql.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); } }}
                spellCheck={false}
                rows={Math.max(6, sql.split("\n").length + 1)}
                className="w-full resize-none bg-transparent p-3 text-cyan caret-lime outline-none"
                aria-label="SQL editor"
              />
            </div>
          </div>

          {result && <ResultTable {...result} />}
          {explain && !result?.error && (
            <Panel title="What this query does">
              <Markdown text={explain} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
