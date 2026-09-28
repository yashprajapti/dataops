"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Copy, Check, Trash2, Play, Sparkles, Cpu, Database, RotateCcw } from "lucide-react";
import { useApp, useActiveDataset, type ChatMessage } from "@/lib/store";
import { AGENTS, AGENT_MAP, type AgentId } from "@/lib/agents";
import { AgentBadge } from "@/components/ui/AgentIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Markdown } from "@/components/Markdown";
import { SpecChart } from "@/components/charts";
import { ResultTable } from "@/components/dash/ResultTable";
import { localAgentReply, profileContext, describeResult } from "@/lib/local-engine";
import { extractSQL, runSQL } from "@/lib/sql";
import { cn, uid } from "@/lib/utils";

function useReveal(text: string, active: boolean) {
  const [n, setN] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) { setN(text.length); return; }
    setN(0);
    const step = Math.max(3, Math.ceil(text.length / 140));
    const t = setInterval(() => setN((x) => { if (x + step >= text.length) { clearInterval(t); return text.length; } return x + step; }), 16);
    return () => clearInterval(t);
  }, [text, active]);
  return text.slice(0, n);
}

function AssistantBubble({ m, animate, onRun, onAsk }: { m: ChatMessage; animate: boolean; onRun: (m: ChatMessage) => void; onAsk: (q: string) => void }) {
  const agent = AGENT_MAP[m.agent];
  const shown = useReveal(m.content, animate);
  const done = shown.length === m.content.length;
  const [copied, setCopied] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <AgentBadge agent={agent} size={32} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="font-medium text-white">{agent.name}</span>
          {m.engine && (
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px]", m.engine === "gemini" ? "bg-cyan/10 text-cyan" : "bg-white/[0.06] text-mute")}>
              {m.engine === "gemini" ? <Sparkles size={10} /> : <Cpu size={10} />} {m.engine === "gemini" ? "Gemini" : "DataOps engine"}
            </span>
          )}
        </div>
        <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-ink-850/80 px-4 py-3">
          <Markdown text={shown} />
          {done && m.sql && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => onRun(m)} className="btn-primary !py-1.5 text-xs"><Play size={12} /> {m.result ? "Re-run" : "Run on my data"}</button>
              <button onClick={() => { navigator.clipboard?.writeText(m.sql!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost !py-1.5 text-xs">
                {copied ? <Check size={12} className="text-lime" /> : <Copy size={12} />} Copy SQL
              </button>
              <a href={`/dashboard/sql?q=${encodeURIComponent(m.sql)}`} className="btn-ghost !py-1.5 text-xs"><Database size={12} /> Open in SQL Studio</a>
            </div>
          )}
          {done && m.result && <ResultTable {...m.result} compact />}
          {done && (m.charts?.length ? m.charts : m.chart ? [m.chart] : []).map((c, i) => <SpecChart key={i} spec={c} />)}
        </div>
        {done && !!m.followUps?.length && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="self-center text-[11px] text-mute">Ask next:</span>
            {m.followUps.map((f) => (
              <button key={f} onClick={() => onAsk(f)} className="chip transition hover:border-lime/40 hover:text-white">{f}</button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AssistantPage() {
  const app = useApp();
  const { chats, pushMessage, patchMessage, clearChat, settings, user, trackUsage, logQuery } = app;
  const { dataset, rows, profile } = useActiveDataset();
  const [agentId, setAgentId] = useState<AgentId>("advisor");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [animId, setAnimId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const initRan = useRef(false);

  const agent = AGENT_MAP[agentId];
  const messages = chats[agentId] || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  async function runMessageSQL(m: ChatMessage) {
    if (!m.sql) return;
    const r = await runSQL(m.sql, rows);
    patchMessage(m.agent, m.id, { result: r });
    if (!r.error && dataset) logQuery(dataset.id, { sql: m.sql, rows: r.rows.length, source: "agent" });
  }

  async function send(text: string, forAgent: AgentId = agentId) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    const history = [...(chats[forAgent] || []), { role: "user", content: q } as any].map((m: any) => ({ role: m.role, content: m.content }));
    pushMessage({ id: uid("m"), role: "user", agent: forAgent, content: q, ts: Date.now() });

    const local = localAgentReply(forAgent, q, rows, profile);
    // "Ask next" suggestions become clickable chips instead of text
    const nextMatch = local.content.match(/\n\n### Ask next\n([\s\S]*)$/);
    const followUps = nextMatch ? [...nextMatch[1].matchAll(/“([^”]+)”/g)].map((x) => x[1]) : [];
    const localText = nextMatch ? local.content.slice(0, nextMatch.index) : local.content;
    let content = localText;
    let sql = local.sql;
    let engine: "gemini" | "local" = "local";
    let tokens = 0;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: forAgent,
          messages: history,
          context: profile && dataset ? `${profileContext(dataset.name, profile, rows)}\n\nVERIFIED ANALYSIS FOR THIS QUESTION (computed from the full dataset — use these exact numbers, do not invent others):\n${localText.slice(0, 5000)}` : undefined,
          apiKey: settings.geminiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.text) {
        content = data.text;
        engine = "gemini";
        tokens = data.tokens || 0;
        if (forAgent === "sql") sql = extractSQL(data.text) || sql;
      }
    } catch {
      /* offline → local engine */
    }
    if (engine === "local") await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));

    const id = uid("m");
    const msg: ChatMessage = { id, role: "assistant", agent: forAgent, content, sql, charts: local.charts || (local.chart ? [local.chart] : undefined), followUps, engine, ts: Date.now() };
    if (sql && rows.length) {
      msg.result = await runSQL(sql, rows);
      if (!msg.result.error && dataset) logQuery(dataset.id, { sql, rows: msg.result.rows.length, source: "agent", question: q });
      if (engine === "local") msg.content = describeResult(msg.result, profile, sql).replace(/^\s+/, "") + "\n\n" + content;
    }
    trackUsage(tokens || Math.round(content.length / 4));
    setAnimId(id);
    pushMessage(msg);
    setBusy(false);
    taRef.current?.focus();
  }

  // deep-link: ?agent=sql&q=...
  useEffect(() => {
    if (initRan.current || !profile) return;
    initRan.current = true;
    const sp = new URLSearchParams(window.location.search);
    const a = sp.get("agent") as AgentId | null;
    const q = sp.get("q");
    if (a && AGENT_MAP[a]) setAgentId(a);
    if (q) {
      window.history.replaceState(null, "", "/dashboard/assistant");
      setTimeout(() => send(q, a && AGENT_MAP[a] ? a : agentId), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const suggestions = useMemo(() => {
    if (agentId !== "sql" || !profile) return agent.suggestions;
    const dim = profile.primaryDim, m = profile.primaryMetric;
    const out = [];
    if (dim && m) out.push(`Top 5 ${dim.replace(/_/g, " ")} by total ${m.replace(/_/g, " ")}`);
    if (profile.primaryDate && m) out.push(`Monthly ${m.replace(/_/g, " ")} trend`);
    const n2 = profile.numeric.find((x) => x !== m);
    if (dim && n2) out.push(`Average ${n2.replace(/_/g, " ")} by ${dim.replace(/_/g, " ")}`);
    return out.length ? out : agent.suggestions;
  }, [agentId, profile, agent]);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-[1400px] gap-4">
      {/* Agent rail */}
      <aside className="card hidden w-72 shrink-0 flex-col p-3 lg:flex">
        <div className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Your AI team</div>
        <div className="space-y-1">
          {AGENTS.map((a) => (
            <button key={a.id} onClick={() => setAgentId(a.id)} className={cn("relative flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition", a.id === agentId ? "bg-white/[0.07]" : "hover:bg-white/[0.03]")}>
              {a.id === agentId && <motion.span layoutId="railActive" className="absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ background: a.color }} />}
              <AgentBadge agent={a} size={36} />
              <div className="min-w-0">
                <div className="text-sm text-white">{a.name}</div>
                <div className="truncate text-[11px] text-mute">{a.role}</div>
              </div>
              {(chats[a.id]?.length ?? 0) > 0 && <span className="ml-auto rounded-full bg-white/10 px-1.5 text-[10px] text-white/70">{Math.ceil(chats[a.id].length / 2)}</span>}
            </button>
          ))}
        </div>
        <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
          <div className="flex items-center gap-2 text-mute"><Database size={12} className="text-cyan" /> Context</div>
          <div className="mt-1 truncate text-white">{dataset?.name ?? "No dataset"}</div>
          {profile && <div className="mt-0.5 text-mute">{profile.rows.toLocaleString("en-IN")} rows · {profile.columns} cols · Q{profile.qualityScore}</div>}
          <div className="mt-2 flex items-center gap-1.5 text-mute">
            <span className={cn("h-1.5 w-1.5 rounded-full", settings.geminiKey ? "bg-cyan" : "bg-lime")} />
            {settings.geminiKey ? "Gemini (your key)" : "Gemini if configured · local fallback"}
          </div>
        </div>
      </aside>

      {/* Chat */}
      <section className="card flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-1 overflow-x-auto lg:hidden">
            {AGENTS.map((a) => (
              <button key={a.id} onClick={() => setAgentId(a.id)} className={cn("rounded-lg p-1", a.id === agentId && "bg-white/10")} aria-label={a.name}>
                <AgentBadge agent={a} size={30} />
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <AgentBadge agent={agent} size={36} />
            <div>
              <div className="font-medium text-white">{agent.name}</div>
              <div className="text-xs" style={{ color: agent.color }}>{agent.tagline}</div>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => clearChat(agentId)} className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-mute hover:bg-white/5 hover:text-white">
              <Trash2 size={13} /> Clear
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.length === 0 && !busy ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={agentId}>
                <AgentBadge agent={agent} size={64} />
              </motion.div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{agent.name}</h2>
              <p className="mt-2 max-w-md text-sm text-mute">{agent.description}</p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-3">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left text-[13px] text-white/80 transition hover:border-white/20 hover:bg-white/[0.05]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end gap-3">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-white/[0.08] px-4 py-2.5 text-[14px] text-white">{m.content}</div>
                    <Avatar seed={user!.avatarSeed} name={user!.name} src={user!.avatarUrl} className="h-8 w-8" />
                  </motion.div>
                ) : (
                  <AssistantBubble key={m.id} m={m} animate={m.id === animId} onRun={runMessageSQL} onAsk={(f) => send(f)} />
                )
              )}
              <AnimatePresence>
                {busy && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                    <AgentBadge agent={agent} size={32} />
                    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-ink-850/80 px-4 py-3 text-sm text-mute">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: agent.color }} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                        ))}
                      </span>
                      Analysing {profile ? `${profile.rows.toLocaleString("en-IN")} rows` : "your request"}…
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {messages.length > 0 && !busy && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {suggestions.filter((s) => !messages.some((m) => m.content === s)).slice(0, 3).map((s) => (
                    <button key={s} onClick={() => send(s)} className="chip transition hover:border-white/25 hover:text-white">
                      <RotateCcw size={11} className="text-mute" /> {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-white/[0.06] p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/10 bg-ink-900 p-2 transition focus-within:border-lime/40 focus-within:ring-4 focus-within:ring-lime/5">
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(160, e.target.scrollHeight) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={`Message ${agent.name}… (English, Hindi or Hinglish)`}
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-mute"
            />
            <button disabled={!input.trim() || busy} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime text-ink-950 transition hover:bg-lime-soft disabled:opacity-30">
              <ArrowUp size={17} />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-mute">Only a statistical profile of your data is shared with the model — never raw rows. Always verify important numbers.</p>
        </form>
      </section>
    </div>
  );
}
