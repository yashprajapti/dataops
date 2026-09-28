"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Bell, FileSpreadsheet, Languages, LockKeyhole, ScanSearch, Upload, MessagesSquare, Rocket,
  ShoppingCart, Megaphone, Landmark, Truck, Car, CheckCircle2,
} from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { AgentBadge } from "@/components/ui/AgentIcon";
import { Reveal, SectionHeading } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";

/* -------------------------------- Logo cloud -------------------------------- */
const COMPANIES = ["Kiranakart", "Monsoon Labs", "Northwind", "Brightlane", "Quantix", "Helio Foods", "Vertex Mart", "Nimbus Pay", "Saffron Retail", "Orbit Logistics"];

export function LogoCloud() {
  return (
    <section className="border-y border-white/[0.05] bg-ink-900/40 py-10">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-mute">Trusted by data teams at fast-moving companies</p>
      <div className="mask-x mt-7 overflow-hidden">
        <div className="flex w-max animate-marquee gap-14 pr-14">
          {[...COMPANIES, ...COMPANIES].map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white/35 transition hover:text-white/80">
              <span className="grid h-6 w-6 place-items-center rounded-md border border-white/15 text-[10px]">{c[0]}</span>
              {c}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Agents ---------------------------------- */
const AGENT_DEMOS: Record<string, { q: string; a: string[] }> = {
  cleaner: { q: "Profile quick_commerce_orders.csv", a: ["Quality score: 79 / 100", "198 missing ratings (3.3%) → impute median", "24 exact duplicate rows → drop", "“AHMEDABAD” vs “Ahmedabad” → standardise 59 rows"] },
  sql: { q: "Average delivery time by city, slowest first", a: ["SELECT city, ROUND(AVG(delivery_minutes),1) AS avg_min", "FROM orders GROUP BY city", "ORDER BY avg_min DESC;", "→ Mumbai 17.7 · Bengaluru 17.6 · Delhi 15.3"] },
  viz: { q: "What should my dashboard look like?", a: ["KPI row: Revenue · Orders · AOV · Rating", "Hero: Revenue trend (area, daily)", "Support: Revenue by city (ranked bars)", "Slicers: date, category, payment method"] },
  marketing: { q: "Which channel should get more budget?", a: ["Email ROAS 45x · CAC ₹12", "WhatsApp ROAS 34x · CAC ₹14", "YouTube ROAS 0.7x — spending more than it earns", "Shift YouTube budget → WhatsApp & Email"] },
  advisor: { q: "Top 3 actions for next quarter?", a: ["1. Speed up delivery in Mumbai & Bengaluru (slowest, 17.7 min)", "2. Push Personal Care — highest AOV at ₹402", "3. Pre-stock for sale days (26 Jan spiked 8.5σ)", "Context: Q1 revenue +11.4% vs Q4"] },
};

export function AgentsSection() {
  const [active, setActive] = useState(0);
  const a = AGENTS[active];
  const demo = AGENT_DEMOS[a.id];
  return (
    <section id="agents" className="relative py-28">
      <div className="container-x">
        <SectionHeading
          eyebrow="Meet your AI team"
          title={<>Five analysts. <span className="text-grad">One workspace.</span></>}
          sub="Each agent is an expert in one part of the analytics workflow — and they share context, so the Advisor knows what the Cleaner fixed and what the SQL agent found."
        />
        <div className="mt-16 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {AGENTS.map((ag, i) => (
              <button
                key={ag.id}
                onClick={() => setActive(i)}
                className={`group relative flex min-w-[240px] items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 lg:min-w-0 ${
                  i === active ? "border-white/15 bg-white/[0.05]" : "border-white/[0.05] bg-transparent hover:bg-white/[0.03]"
                }`}
              >
                {i === active && <motion.span layoutId="agentGlow" className="absolute inset-y-3 left-0 w-[3px] rounded-full" style={{ background: ag.color }} />}
                <AgentBadge agent={ag} size={42} />
                <div className="min-w-0">
                  <div className="font-medium text-white">{ag.name}</div>
                  <div className="truncate text-xs text-mute">{ag.role}</div>
                </div>
                <ArrowRight size={16} className={`ml-auto shrink-0 transition ${i === active ? "text-white" : "text-white/20"}`} />
              </button>
            ))}
          </div>

          <Spotlight className="card relative min-h-[420px] overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-[90px] transition-colors duration-700" style={{ background: a.color + "22" }} />
            <AnimatePresence mode="wait">
              <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
                <div className="flex items-center gap-3">
                  <AgentBadge agent={a} size={48} />
                  <div>
                    <h3 className="text-2xl font-semibold text-white">{a.name}</h3>
                    <p className="text-sm" style={{ color: a.color }}>{a.tagline}</p>
                  </div>
                </div>
                <p className="mt-5 max-w-2xl text-white/70">{a.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {a.skills.map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
                <div className="mt-7 rounded-2xl border border-white/[0.07] bg-ink-950/70 p-4 font-mono text-[12.5px]">
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-lime">❯</span> {demo.q}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {demo.a.map((line, i) => (
                      <motion.div key={line} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.12 }} className="text-white/85">
                        <span style={{ color: a.color }}>▸</span> {line}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </Spotlight>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Features -------------------------------- */
function ProfilingVisual() {
  const cols = [["order_id", 0], ["city", 1.3], ["revenue", 0], ["rating", 3.3], ["delivery_min", 0]] as const;
  return (
    <div className="mt-6 space-y-2.5">
      {cols.map(([c, m], i) => (
        <div key={c} className="flex items-center gap-3 font-mono text-[11px]">
          <span className="w-24 truncate text-white/60">{c}</span>
          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div className="h-full bg-lime/80" initial={{ width: 0 }} whileInView={{ width: `${100 - m * 6}%` }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.9 }} />
            {m > 0 && <motion.div className="h-full bg-rose" initial={{ width: 0 }} whileInView={{ width: `${m * 6}%` }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.1 }} />}
          </div>
          <span className={m > 0 ? "text-rose" : "text-white/40"}>{m}%</span>
        </div>
      ))}
    </div>
  );
}

function SQLVisual() {
  return (
    <div className="mt-6 space-y-2 font-mono text-[11.5px]">
      <div className="w-fit rounded-xl rounded-bl-sm bg-white/[0.06] px-3 py-2 text-white/85">कौनसे शहर में सबसे ज़्यादा sales हुई?</div>
      <pre className="rounded-xl border border-white/[0.07] bg-ink-950 p-3 leading-relaxed text-cyan">
{`SELECT city, SUM(revenue) AS sales
FROM orders
GROUP BY city
ORDER BY sales DESC LIMIT 1;`}
      </pre>
      <div className="flex items-center gap-2 text-[11px] text-mute"><CheckCircle2 size={12} className="text-lime" /> Mumbai · ₹2.24L · ran in 9 ms</div>
    </div>
  );
}

function DashVisual() {
  const bars = [40, 62, 48, 80, 66, 92, 74];
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {["Revenue", "Orders", "AOV"].map((k, i) => (
        <div key={k} className="rounded-lg border border-white/[0.06] bg-ink-950/80 p-2">
          <div className="text-[9px] uppercase tracking-wider text-mute">{k}</div>
          <div className="text-sm font-semibold">{["₹11.2L", "5,940", "₹189"][i]}</div>
        </div>
      ))}
      <div className="col-span-2 flex h-24 items-end gap-1.5 rounded-lg border border-white/[0.06] bg-ink-950/80 p-2">
        {bars.map((b, i) => (
          <motion.div key={i} className="flex-1 rounded-t bg-cyan/80" initial={{ height: 0 }} whileInView={{ height: `${b}%` }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.6 }} />
        ))}
      </div>
      <div className="grid place-items-center rounded-lg border border-white/[0.06] bg-ink-950/80 p-2">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#1B9FC0" strokeWidth="6" strokeDasharray="40 100" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#74A313" strokeWidth="6" strokeDasharray="25 100" strokeDashoffset="-41" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#8B7CFF" strokeWidth="6" strokeDasharray="21 100" strokeDashoffset="-67" />
        </svg>
      </div>
    </div>
  );
}

function AnomalyVisual() {
  const pts = [30, 34, 31, 36, 38, 35, 40, 39, 12, 14, 37, 41, 44, 43];
  const w = 300,
    h = 90;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * w},${h - (p / 50) * h}`).join(" ");
  return (
    <div className="relative mt-6">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full overflow-visible" preserveAspectRatio="none">
        <motion.path d={path} fill="none" stroke="#3DE0FF" strokeWidth="2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6 }} />
        <circle cx={(8 / 13) * w} cy={h - (12 / 50) * h} r="10" fill="#FF5C5C" opacity=".2" className="animate-ping" style={{ transformOrigin: `${(8 / 13) * w}px ${h - (12 / 50) * h}px` }} />
        <circle cx={(8 / 13) * w} cy={h - (12 / 50) * h} r="5" fill="#FF5C5C" stroke="#0A0D18" strokeWidth="2" />
      </svg>
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.2 }} className="mt-3 flex items-start gap-2 rounded-xl border border-rose/30 bg-ink-900/95 p-2.5 text-[11px] shadow-xl">
        <Bell size={13} className="mt-0.5 shrink-0 text-rose" />
        <span className="text-white/85"><b className="text-white">Revenue −64%</b> on 18 Feb vs 14-day baseline. Likely outage — 3 cities affected.</span>
      </motion.div>
    </div>
  );
}

const FEATURES = [
  { title: "Auto Data Profiling", desc: "Upload a file and get column types, distributions, missing values, duplicates and a 0–100 quality score before you’ve finished your chai.", visual: <ProfilingVisual />, span: "lg:col-span-3", tag: "CORE" },
  { title: "Natural Language → SQL", desc: "Ask in English, Hindi or Hinglish. Get clean SQL, run it in-browser in milliseconds, and see every clause explained.", visual: <SQLVisual />, span: "lg:col-span-3" },
  { title: "Smart Dashboards", desc: "DataOps reads the shape of your data and builds the right KPI cards and charts automatically — export-ready for Power BI.", visual: <DashVisual />, span: "lg:col-span-3" },
  { title: "Anomaly Watch", desc: "Rolling z-score monitoring on your key metrics. Spikes and drops are flagged with context — it keeps watching while you sleep.", visual: <AnomalyVisual />, span: "lg:col-span-3", tag: "NEW" },
];

export function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-40 mask-fade-b" />
      <div className="container-x">
        <SectionHeading eyebrow="Features" title={<>Everything an analyst needs. <span className="text-grad">Nothing they don’t.</span></>} sub="From messy CSV to a stakeholder-ready story — every step of the workflow, automated and explainable." />
        <div className="mt-16 grid gap-4 lg:grid-cols-6">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className={f.span}>
              <Spotlight className="card group h-full p-6 transition-colors hover:border-white/15 sm:p-7">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  {f.tag && <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${f.tag === "NEW" ? "bg-lime text-ink-950" : "bg-white/10 text-white/70"}`}>{f.tag}</span>}
                </div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-mute">{f.desc}</p>
                {f.visual}
              </Spotlight>
            </Reveal>
          ))}
          {[
            { icon: LockKeyhole, t: "Private by default", d: "Files are parsed in your browser, your workspace is private to your account, and raw rows never reach the AI." },
            { icon: Languages, t: "Hindi + English", d: "Ask questions the way you think. Hinglish welcome." },
            { icon: FileSpreadsheet, t: "Export anywhere", d: "Cleaned CSV, SQL, PDF reports and Power BI-ready layouts." },
          ].map((x, i) => (
            <Reveal key={x.t} delay={0.1 + i * 0.06} className="lg:col-span-2">
              <Spotlight className="card flex h-full items-start gap-4 p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"><x.icon size={18} className="text-lime" /></span>
                <div>
                  <h4 className="font-medium text-white">{x.t}</h4>
                  <p className="mt-1 text-sm text-mute">{x.d}</p>
                </div>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- How it works ------------------------------ */
export function HowItWorks() {
  const steps = [
    { icon: Upload, t: "Drop your data", d: "CSV from Excel, Google Sheets, your SQL export or one of our sample datasets." },
    { icon: MessagesSquare, t: "Ask your team", d: "Chat with any of the five agents. They profile, query and chart in seconds." },
    { icon: Rocket, t: "Act on insights", d: "Share an executive summary, export clean data, set anomaly alerts." },
  ];
  return (
    <section className="py-24">
      <div className="container-x">
        <SectionHeading eyebrow="How it works" title={<>From upload to insight in <span className="text-grad">under 60 seconds</span></>} />
        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-lime/0 via-lime/40 to-violet/0 md:block" />
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.12} className="relative text-center">
              <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-ink-850 shadow-[0_0_40px_-10px_rgba(198,255,61,.4)]">
                <s.icon size={24} className="text-lime" />
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-lime font-mono text-[11px] font-bold text-ink-950">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{s.t}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-mute">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Stats ----------------------------------- */
export function Stats() {
  const s = [
    ["5", "specialised AI agents working as one team"],
    ["< 50 ms", "typical in-browser SQL query time"],
    ["0", "raw rows sent to the AI — only a statistical profile"],
    ["60 sec", "from CSV upload to executive summary"],
  ];
  return (
    <section className="py-10">
      <div className="container-x">
        <div className="card grid grid-cols-2 divide-white/[0.06] overflow-hidden lg:grid-cols-4 lg:divide-x">
          {s.map(([k, v], i) => (
            <Reveal key={k} delay={i * 0.08} className="p-6 text-center sm:p-8">
              <div className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{k}</div>
              <div className="mx-auto mt-2 max-w-[180px] text-xs text-mute sm:text-sm">{v}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Use cases -------------------------------- */
export const USE_CASES = [
  { id: "retail", icon: ShoppingCart, t: "Retail & Q-Commerce", d: "Track GMV, basket size, stock-outs and delivery SLAs across dark stores.", qs: ["Which category has the highest AOV in Pune?", "Show daily orders with anomalies", "Delivery time vs rating correlation"] },
  { id: "marketing", icon: Megaphone, t: "Marketing", d: "Compare channel ROAS, CAC and funnel conversion; find the next rupee's best home.", qs: ["ROAS by channel last 90 days", "Which campaign brought most new customers?", "Segment customers by spend"] },
  { id: "finance", icon: Landmark, t: "Finance", d: "Reconcile, forecast and explain variance without waiting on the BI team.", qs: ["Month-over-month revenue variance", "Top 10 expense lines", "Flag unusual transactions"] },
  { id: "ops", icon: Truck, t: "Operations", d: "Monitor throughput, delays and bottlenecks — with alerts before customers notice.", qs: ["P90 delivery time by city", "Which hub has the most late orders?", "Daily volume forecast"] },
  { id: "auto", icon: Car, t: "Automotive", d: "Price used-car inventory, spot depreciation curves and fast-moving models.", qs: ["Average price by brand and fuel", "Depreciation by car age", "Best-value SUVs under ₹10 lakh"] },
];

export function UseCasesPreview() {
  const [i, setI] = useState(0);
  const u = USE_CASES[i];
  return (
    <section id="use-cases" className="py-28">
      <div className="container-x">
        <SectionHeading eyebrow="Use cases" title={<>Built for <span className="text-grad">every team</span> that runs on data</>} />
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-2">
          {USE_CASES.map((x, k) => (
            <button key={x.id} onClick={() => setI(k)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${k === i ? "border-lime/50 bg-lime/10 text-white" : "border-white/10 text-white/60 hover:text-white"}`}>
              <x.icon size={15} /> {x.t}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card mx-auto mt-8 grid max-w-4xl gap-8 p-8 md:grid-cols-2">
            <div>
              <u.icon size={28} className="text-lime" />
              <h3 className="mt-4 text-2xl font-semibold text-white">{u.t}</h3>
              <p className="mt-2 text-mute">{u.d}</p>
              <Link href="/use-cases" className="mt-6 inline-flex items-center gap-1.5 text-sm text-lime hover:underline">
                Explore use cases <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-2.5">
              <div className="font-mono text-[11px] uppercase tracking-widest text-mute">Try asking</div>
              {u.qs.map((q) => (
                <div key={q} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-950/60 px-4 py-3 text-sm text-white/85">
                  <ScanSearch size={15} className="shrink-0 text-cyan" /> {q}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
