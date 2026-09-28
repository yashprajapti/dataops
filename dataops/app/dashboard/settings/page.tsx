"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader, Panel } from "@/components/dash/Shell";
import { cn } from "@/lib/utils";

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.06] p-4 text-left">
      <div>
        <div className="text-sm text-white">{label}</div>
        <div className="text-xs text-mute">{sub}</div>
      </div>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-lime" : "bg-white/10")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, resetAll, mode, cloudEnabled, user } = useApp();
  const router = useRouter();
  const [key, setKey] = useState(settings.geminiKey);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [msg, setMsg] = useState("");

  async function test() {
    setStatus("testing");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent: "advisor", messages: [{ role: "user", content: "Reply with the single word: connected" }], apiKey: key }) });
      const d = await res.json();
      if (d.text) { setStatus("ok"); setMsg("Connected to Gemini ✓"); updateSettings({ geminiKey: key.trim() }); }
      else { setStatus("fail"); setMsg(d.reason === "no-key" ? "Enter a key first." : `Gemini rejected the request (${d.reason}).`); }
    } catch { setStatus("fail"); setMsg("Network error."); }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="Settings" sub="AI engine, alerts and workspace preferences." />
      <div className="space-y-4">
        <Panel title="Account & storage">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-4">
            <span className={cn("h-2.5 w-2.5 rounded-full", mode === "cloud" ? "bg-lime" : "bg-amber")} />
            <div className="text-sm">
              <div className="text-white">{mode === "cloud" ? "Cloud account" : "Demo workspace (this browser only)"}</div>
              <div className="text-xs text-mute">
                {mode === "cloud"
                  ? `Signed in as ${user?.email}. Datasets, chats and settings are saved to your account and available on any device.`
                  : cloudEnabled
                    ? "Nothing here is saved to a server. Create an account to keep your work across devices."
                    : "Cloud accounts are not configured on this deployment (add Supabase keys)."}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><KeyRound size={15} className="text-lime" /> AI engine</span>} sub="DataOps works out of the box with its built-in analysis engine. Add a free Google Gemini key for fully generative answers.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input type={show ? "text" : "password"} className="input h-11 pr-10 font-mono" placeholder="AIza…" value={key} onChange={(e) => { setKey(e.target.value); setStatus("idle"); }} />
              <button type="button" aria-label="Toggle key" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-white">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
            <button onClick={test} disabled={status === "testing"} className="btn-primary h-11">{status === "testing" ? <Loader2 size={15} className="animate-spin" /> : "Test & save"}</button>
            {settings.geminiKey && <button onClick={() => { updateSettings({ geminiKey: "" }); setKey(""); setStatus("idle"); }} className="btn-ghost h-11">Remove</button>}
          </div>
          {msg && status !== "idle" && <p className={cn("mt-2 text-xs", status === "ok" ? "text-lime" : "text-rose")}>{msg}</p>}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-cyan hover:underline">Get a free Gemini API key <ExternalLink size={11} /></a>
          <p className="mt-2 text-xs text-mute">Your key is stored only in this browser (never in your cloud profile) and sent to our server route solely to call Gemini. Site owners can instead set <code className="font-mono text-lime">GEMINI_API_KEY</code> on Vercel.</p>
        </Panel>

        <Panel title="Notifications">
          <div className="space-y-2">
            <Toggle on={settings.emailAlerts} onChange={(v) => updateSettings({ emailAlerts: v })} label="Anomaly alerts" sub="Get notified when Anomaly Watch flags a critical spike or drop." />
            <Toggle on={settings.weeklyDigest} onChange={(v) => updateSettings({ weeklyDigest: v })} label="Weekly digest" sub="A Monday summary of your KPIs from the Advisor agent." />
          </div>
        </Panel>

        <Panel title="Anomaly sensitivity" sub="Lower = more alerts. Default is 3.0σ.">
          <input type="range" min={1.5} max={4} step={0.1} value={settings.anomalyThreshold} onChange={(e) => updateSettings({ anomalyThreshold: Number(e.target.value) })} className="w-full accent-[#C6FF3D]" />
          <div className="mt-1 font-mono text-sm text-white">{settings.anomalyThreshold.toFixed(1)}σ</div>
        </Panel>

        <section className="rounded-2xl border border-rose/25 bg-rose/[0.04] p-5">
          <h3 className="flex items-center gap-2 font-medium text-rose"><AlertTriangle size={15} /> Danger zone</h3>
          <p className="mt-1 text-sm text-mute">{mode === "cloud" ? "Delete all datasets, chats and settings saved to your account, then sign out." : "Delete all datasets, chats and settings stored in this browser and sign out."}</p>
          <button onClick={async () => { if (confirm("Reset your workspace? All datasets and chats will be deleted. This cannot be undone.")) { await resetAll(); router.push("/"); } }} className="btn mt-4 border border-rose/40 text-rose hover:bg-rose/10">Reset workspace</button>
        </section>
        {settings.geminiKey && <p className="flex items-center gap-1.5 text-xs text-lime"><Check size={12} /> Gemini key saved</p>}
      </div>
    </div>
  );
}
