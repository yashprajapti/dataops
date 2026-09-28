"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { completeRedirect, updatePassword } from "@/lib/auth";
import { useApp } from "@/lib/store";

/** Opened from the "reset password" email */
export default function ResetPassword() {
  const { hydrateCloud } = useApp();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");
  const [err, setErr] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    completeRedirect().then((r) => {
      if (r.ok) setState("ready");
      else { setErr(r.error || "This reset link is invalid or has expired."); setState("error"); }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== pw2) return setErr("Passwords don’t match.");
    setSaving(true);
    try {
      await updatePassword(pw);
      await hydrateCloud();
      router.replace("/dashboard");
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <AuthShell>
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-lime/30 bg-lime/10"><KeyRound className="text-lime" /></div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Set a new password</h1>
      {state === "checking" && <p className="mt-4 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="animate-spin" /> Verifying your link…</p>}
      {state === "error" && (
        <>
          <p className="mt-4 rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">{err}</p>
          <Link href="/login" className="btn-ghost mt-6 h-11 w-full">Back to log in</Link>
        </>
      )}
      {state === "ready" && (
        <form onSubmit={save} className="mt-6 space-y-4">
          <input className="input h-11" type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <input className="input h-11" type="password" autoComplete="new-password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {err && <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{err}</p>}
          <button disabled={saving} className="btn-primary h-11 w-full">{saving ? <Loader2 size={16} className="animate-spin" /> : "Update password"}</button>
        </form>
      )}
    </AuthShell>
  );
}
