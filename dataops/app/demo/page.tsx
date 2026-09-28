"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { LogoMark } from "@/components/Logo";

export default function DemoPage() {
  const { ready, login, user } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!user) login("demo@dataops.app", "Demo Analyst");
    const t = setTimeout(() => router.replace("/dashboard"), 700);
    return () => clearTimeout(t);
  }, [ready, user, login, router]);
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark className="h-12 w-12 animate-pulse" />
        <p className="text-sm text-mute">Spinning up your demo workspace…</p>
      </div>
    </main>
  );
}
