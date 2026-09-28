"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { completeRedirect } from "@/lib/auth";
import { useApp } from "@/lib/store";

/** Landing page for Google sign-in and email-confirmation links */
export default function AuthCallback() {
  const { hydrateCloud } = useApp();
  const router = useRouter();
  const [err, setErr] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const r = await completeRedirect();
      if (!r.ok) return setErr(r.error || "Sign-in failed.");
      const ok = await hydrateCloud();
      if (!ok) return setErr("Signed in, but your workspace couldn’t load. Check that the database schema is installed.");
      router.replace("/dashboard?welcome=1");
    })();
  }, [hydrateCloud, router]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <LogoMark className={err ? "h-12 w-12" : "h-12 w-12 animate-pulse"} />
        {err ? (
          <>
            <p className="text-sm text-white">{err}</p>
            <Link href="/login" className="btn-primary">Go to log in</Link>
          </>
        ) : (
          <p className="text-sm text-mute">Signing you in…</p>
        )}
      </div>
    </main>
  );
}
