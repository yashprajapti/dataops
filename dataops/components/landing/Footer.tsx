"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Plus, Twitter } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";
import { SectionHeading, Reveal } from "@/components/ui/Reveal";

const FAQS = [
  ["Do I need to know SQL or Python?", "No. Ask in plain English (or Hindi/Hinglish). The SQL agent writes the query, runs it and explains it, so you learn as you go — and power users can edit the SQL directly."],
  ["Is my data safe?", "Files are parsed and analysed inside your browser. Your saved datasets live in a private workspace protected by row-level security, so only you can read them. The AI model only ever receives a compact statistical profile (column names, counts, averages) — never your raw rows."],
  ["Which file formats are supported?", "CSV today, which covers exports from Excel, Google Sheets, Power BI, MySQL, PostgreSQL and most tools. Native Excel and database connectors are on the roadmap."],
  ["Which AI model powers the agents?", "DataOps runs on Google Gemini when an API key is configured, and falls back to our built-in statistical engine, so it always works — even offline."],
  ["Can I use it for my college or portfolio projects?", "Yes — the Starter plan is free forever and includes all five agents. Load a sample dataset and you have a full case study in minutes."],
  ["Can I cancel anytime?", "Yes. Plans are month-to-month or yearly, and you can downgrade to Starter at any time without losing your datasets."],
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-28">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading center={false} eyebrow="FAQ" title={<>Questions? <span className="text-grad">Answered.</span></>} sub="Can’t find what you’re looking for? Reach out and a human will reply within a day." />
        <div className="space-y-3">
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.04}>
              <div className="card overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                  <span className="font-medium text-white">{q}</span>
                  <Plus size={18} className={`shrink-0 text-mute transition-transform duration-300 ${open === i ? "rotate-45 text-lime" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <p className="px-5 pb-5 text-sm leading-relaxed text-mute">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTA() {
  return (
    <section className="py-20">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-ink-900 px-6 py-20 text-center sm:px-16">
            <div className="bg-grid mask-radial absolute inset-0 opacity-60" />
            <div className="absolute left-1/2 top-0 h-80 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/20 blur-[100px]" />
            <div className="relative">
              <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                <span className="text-grad-soft">Stop wrangling data.</span>
                <br />
                <span className="text-grad">Start answering questions.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-mute">Join thousands of analysts who get from raw CSV to a decision in minutes, not days.</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary h-12 px-7 text-[15px]">
                  Start analysing free <ArrowRight size={16} />
                </Link>
                <Link href="/demo" className="btn-ghost h-12 px-7 text-[15px]">Explore the live demo</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    { h: "Product", l: [["Features", "/#features"], ["AI Agents", "/#agents"], ["Pricing", "/#pricing"], ["Live demo", "/demo"], ["Changelog", "/blog"]] },
    { h: "Resources", l: [["Documentation", "/docs"], ["Blog", "/blog"], ["Sample datasets", "/datasets"], ["Use cases", "/use-cases"], ["API status", "/api/health"]] },
    { h: "Company", l: [["About", "/docs#about"], ["Contact", `mailto:${SITE.email}`], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
  ];
  return (
    <footer className="border-t border-white/[0.06] pt-16">
      <div className="container-x grid gap-10 pb-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-mute">{SITE.tagline}. Five AI agents that clean, query, visualise and explain your data.</p>
          <form onSubmit={(e) => { e.preventDefault(); (e.currentTarget.querySelector("button") as HTMLButtonElement).textContent = "Subscribed ✓"; }} className="mt-6 flex max-w-sm gap-2">
            <input type="email" required placeholder="you@company.com" className="input" aria-label="Email for newsletter" />
            <button className="btn-primary shrink-0">Subscribe</button>
          </form>
          <p className="mt-2 text-xs text-mute">Monthly data tips. No spam.</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="text-sm font-medium text-white">{c.h}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.l.map(([t, h]) => (
                <li key={t}>
                  <Link href={h} className="text-sm text-mute transition hover:text-white">{t}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-mute sm:flex-row">
          <span>© {new Date().getFullYear()} {SITE.name}. Designed & built by {SITE.owner}.</span>
          <div className="flex items-center gap-2">
            {[
              [Github, SITE.socials.github, "GitHub"],
              [Linkedin, SITE.socials.linkedin, "LinkedIn"],
              [Twitter, SITE.socials.x, "X"],
            ].map(([I, h, l]: any) => (
              <a key={l} href={h} target="_blank" rel="noreferrer" aria-label={l} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:border-lime/40 hover:text-lime">
                <I size={15} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none select-none overflow-hidden">
        <div className="text-grad-soft -mb-[4vw] text-center text-[19vw] font-semibold leading-none tracking-[-0.06em] opacity-[0.07]">DataOps</div>
      </div>
    </footer>
  );
}
