"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, PlayCircle, MailCheck } from "lucide-react";
import { AuthShell, Divider, SocialButtons } from "@/components/AuthShell";
import { authenticate, isEmail, sendPasswordReset, socialSignIn } from "@/lib/auth";
import { useApp } from "@/lib/store";

export default function LoginPage() {
  const { login, hydrateCloud, user, ready, mode } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // already signed in with a real account → straight to the workspace
  useEffect(() => {
    if (ready && user && mode === "cloud") router.replace("/dashboard");
  }, [ready, user, mode, router]);

  async function finish(res: Awaited<ReturnType<typeof authenticate>>) {
    if (res.status === "redirecting") return;
    if (res.status === "confirm-email") { setInfo(`Check ${res.email} for a confirmation link.`); setLoading(false); return; }
    if (res.cloud) {
      const ok = await hydrateCloud();
      if (!ok) { setErr("Signed in, but your workspace couldn’t load. Check that the database schema is installed."); setLoading(false); return; }
    } else {
      login(res.email, res.name);
    }
    router.push("/dashboard");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setInfo("");
    if (!isEmail(email)) return setErr("Enter a valid email address.");
    if (!password) return setErr("Enter your password.");
    setLoading(true);
    try { await finish(await authenticate(email, password)); }
    catch (e: any) { setErr(e.message); setLoading(false); }
  }

  async function forgot() {
    setErr(""); setInfo("");
    if (!isEmail(email)) return setErr("Type your email above first, then click “Forgot?”.");
    try { await sendPasswordReset(email); setInfo(`Password reset link sent to ${email.trim()}.`); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <AuthShell>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
      <p className="mt-2 text-sm text-mute">Log in to your DataOps workspace.</p>
      <div className="mt-8">
        <SocialButtons onClick={async (p) => { setErr(""); try { await finish(await socialSignIn(p as any)); } catch (e: any) { setErr(e.message); } }} />
      </div>
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/70">Email</span>
          <input className="input h-11" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-xs font-medium text-white/70">
            Password
            <button type="button" onClick={forgot} className="text-lime/80 hover:text-lime">Forgot?</button>
          </span>
          <div className="relative">
            <input className="input h-11 pr-10" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" aria-label="Toggle password" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-white">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {err && <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{err}</p>}
        {info && <p className="flex items-center gap-2 rounded-lg border border-lime/30 bg-lime/10 px-3 py-2 text-xs text-lime"><MailCheck size={14} /> {info}</p>}
        <button disabled={loading} className="btn-primary h-11 w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Log in <ArrowRight size={15} /></>}
        </button>
      </form>
      <Link href="/demo" className="btn-ghost mt-3 h-11 w-full">
        <PlayCircle size={16} className="text-cyan" /> Explore the demo workspace
      </Link>
      <p className="mt-8 text-center text-sm text-mute">
        New to DataOps? <Link href="/signup" className="font-medium text-white hover:text-lime">Create an account</Link>
      </p>
    </AuthShell>
  );
}
