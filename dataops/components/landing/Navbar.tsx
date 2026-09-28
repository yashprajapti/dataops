"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-3 pl-4 transition-all duration-500",
          scrolled ? "glass shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)]" : "border border-transparent"
        )}
      >
        <Logo />
        <ul className="hidden items-center gap-0.5 lg:flex">
          {SITE.nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="rounded-lg px-3 py-2 text-[13.5px] text-white/65 transition hover:bg-white/[0.05] hover:text-white">
                {n.label}
                {n.label === "Demo" && <span className="ml-1.5 rounded-md bg-lime/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-lime">Live</span>}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="rounded-lg px-3 py-2 text-[13.5px] text-white/75 hover:text-white">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary !py-2">
            Start free <ArrowRight size={15} />
          </Link>
        </div>
        <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-white lg:hidden">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass mx-auto mt-2 max-w-6xl rounded-2xl p-3 lg:hidden"
          >
            {SITE.nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/5">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" className="btn-ghost">Log in</Link>
              <Link href="/signup" className="btn-primary">Start free</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
