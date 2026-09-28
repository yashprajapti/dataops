"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { SectionHeading, Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    blurb: "For students and solo analysts getting started.",
    monthly: 0,
    cta: "Start free",
    href: "/signup",
    features: ["15 dataset uploads (up to 25 MB)", "All 5 AI agents", "Auto data profiling & cleaning", "Cleaned Excel + SQL file + PDF report", "Community support"],
  },
  {
    name: "Pro",
    blurb: "For analysts and teams who ship insights every week.",
    monthly: 799,
    popular: true,
    cta: "Start 14-day free trial",
    href: "/signup?plan=pro",
    features: ["Unlimited datasets (up to 200 MB)", "Unlimited AI questions", "Anomaly Watch + email alerts", "PDF executive reports", "Power BI / Excel exports", "Saved queries & history", "Priority support"],
  },
  {
    name: "Enterprise",
    blurb: "For organisations with security and scale needs.",
    monthly: null,
    cta: "Contact sales",
    href: "mailto:hello@dataops.app?subject=DataOps%20Enterprise",
    features: ["Everything in Pro", "SSO & role-based access", "Warehouse connectors (Postgres, BigQuery, Snowflake)", "Private LLM deployment", "Dedicated success manager", "99.9% uptime SLA"],
  },
];

const COMPARE: [string, (string | boolean)[]][] = [
  ["AI agents", ["All 5", "All 5", "All 5 + custom"]],
  ["Dataset uploads", ["15", "Unlimited", "Unlimited"]],
  ["Max file size", ["25 MB", "200 MB", "Custom"]],
  ["Natural-language SQL", [true, true, true]],
  ["Anomaly Watch", [false, true, true]],
  ["Excel, SQL & PDF reports", [true, true, true]],
  ["Team workspaces", [false, false, true]],
  ["SSO / SAML", [false, false, true]],
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  return (
    <section id="pricing" className="relative py-28">
      <div className="pointer-events-none absolute inset-x-0 top-40 -z-10 mx-auto h-[400px] max-w-4xl rounded-full bg-lime/[0.06] blur-[120px]" />
      <div className="container-x">
        <SectionHeading eyebrow="Pricing" title={<>Simple pricing. <span className="text-grad">Start free forever.</span></>} sub="No credit card to start. Upgrade when your data — or your team — outgrows the free plan." />

        <div className="mt-10 flex justify-center">
          <div className="relative flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm">
            {["Monthly", "Yearly"].map((l) => {
              const on = (l === "Yearly") === yearly;
              return (
                <button key={l} onClick={() => setYearly(l === "Yearly")} className={cn("relative z-10 rounded-full px-5 py-1.5 transition", on ? "text-ink-950" : "text-white/70")}>
                  {on && <motion.span layoutId="billing" className="absolute inset-0 -z-10 rounded-full bg-lime" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                  {l}
                  {l === "Yearly" && <span className={cn("ml-1.5 text-[11px] font-semibold", on ? "text-ink-950/70" : "text-lime")}>−20%</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const price = p.monthly === null ? null : yearly ? Math.round(p.monthly * 0.8) : p.monthly;
            return (
              <Reveal key={p.name} delay={i * 0.08}>
                <div className={cn("relative flex h-full flex-col rounded-3xl p-7", p.popular ? "border-glow bg-gradient-to-b from-ink-800 to-ink-900 shadow-[0_30px_80px_-30px_rgba(198,255,61,.35)]" : "card")}>
                  {p.popular && <span className="absolute -top-3 left-7 rounded-full bg-lime px-3 py-1 text-[11px] font-semibold text-ink-950">Most popular</span>}
                  <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                  <p className="mt-1 text-sm text-mute">{p.blurb}</p>
                  <div className="mt-6 flex items-end gap-1.5">
                    {price === null ? (
                      <span className="text-4xl font-semibold tracking-tight text-white">Custom</span>
                    ) : price === 0 ? (
                      <span className="text-4xl font-semibold tracking-tight text-white">₹0</span>
                    ) : (
                      <>
                        <span className="text-4xl font-semibold tracking-tight text-white">₹{price}</span>
                        <span className="pb-1 text-sm text-mute">/ user / mo</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 h-5 text-xs text-mute">{price ? (yearly ? `Billed ₹${price * 12} yearly` : "Billed monthly") : price === 0 ? "Free forever" : "Annual contract"}</div>
                  <Link href={p.href} className={cn("mt-6 w-full", p.popular ? "btn-primary h-11" : "btn-ghost h-11")}>
                    {p.cta}
                  </Link>
                  <ul className="mt-7 space-y-3 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-white/80">
                        <Check size={16} className="mt-0.5 shrink-0 text-lime" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-14">
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="p-4 font-medium text-mute">Compare plans</th>
                  {PLANS.map((p) => <th key={p.name} className="p-4 font-medium text-white">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([k, vals]) => (
                  <tr key={k} className="border-b border-white/[0.04] last:border-0">
                    <td className="p-4 text-white/70">{k}</td>
                    {vals.map((v, j) => (
                      <td key={j} className="p-4 text-white/85">
                        {v === true ? <Check size={16} className="text-lime" aria-label="Included" /> : v === false ? <Minus size={16} className="text-white/25" aria-label="Not included" /> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
