"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Star } from "lucide-react";
import { HeroPreview } from "./HeroPreview";
import { Avatar } from "@/components/ui/Avatar";

const avatars = ["Aarav", "Meera", "Kabir", "Sana", "Rohan"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid mask-radial absolute inset-0 opacity-70" />
        <div className="absolute left-1/2 top-[-10%] h-[620px] w-[620px] -translate-x-[85%] animate-float rounded-full bg-lime/[0.13] blur-[120px]" />
        <div className="absolute left-1/2 top-[-5%] h-[560px] w-[560px] -translate-x-[5%] animate-float rounded-full bg-cyan/[0.13] blur-[120px] [animation-delay:-5s]" />
        <div className="absolute left-1/2 top-[25%] h-[520px] w-[520px] translate-x-[10%] animate-float rounded-full bg-violet/[0.14] blur-[130px] [animation-delay:-9s]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime/50 to-transparent" />
      </div>

      <div className="container-x text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/#features" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-white/80 backdrop-blur transition hover:border-lime/40">
            <span className="rounded-full bg-lime px-2 py-0.5 font-semibold text-ink-950">NEW</span>
            Anomaly Watch — your data, monitored 24/7
            <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-5xl text-balance text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-[88px]"
        >
          <span className="text-grad-soft">Your AI data analyst</span>
          <br />
          <span className="relative inline-block">
            <span className="text-grad">team, on demand.</span>
            <motion.svg viewBox="0 0 300 12" className="absolute -bottom-2 left-0 w-full" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}>
              <motion.path d="M2 9 C 80 2, 200 2, 298 8" fill="none" stroke="url(#ul)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.9 }} />
              <defs>
                <linearGradient id="ul">
                  <stop stopColor="#C6FF3D" />
                  <stop offset="1" stopColor="#8B7CFF" />
                </linearGradient>
              </defs>
            </motion.svg>
          </span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }} className="mx-auto mt-7 max-w-2xl text-pretty text-base text-mute sm:text-lg">
          Five specialised AI agents clean, query, visualise and explain your data. Drop in a CSV, ask in plain English — get SQL, charts and a boardroom-ready summary in seconds.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary h-12 px-6 text-[15px]">
            Start analysing free <ArrowRight size={16} />
          </Link>
          <Link href="/demo" className="btn-ghost h-12 px-6 text-[15px]">
            <PlayCircle size={17} className="text-cyan" /> Try the live demo
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex items-center justify-center gap-3 text-sm text-mute">
          <div className="flex -space-x-2">
            {avatars.map((a) => (
              <Avatar key={a} seed={a} name={a} className="h-8 w-8 border-2 border-ink-950" />
            ))}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-0.5 text-amber">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={12} fill="currentColor" />
              ))}
              <span className="ml-1.5 text-xs text-white">4.9/5</span>
            </div>
            <div className="text-xs">Loved by <span className="text-white">12,000+</span> analysts</div>
          </div>
        </motion.div>

        <div className="mt-16 sm:mt-20">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
