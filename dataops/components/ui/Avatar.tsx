"use client";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";

const GRADS = ["from-lime/70 to-cyan/70", "from-cyan/70 to-violet/70", "from-violet/70 to-rose/70", "from-amber/70 to-rose/70", "from-lime/60 to-violet/60"];

/** DiceBear avatar with a local gradient-initials fallback (works offline too). */
export function Avatar({ seed, name, className, style = "notionists", src }: { seed: string; name?: string; className?: string; style?: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const g = GRADS[[...seed].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADS.length];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br text-[11px] font-semibold text-ink-950", g, className)}>
      {initials(name || seed)}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1e2540`}
          referrerPolicy="no-referrer"
          alt={name || ""}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full bg-ink-700"
          loading="lazy"
        />
      )}
    </span>
  );
}
