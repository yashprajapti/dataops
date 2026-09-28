"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Briefcase, Mail, CalendarDays, Shuffle, Database, MessageSquare, Zap } from "lucide-react";
import { useApp } from "@/lib/store";
import { AGENTS } from "@/lib/agents";
import { AgentBadge } from "@/components/ui/AgentIcon";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Panel } from "@/components/dash/Shell";

export default function ProfilePage() {
  const { user, updateUser, datasets, chats, usage } = useApp();
  const [form, setForm] = useState({ name: "", role: "", company: "", location: "", bio: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, role: user.role, company: user.company, location: user.location, bio: user.bio });
  }, [user]);

  if (!user) return null;
  const perAgent = AGENTS.map((a) => ({ a, n: Math.ceil((chats[a.id]?.length || 0) / 2) }));
  const totalQ = perAgent.reduce((s, x) => s + x.n, 0);

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateUser(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Profile" sub="How you appear across your DataOps workspace and shared reports." />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-lime/30 via-cyan/25 to-violet/30" />
            <div className="-mt-12 px-6 pb-6">
              <div className="relative w-fit">
                <Avatar seed={user.avatarSeed} name={user.name} src={user.avatarUrl} className="h-24 w-24 border-4 border-ink-850 text-2xl" />
                <button title="New avatar" onClick={() => updateUser({ avatarSeed: Math.random().toString(36).slice(2), avatarUrl: null })} className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-ink-800 text-white/80 hover:text-lime">
                  <Shuffle size={13} />
                </button>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{user.name}</h2>
              <p className="text-sm text-mute">{user.role}{user.company ? ` · ${user.company}` : ""}</p>
              {user.bio && <p className="mt-3 text-sm text-white/75">{user.bio}</p>}
              <ul className="mt-4 space-y-2 text-sm text-mute">
                <li className="flex items-center gap-2"><Mail size={14} /> {user.email}</li>
                {user.location && <li className="flex items-center gap-2"><MapPin size={14} /> {user.location}</li>}
                {user.company && <li className="flex items-center gap-2"><Briefcase size={14} /> {user.company}</li>}
                <li className="flex items-center gap-2"><CalendarDays size={14} /> Joined {new Date(user.joined).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</li>
              </ul>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-lime/15 px-3 py-1 text-xs font-medium text-lime"><Zap size={12} /> {user.plan} plan</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              [Database, datasets.length, "Datasets"],
              [MessageSquare, totalQ, "Questions"],
              [Zap, usage.tokens > 999 ? `${(usage.tokens / 1000).toFixed(1)}k` : usage.tokens, "Tokens"],
            ].map(([I, v, l]: any) => (
              <div key={l} className="card p-3 text-center">
                <I size={15} className="mx-auto text-lime" />
                <div className="mt-1.5 text-lg font-semibold text-white">{v}</div>
                <div className="text-[11px] text-mute">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Edit profile">
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              {[
                ["name", "Full name"],
                ["role", "Role / title"],
                ["company", "Company or college"],
                ["location", "Location"],
              ].map(([k, l]) => (
                <label key={k} className="block">
                  <span className="mb-1.5 block text-xs text-white/70">{l}</span>
                  <input className="input" value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-white/70">Bio</span>
                <textarea rows={3} className="input resize-none" placeholder="A line about what you analyse…" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button className="btn-primary">{saved ? <><Check size={15} /> Saved</> : "Save changes"}</button>
                <span className="text-xs text-mute">Changes appear on your reports instantly.</span>
              </div>
            </form>
          </Panel>

          <Panel title="Agent activity" sub="Questions asked per agent">
            <ul className="space-y-3">
              {perAgent.map(({ a, n }) => (
                <li key={a.id} className="flex items-center gap-3">
                  <AgentBadge agent={a} size={30} />
                  <span className="w-40 truncate text-sm text-white/85">{a.name}</span>
                  <div className="h-2 flex-1 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${totalQ ? (n / Math.max(...perAgent.map((x) => x.n))) * 100 : 0}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm tabular-nums text-white">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
