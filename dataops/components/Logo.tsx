import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <defs>
        <linearGradient id="dlg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#C6FF3D" />
          <stop offset=".55" stopColor="#3DE0FF" />
          <stop offset="1" stopColor="#8B7CFF" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0A0D18" stroke="url(#dlg)" strokeOpacity=".55" />
      <rect x="8" y="17" width="4" height="8" rx="1.5" fill="url(#dlg)" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="url(#dlg)" />
      <rect x="20" y="7" width="4" height="18" rx="1.5" fill="url(#dlg)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-8deg]" />
      <span className="text-[17px] font-semibold tracking-tight text-white">
        Data<span className="text-grad">Ops</span>
      </span>
    </Link>
  );
}
