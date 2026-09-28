"use client";
import { motion } from "framer-motion";

export function Reveal({ children, delay = 0, className, y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ eyebrow, title, sub, center = true }: { eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <span className="eyebrow">
        <span className="h-1.5 w-1.5 rounded-full bg-lime" />
        {eyebrow}
      </span>
      <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.05]">{title}</h2>
      {sub && <p className="mt-4 text-pretty text-base text-mute sm:text-lg">{sub}</p>}
    </Reveal>
  );
}
