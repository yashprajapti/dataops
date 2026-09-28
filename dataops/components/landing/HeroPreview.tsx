"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AGENTS } from "@/lib/agents";
import { AgentBadge } from "@/components/ui/AgentIcon";
import { Send, Play, CheckCircle2, AlertTriangle, TableProperties } from "lucide-react";

const SCENES = [
  {
    agent: 1,
    q: "Top 5 cities by revenue this quarter",
    sql: "SELECT city, SUM(revenue) AS revenue\nFROM orders\nWHERE order_date >= '2026-01-01'\nGROUP BY city\nORDER BY revenue DESC\nLIMIT 5;",
    bars: [
      ["Mumbai", 100],
      ["Delhi", 86],
      ["Bengaluru", 82],
      ["Ahmedabad", 80],
      ["Hyderabad", 56],
    ] as [string, number][],
    note: "Mumbai leads Q1 with ₹1.14L — 19% of revenue.",
  },
  {
    agent: 0,
    q: "Is my orders file clean enough to report on?",
    quality: 79,
    checks: [
      ["24 duplicate rows removed", "ok"],
      ["198 missing ratings → median 3.8", "ok"],
      ["59 city labels standardised", "ok"],
      ["13 revenue outliers capped at P99", "warn"],
    ] as [string, "ok" | "warn"][],
    note: "Quality score went from 79 → 100 after auto-clean.",
  },
  {
    agent: 4,
    q: "Summarise Q1 for the leadership team",
    bullets: [
      ["Revenue", "+11.4%", "vs last quarter"],
      ["Repeat buyers", "61%", "of all orders"],
      ["Anomalies", "9 days", "flagged automatically"],
    ],
    note: "Recommendation: speed up delivery in Mumbai & Bengaluru — the slowest cities at 17.7 min.",
  },
];

function useTyped(text: string, speed = 22, start = true) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!start) return;
    setOut("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed, start]);
  return out;
}

export function HeroPreview() {
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState(0); // 0 typing q, 1 thinking, 2 answer
  const s = SCENES[scene];
  const typedQ = useTyped(s.q, 32, true);

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), s.q.length * 32 + 350);
    const t2 = setTimeout(() => setPhase(2), s.q.length * 32 + 1300);
    const t3 = setTimeout(() => setScene((x) => (x + 1) % SCENES.length), s.q.length * 32 + 7200);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [scene, s.q.length]);

  const agent = AGENTS[s.agent];
  const typedSQL = useTyped((s as any).sql || "", 12, phase === 2 && !!(s as any).sql);

  return (
    <div className="relative mx-auto w-full max-w-5xl [perspective:2000px]">
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-gradient-to-b from-cyan/20 via-violet/10 to-transparent blur-3xl" />
      <motion.div
        initial={{ rotateX: 18, y: 40, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        className="border-glow overflow-hidden rounded-[22px] bg-ink-900/90 shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="mx-auto hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-mute sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-lime" /> app.dataops.ai/workspace/quick-commerce
          </div>
        </div>
        <div className="grid min-h-[380px] grid-cols-12">
          {/* sidebar */}
          <aside className="col-span-3 hidden border-r border-white/[0.06] p-3 md:block">
            <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-mute">Your AI team</div>
            {AGENTS.map((a, i) => (
              <div
                key={a.id}
                className={`mb-1 flex items-center gap-2.5 rounded-xl px-2 py-2 text-[12.5px] transition-all duration-500 ${i === s.agent ? "bg-white/[0.06] text-white" : "text-white/50"}`}
              >
                <AgentBadge agent={a} size={26} />
                <span className="truncate">{a.short}</span>
                {i === s.agent && <span className="ml-auto h-1.5 w-1.5 animate-pulse-dot rounded-full" style={{ background: a.color }} />}
              </div>
            ))}
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-[11px] text-mute">
                <TableProperties size={12} /> quick_commerce_orders.csv
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-lime to-cyan" initial={{ width: "20%" }} animate={{ width: "92%" }} transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }} />
              </div>
              <div className="mt-1.5 font-mono text-[10px] text-mute">5,940 rows · 13 cols</div>
            </div>
          </aside>

          {/* chat */}
          <section className="col-span-12 flex flex-col p-4 md:col-span-9 sm:p-5">
            <div className="flex items-center gap-2.5">
              <AgentBadge agent={agent} size={30} />
              <div>
                <div className="text-sm font-medium text-white">{agent.name}</div>
                <div className="text-[11px] text-mute">{agent.role}</div>
              </div>
              <span className="chip ml-auto hidden sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> online
              </span>
            </div>

            <div className="mt-5 flex-1 space-y-4">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-2.5 text-[13px] text-white">
                {typedQ}
                {phase === 0 && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-lime" />}
              </div>

              <AnimatePresence mode="wait">
                {phase === 1 && (
                  <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-xs text-mute">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: agent.color }} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                      ))}
                    </span>
                    {agent.short} agent is analysing 5,940 rows…
                  </motion.div>
                )}
                {phase === 2 && (
                  <motion.div key={`ans-${scene}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-full space-y-3">
                    {"sql" in s && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <pre className="min-h-[150px] overflow-hidden rounded-xl border border-white/[0.07] bg-ink-950 p-3 font-mono text-[11.5px] leading-relaxed text-cyan">
                          {typedSQL}
                        </pre>
                        <div className="rounded-xl border border-white/[0.07] bg-ink-950 p-3">
                          <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-mute">
                            <span>RESULT · 5 rows · 12 ms</span>
                            <Play size={10} className="text-lime" />
                          </div>
                          {s.bars!.map(([name, v], i) => (
                            <div key={name} className="mb-1.5 flex items-center gap-2 text-[11px]">
                              <span className="w-16 truncate text-white/70">{name}</span>
                              <div className="h-4 flex-1 rounded bg-white/[0.03]">
                                <motion.div className="h-full rounded bg-cyan/90" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: "easeOut" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {"quality" in s && (
                      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-ink-950 p-3">
                          <div className="relative h-20 w-20">
                            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3" />
                            <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#C6FF3D" strokeWidth="3" strokeLinecap="round" strokeDasharray="97.4" initial={{ strokeDashoffset: 97.4 }} animate={{ strokeDashoffset: 97.4 * (1 - s.quality! / 100) }} transition={{ duration: 1.2 }} />
                          </svg>
                            <div className="absolute inset-0 grid place-items-center text-xl font-semibold">{s.quality}</div>
                          </div>
                          <div className="mt-2 text-[10px] uppercase tracking-wider text-mute">Quality score</div>
                        </div>
                        <ul className="space-y-2">
                          {s.checks!.map(([t, st], i) => (
                            <motion.li key={t} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/85">
                              {st === "ok" ? <CheckCircle2 size={14} className="text-lime" /> : <AlertTriangle size={14} className="text-amber" />}
                              {t}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {"bullets" in s && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        {s.bullets!.map(([k, v, d], i) => (
                          <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }} className="rounded-xl border border-white/[0.07] bg-ink-950 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-mute">{k}</div>
                            <div className="mt-1 text-xl font-semibold text-white">{v}</div>
                            <div className="text-[11px] text-lime">{d}</div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    <p className="text-[12.5px] text-white/75">
                      <span style={{ color: agent.color }}>●</span> {s.note}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="flex-1 truncate text-[12.5px] text-mute">Ask your data anything — in English or Hindi…</span>
              <span className="rounded-lg bg-lime p-1.5 text-ink-950">
                <Send size={13} />
              </span>
            </div>
          </section>
        </div>
      </motion.div>
      {/* scene dots */}
      <div className="mt-5 flex justify-center gap-2">
        {SCENES.map((_, i) => (
          <button key={i} aria-label={`Scene ${i + 1}`} onClick={() => setScene(i)} className={`h-1.5 rounded-full transition-all ${i === scene ? "w-8 bg-lime" : "w-3 bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}
