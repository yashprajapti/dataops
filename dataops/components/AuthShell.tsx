"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { AGENTS } from "@/lib/agents";
import { AgentBadge } from "@/components/ui/AgentIcon";

const QUOTES = [
  ["“The Cleaner agent caught 400 duplicate orders our pipeline had been double-counting for months.”", "Ananya Iyer · Senior Data Analyst"],
  ["“I ask in Hinglish, it gives me SQL I’d actually commit.”", "Rahul Mehta · BI Lead"],
  ["“Anomaly Watch pinged us about an outage before support did.”", "Daniel Brooks · Head of Analytics"],
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setQ((x) => (x + 1) % QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-center text-xs text-mute">
          By continuing you agree to our <Link href="/terms" className="underline hover:text-white">Terms</Link> and <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
        </p>
      </section>

      <section className="relative hidden overflow-hidden border-l border-white/[0.06] bg-ink-900 lg:block">
        <div className="bg-grid mask-radial absolute inset-0 opacity-60" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/10 blur-[120px]" />
        {/* orbit of agents */}
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[380px] w-[380px]">
            <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-12 rounded-full border border-dashed border-white/[0.08]" />
            <div className="absolute inset-0 animate-[spin_40s_linear_infinite]">
              {AGENTS.map((a, i) => {
                const ang = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <div key={a.id} className="absolute" style={{ left: 190 + Math.cos(ang) * 190 - 26, top: 190 + Math.sin(ang) * 190 - 26 }}>
                    <div className="animate-[spin_40s_linear_infinite_reverse]">
                      <AgentBadge agent={a} size={52} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border border-white/10 bg-ink-850 shadow-[0_0_80px_-10px_rgba(198,255,61,.35)]">
              <svg viewBox="0 0 32 32" className="h-12 w-12">
                <defs>
                  <linearGradient id="og" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#C6FF3D" /><stop offset=".55" stopColor="#3DE0FF" /><stop offset="1" stopColor="#8B7CFF" /></linearGradient>
                </defs>
                <rect x="6" y="17" width="5" height="10" rx="2" fill="url(#og)" /><rect x="13.5" y="11" width="5" height="16" rx="2" fill="url(#og)" /><rect x="21" y="5" width="5" height="22" rx="2" fill="url(#og)" />
              </svg>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-12">
          <AnimatePresence mode="wait">
            <motion.blockquote key={q} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md">
              <p className="text-xl leading-snug text-white">{QUOTES[q][0]}</p>
              <footer className="mt-3 text-sm text-mute">{QUOTES[q][1]}</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

export function SocialButtons({ onClick }: { onClick: (provider: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button type="button" onClick={() => onClick("google")} className="btn-ghost h-11">
        <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" /></svg>
        Google
      </button>
      <button type="button" onClick={() => onClick("github")} className="btn-ghost h-11">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17 4.9 18 5.2 18 5.2c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" /></svg>
        GitHub
      </button>
    </div>
  );
}

export function Divider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-mute">
      <span className="h-px flex-1 bg-white/10" /> {label} <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
