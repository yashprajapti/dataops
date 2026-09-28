"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Loader2, MailCheck } from "lucide-react";
import { AuthShell, Divider, SocialButtons } from "@/components/AuthShell";
import { isEmail, passwordStrength, register, socialSignIn, type AuthResult } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const LABELS = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
const COLORS = ["bg-rose", "bg-rose", "bg-amber", "bg-lime", "bg-lime"];

export default function SignupPage() {
  const { login, updateUser, hydrateCloud } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Data Analyst");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const strength = passwordStrength(password);

  async function finish(res: AuthResult) {
    if (res.status === "redirecting") return;
    if (res.status === "confirm-email") { setConfirmFor(res.email); setLoading(false); return; }
    if (res.cloud) {
      const ok = await hydrateCloud();
      if (!ok) { setErr("Account created, but your workspace couldn’t load. Check that the database schema is installed."); setLoading(false); return; }
    } else {
      login(res.email, res.name);
      updateUser({ role });
    }
    router.push("/dashboard?welcome=1");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (name.trim().length < 2) return setErr("Tell us your name.");
    if (!isEmail(email)) return setErr("Enter a valid email address.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    setLoading(true);
    try { await finish(await register(name, email, password, role)); }
    catch (e: any) { setErr(e.message); setLoading(false); }
  }

  if (confirmFor)
    return (
      <AuthShell>
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-lime/30 bg-lime/10"><MailCheck className="text-lime" /></div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Check your inbox</h1>
        <p className="mt-3 text-sm text-mute">We sent a confirmation link to <span className="text-white">{confirmFor}</span>. Click it to activate your account — you’ll land straight in your workspace.</p>
        <p className="mt-2 text-xs text-mute">Didn’t get it? Check spam, or wait a minute and sign up again.</p>
        <Link href="/login" className="btn-ghost mt-8 h-11 w-full">Back to log in</Link>
      </AuthShell>
    );

  return (
    <AuthShell>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Create your workspace</h1>
      <p className="mt-2 text-sm text-mute">Free forever on Starter. No credit card required.</p>
      <div className="mt-8">
        <SocialButtons onClick={async (p) => { setErr(""); try { await finish(await socialSignIn(p as any)); } catch (e: any) { setErr(e.message); } }} />
      </div>
      <Divider label="or sign up with email" />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/70">Full name</span>
          <input className="input h-11" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/70">Work email</span>
          <input className="input h-11" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/70">I am a…</span>
          <select className="input h-11" value={role} onChange={(e) => setRole(e.target.value)}>
            {["Data Analyst", "Business Analyst", "Data Scientist", "Student", "Product Manager", "Founder", "Marketer", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/70">Password</span>
          <input className="input h-11" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full transition", i < strength ? COLORS[strength] : "bg-white/10")} />)}
              </div>
              <div className="mt-1 text-[11px] text-mute">{LABELS[strength]}</div>
            </div>
          )}
        </label>
        {err && <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{err}</p>}
        <button disabled={loading} className="btn-primary h-11 w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
        </button>
      </form>
      <ul className="mt-6 space-y-1.5 text-xs text-mute">
        {["All 5 AI agents included", "3 sample datasets preloaded", "Your workspace saved to your account"].map((t) => (
          <li key={t} className="flex items-center gap-2"><Check size={13} className="text-lime" /> {t}</li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-mute">
        Already have an account? <Link href="/login" className="font-medium text-white hover:text-lime">Log in</Link>
      </p>
    </AuthShell>
  );
}
