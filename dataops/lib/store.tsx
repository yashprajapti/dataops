"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AgentId } from "./agents";
import { getSample, SAMPLE_DATASETS, type Row } from "./sample-data";
import { autoClean, profileDataset, type DatasetProfile } from "./analytics";
import type { ChartSpec } from "./insights";
import { uid } from "./utils";
import {
  supabase, cloudEnabled, fetchWorkspace, fetchDatasetRows, upsertProfile, insertDataset, deleteDataset, upsertChat, wipeWorkspace, updateDatasetQueries,
} from "./cloud";

export interface User {
  id?: string; // Supabase user id (cloud mode)
  name: string;
  email: string;
  role: string;
  company: string;
  bio: string;
  location: string;
  avatarSeed: string;
  avatarUrl?: string | null;
  plan: "Starter" | "Pro" | "Enterprise";
  joined: number;
}

export interface Dataset {
  id: string;
  name: string;
  source: "sample" | "upload";
  sampleId?: string;
  rows?: Row[];
  rowCount?: number;
  createdAt: number;
  cleaned?: boolean;
  cleanLog?: string[];
  localOnly?: boolean; // too large for the cloud → kept for this session only
  parentId?: string; // for cleaned copies: the dataset they were cleaned from
  queries?: QueryEntry[]; // SQL run against this dataset (Studio + agents) — exported in the SQL file
}

export interface QueryEntry {
  sql: string;
  ts: number;
  rows: number;
  source: "studio" | "agent";
  question?: string;
}

/** Free-plan limits */
export const PLAN_LIMITS: Record<User["plan"], { uploads: number }> = {
  Starter: { uploads: 15 },
  Pro: { uploads: Infinity },
  Enterprise: { uploads: Infinity },
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  agent: AgentId;
  content: string;
  sql?: string;
  result?: { columns: string[]; rows: Row[]; error?: string; ms?: number };
  chart?: ChartSpec;
  charts?: ChartSpec[];
  followUps?: string[];
  engine?: "gemini" | "local";
  ts: number;
}

export interface Settings {
  geminiKey: string;
  anomalyThreshold: number;
  emailAlerts: boolean;
  weeklyDigest: boolean;
  compactMode: boolean;
}

interface State {
  user: User | null;
  datasets: Dataset[];
  activeId: string | null;
  chats: Record<string, ChatMessage[]>;
  settings: Settings;
  usage: { queries: number; tokens: number; uploads?: number };
}

export type Mode = "local" | "cloud";
export type SyncStatus = "idle" | "saving" | "saved" | "error";

const KEY = "dataops:v1";
const GEMINI_KEY = "dataops:gemini"; // the user's own API key never leaves this browser (not synced)
const DEFAULT_SETTINGS: Settings = { geminiKey: "", anomalyThreshold: 3, emailAlerts: true, weeklyDigest: true, compactMode: false };
const EMPTY: State = { user: null, datasets: [], activeId: null, chats: {}, settings: DEFAULT_SETTINGS, usage: { queries: 0, tokens: 0 } };

const readGemini = () => { try { return localStorage.getItem(GEMINI_KEY) || ""; } catch { return ""; } };

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, settings: { ...DEFAULT_SETTINGS, geminiKey: readGemini() } };
    const s = JSON.parse(raw);
    return { ...EMPTY, ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}), geminiKey: readGemini() || s.settings?.geminiKey || "" } };
  } catch {
    return EMPTY;
  }
}

interface Ctx extends State {
  ready: boolean;
  mode: Mode;
  cloudEnabled: boolean;
  sync: SyncStatus;
  syncError: string | null;
  login: (email: string, name?: string) => void;
  hydrateCloud: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (u: Partial<User>) => void;
  addUpload: (name: string, rows: Row[]) => string | null;
  uploadsUsed: number;
  uploadLimit: number;
  canUpload: boolean;
  logQuery: (datasetId: string, q: Omit<QueryEntry, "ts">) => void;
  addSample: (sampleId: string) => string;
  removeDataset: (id: string) => void;
  setActive: (id: string) => void;
  cleanDataset: (id: string) => string[];
  pushMessage: (m: ChatMessage) => void;
  patchMessage: (agent: AgentId, id: string, patch: Partial<ChatMessage>) => void;
  clearChat: (agent: AgentId) => void;
  updateSettings: (s: Partial<Settings>) => void;
  trackUsage: (tokens: number) => void;
  resetAll: () => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);

/** Keep saved chat history small (browser storage / database row size) */
const trimResult = (m: ChatMessage): ChatMessage => (m.result && m.result.rows.length > 200 ? { ...m, result: { ...m.result, rows: m.result.rows.slice(0, 200) } } : m);

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : uid("ds"));

const sampleDataset = (): Dataset => ({ id: newId(), name: SAMPLE_DATASETS[0].file, source: "sample", sampleId: SAMPLE_DATASETS[0].id, createdAt: Date.now() });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [initDone, setInitDone] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [mode, setMode] = useState<Mode>("local");
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const memRows = useRef<Record<string, Row[]>>({});
  const hydratedFor = useRef<string | null>(null);
  const hydratePromise = useRef<Promise<boolean> | null>(null);
  // snapshots of what the database already has — used to diff and only write changes
  const synced = useRef<{ datasetIds: Set<string>; chats: Record<string, ChatMessage[]>; profileSig: string; queries: Record<string, QueryEntry[]> }>({ datasetIds: new Set(), chats: {}, profileSig: "", queries: {} });
  const pending = useRef(0);

  /* ------------------------------ cloud helpers ------------------------------ */
  const track = useCallback(async (p: Promise<any>) => {
    pending.current++;
    setSync("saving");
    try {
      await p;
      setSyncError(null);
      if (--pending.current === 0) setSync("saved");
    } catch (e: any) {
      pending.current = Math.max(0, pending.current - 1);
      setSync("error");
      setSyncError(e?.message || "Could not save to the cloud");
      console.error("[DataOps sync]", e);
    }
  }, []);

  const hydrate = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const authUser = data.session?.user;
    if (!authUser) return false;
    if (hydratedFor.current === authUser.id) return true;
    if (hydratePromise.current) return hydratePromise.current;
    const run = (async () => {
      setHydrating(true);
      try {
        const ws = await fetchWorkspace(authUser.id);
        const meta = authUser.user_metadata || {};
        const p = ws.profile;
        const user: User = {
          id: authUser.id,
          name: p?.name || meta.full_name || meta.name || (authUser.email || "").split("@")[0],
          email: authUser.email || p?.email || "",
          role: p?.role || meta.role || "Data Analyst",
          company: p?.company || "",
          bio: p?.bio || "",
          location: p?.location || "India",
          avatarSeed: p?.avatar_seed || authUser.email || authUser.id,
          avatarUrl: p?.avatar_url || meta.avatar_url || null,
          plan: p?.plan || "Starter",
          joined: new Date(p?.created_at || authUser.created_at).getTime(),
        };
        let datasets: Dataset[] = ws.datasets.map((d) => ({
          id: d.id, name: d.name, source: d.source, sampleId: d.sample_id || undefined, rowCount: d.row_count,
          createdAt: new Date(d.created_at).getTime(), cleaned: d.cleaned, cleanLog: d.clean_log || undefined,
          parentId: d.parent_id || undefined, queries: d.queries || [],
        }));
        const chats: Record<string, ChatMessage[]> = {};
        ws.chats.forEach((c) => (chats[c.agent] = c.messages || []));
        const settings: Settings = { ...DEFAULT_SETTINGS, ...(p?.settings || {}), geminiKey: readGemini() };
        const usage = { queries: 0, tokens: 0, ...(p?.usage || {}), uploads: p?.uploads_used ?? 0 };
        let activeId = p?.active_dataset_id && datasets.some((d) => d.id === p.active_dataset_id) ? p.active_dataset_id : datasets[0]?.id ?? null;

        // brand-new account → make sure the profile exists and seed the sample dataset
        if (!p) await upsertProfile({ id: user.id!, name: user.name, email: user.email, role: user.role, avatar_seed: user.avatarSeed, avatar_url: user.avatarUrl ?? null });
        if (!datasets.length) {
          const d = sampleDataset();
          await insertDataset(user.id!, d);
          datasets = [d];
          activeId = d.id;
        }

        synced.current = { datasetIds: new Set(datasets.map((d) => d.id)), chats: { ...chats }, profileSig: "", queries: Object.fromEntries(datasets.map((d) => [d.id, d.queries || []])) };
        hydratedFor.current = authUser.id;
        setState({ user, datasets, activeId, chats, settings, usage });
        setMode("cloud");
        setSync("saved");
        return true;
      } catch (e: any) {
        console.error("[DataOps] could not load workspace", e);
        setSync("error");
        setSyncError(e?.message?.includes("relation") ? "Database tables are missing — run supabase/schema.sql in the Supabase SQL editor." : e?.message || "Could not load your workspace");
        return false;
      } finally {
        setHydrating(false);
        hydratePromise.current = null;
      }
    })();
    hydratePromise.current = run;
    return run;
  }, []);

  /* --------------------------------- boot ---------------------------------- */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (supabase) {
        const ok = await hydrate();
        if (!ok) setState(loadLocal());
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session?.user && hydratedFor.current !== session.user.id) {
            setTimeout(() => hydrate(), 0); // don't call Supabase inside the callback itself
          }
          if (event === "SIGNED_OUT" && hydratedFor.current) {
            hydratedFor.current = null;
            setMode("local");
            setState({ ...loadLocal(), user: null });
          }
        });
        unsub = () => data.subscription.unsubscribe();
      } else {
        setState(loadLocal());
      }
      setInitDone(true);
    })();
    return () => unsub?.();
  }, [hydrate]);

  /* ------------------------- persistence: demo mode ------------------------- */
  useEffect(() => {
    if (!initDone || mode !== "local") return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, settings: { ...state.settings, geminiKey: "" } }));
    } catch {
      try {
        const slim = { ...state, settings: { ...state.settings, geminiKey: "" }, datasets: state.datasets.map((d) => (d.rows ? { ...d, rows: undefined } : d)) };
        state.datasets.forEach((d) => d.rows && (memRows.current[d.id] = d.rows));
        localStorage.setItem(KEY, JSON.stringify(slim));
      } catch {}
    }
  }, [state, initDone, mode]);

  /* ------------------------ persistence: cloud mode ------------------------- */
  const uidRef = state.user?.id;

  // datasets: insert new ids, delete removed ids
  useEffect(() => {
    if (mode !== "cloud" || !uidRef || hydratedFor.current !== uidRef) return;
    const known = synced.current.datasetIds;
    const now = new Set(state.datasets.map((d) => d.id));
    state.datasets.forEach((d) => {
      if (!known.has(d.id)) {
        known.add(d.id);
        synced.current.queries[d.id] = d.queries || [];
        track(
          insertDataset(uidRef, { ...d, rows: d.rows ?? memRows.current[d.id] })
            .then(({ tooBig }) => {
              if (tooBig) setState((s) => ({ ...s, datasets: s.datasets.map((x) => (x.id === d.id ? { ...x, localOnly: true } : x)) }));
            })
            .catch((e) => {
              if (String(e?.message || "").includes("UPLOAD_LIMIT")) {
                known.delete(d.id);
                setState((s) => ({ ...s, datasets: s.datasets.filter((x) => x.id !== d.id), activeId: s.activeId === d.id ? s.datasets.find((x) => x.id !== d.id)?.id ?? null : s.activeId }));
                throw new Error("Free plan limit reached: 15 dataset uploads. Upgrade to Pro for unlimited uploads.");
              }
              throw e;
            })
        );
      }
    });
    [...known].forEach((id) => {
      if (!now.has(id)) {
        known.delete(id);
        track(deleteDataset(id));
      }
    });
  }, [state.datasets, mode, uidRef, track]);

  // chats: upsert agents whose history changed (debounced)
  const chatTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (mode !== "cloud" || !uidRef || hydratedFor.current !== uidRef) return;
    clearTimeout(chatTimer.current);
    chatTimer.current = setTimeout(() => {
      Object.entries(state.chats).forEach(([agent, msgs]) => {
        if (synced.current.chats[agent] !== msgs) {
          synced.current.chats[agent] = msgs;
          track(upsertChat(uidRef, agent, msgs));
        }
      });
    }, 700);
  }, [state.chats, mode, uidRef, track]);

  // query logs per dataset (debounced)
  const queryTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (mode !== "cloud" || !uidRef || hydratedFor.current !== uidRef) return;
    clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => {
      state.datasets.forEach((d) => {
        if (synced.current.datasetIds.has(d.id) && d.queries && synced.current.queries[d.id] !== d.queries) {
          synced.current.queries[d.id] = d.queries;
          track(updateDatasetQueries(d.id, d.queries));
        }
      });
    }, 900);
  }, [state.datasets, mode, uidRef, track]);

  // profile + settings + usage + active dataset (debounced)
  const profileTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (mode !== "cloud" || !state.user?.id || hydratedFor.current !== state.user.id) return;
    const u = state.user;
    const { geminiKey, ...syncedSettings } = state.settings;
    const row = {
      id: u.id!, name: u.name, email: u.email, role: u.role, company: u.company, bio: u.bio, location: u.location,
      avatar_seed: u.avatarSeed, avatar_url: u.avatarUrl ?? null, settings: syncedSettings, usage: { queries: state.usage.queries, tokens: state.usage.tokens }, active_dataset_id: state.activeId,
    };
    const sig = JSON.stringify(row);
    if (!synced.current.profileSig) { synced.current.profileSig = sig; return; } // first render after hydrate
    if (sig === synced.current.profileSig) return;
    clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(() => {
      synced.current.profileSig = sig;
      track(upsertProfile(row));
    }, 800);
  }, [state.user, state.settings, state.usage, state.activeId, mode, track]);

  // lazy-load rows of the active uploaded dataset from the cloud
  const loadingRows = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (mode !== "cloud") return;
    const d = state.datasets.find((x) => x.id === state.activeId) || state.datasets[0];
    if (!d || d.source !== "upload" || d.rows || memRows.current[d.id] || loadingRows.current.has(d.id) || d.localOnly) return;
    loadingRows.current.add(d.id);
    fetchDatasetRows(d.id)
      .then((rows) => setState((s) => ({ ...s, datasets: s.datasets.map((x) => (x.id === d.id ? { ...x, rows } : x)) })))
      .catch((e) => { setSync("error"); setSyncError(e?.message || "Could not load dataset"); })
      .finally(() => loadingRows.current.delete(d.id));
  }, [state.activeId, state.datasets, mode]);

  const set = useCallback((fn: (s: State) => State) => setState((s) => fn(s)), []);

  const api: Ctx = useMemo(
    () => ({
      ...state,
      ready: initDone && !hydrating,
      mode,
      cloudEnabled,
      sync,
      syncError,
      /** Demo-mode sign in (browser only). Cloud sign-in goes through lib/auth + hydrateCloud. */
      login: (email, name) => {
        setMode("local");
        set((s) => {
          const base = s.user ? s : loadLocal();
          const existing = base.user && base.user.email === email ? base.user : null;
          const user: User = existing || {
            name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
            email, role: "Data Analyst", company: "", bio: "", location: "India", avatarSeed: email, plan: "Starter", joined: Date.now(),
          };
          let datasets = base.datasets;
          let activeId = base.activeId;
          if (!datasets.length) {
            const d = sampleDataset();
            datasets = [d];
            activeId = d.id;
          }
          return { ...base, user, datasets, activeId };
        });
      },
      hydrateCloud: hydrate,
      logout: async () => {
        if (mode === "cloud" && supabase) {
          hydratedFor.current = null;
          await supabase.auth.signOut();
          setMode("local");
          setState({ ...loadLocal(), user: null });
        } else {
          set((s) => ({ ...s, user: null }));
        }
      },
      updateUser: (u) => set((s) => ({ ...s, user: s.user ? { ...s.user, ...u } : s.user })),
      uploadsUsed: state.usage.uploads ?? 0,
      uploadLimit: PLAN_LIMITS[state.user?.plan ?? "Starter"].uploads,
      canUpload: (state.usage.uploads ?? 0) < PLAN_LIMITS[state.user?.plan ?? "Starter"].uploads,
      addUpload: (name, rows) => {
        if ((state.usage.uploads ?? 0) >= PLAN_LIMITS[state.user?.plan ?? "Starter"].uploads) return null;
        const id = newId();
        set((s) => ({
          ...s,
          datasets: [{ id, name, source: "upload", rows, rowCount: rows.length, createdAt: Date.now(), queries: [] }, ...s.datasets],
          activeId: id,
          usage: { ...s.usage, uploads: (s.usage.uploads ?? 0) + 1 },
        }));
        return id;
      },
      logQuery: (datasetId, q) =>
        set((s) => ({
          ...s,
          datasets: s.datasets.map((d) => {
            if (d.id !== datasetId) return d;
            const prev = (d.queries || []).filter((x) => x.sql.trim() !== q.sql.trim());
            return { ...d, queries: [{ ...q, ts: Date.now() }, ...prev].slice(0, 40) };
          }),
        })),
      addSample: (sampleId) => {
        const sample = SAMPLE_DATASETS.find((d) => d.id === sampleId)!;
        const existing = state.datasets.find((d) => d.sampleId === sampleId && !d.cleaned);
        if (existing) {
          set((s) => ({ ...s, activeId: existing.id }));
          return existing.id;
        }
        const id = newId();
        set((s) => ({ ...s, datasets: [{ id, name: sample.file, source: "sample", sampleId, createdAt: Date.now() }, ...s.datasets], activeId: id }));
        return id;
      },
      removeDataset: (id) =>
        set((s) => {
          const datasets = s.datasets.filter((d) => d.id !== id);
          return { ...s, datasets, activeId: s.activeId === id ? datasets[0]?.id ?? null : s.activeId };
        }),
      setActive: (id) => set((s) => ({ ...s, activeId: id })),
      cleanDataset: (id) => {
        const d = state.datasets.find((x) => x.id === id);
        if (!d) return [];
        const rows = datasetRows(d, memRows.current);
        const { rows: cleaned, log } = autoClean(rows, profileDataset(rows));
        const nid = newId();
        const name = d.name.replace(/(\.csv)?$/i, "_cleaned.csv");
        set((s) => ({ ...s, datasets: [{ id: nid, name, source: "upload", rows: cleaned, rowCount: cleaned.length, createdAt: Date.now(), cleaned: true, cleanLog: log, parentId: d.id, queries: [] }, ...s.datasets], activeId: nid }));
        return log;
      },
      pushMessage: (m) => set((s) => ({ ...s, chats: { ...s.chats, [m.agent]: [...(s.chats[m.agent] || []), trimResult(m)].slice(-60) } })),
      patchMessage: (agent, id, patch) =>
        set((s) => ({ ...s, chats: { ...s.chats, [agent]: (s.chats[agent] || []).map((m) => (m.id === id ? trimResult({ ...m, ...patch }) : m)) } })),
      clearChat: (agent) => set((s) => ({ ...s, chats: { ...s.chats, [agent]: [] } })),
      updateSettings: (p) => {
        if (p.geminiKey !== undefined) {
          try { p.geminiKey ? localStorage.setItem(GEMINI_KEY, p.geminiKey) : localStorage.removeItem(GEMINI_KEY); } catch {}
        }
        set((s) => ({ ...s, settings: { ...s.settings, ...p } }));
      },
      trackUsage: (tokens) => set((s) => ({ ...s, usage: { queries: s.usage.queries + 1, tokens: s.usage.tokens + tokens } })),
      resetAll: async () => {
        if (mode === "cloud" && state.user?.id && supabase) {
          await wipeWorkspace(state.user.id);
          hydratedFor.current = null;
          await supabase.auth.signOut();
          setMode("local");
        }
        try {
          localStorage.removeItem(KEY);
          localStorage.removeItem(GEMINI_KEY);
          localStorage.removeItem("dataops:sql-history");
        } catch {}
        setState(EMPTY);
      },
    }),
    [state, initDone, hydrating, mode, sync, syncError, set, hydrate]
  );

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}

export function datasetRows(d: Dataset | undefined | null, mem?: Record<string, Row[]>): Row[] {
  if (!d) return [];
  if (d.source === "sample" && d.sampleId) return getSample(d.sampleId);
  return d.rows || mem?.[d.id] || [];
}

/** Active dataset rows + memoised profile */
export function useActiveDataset(): { dataset: Dataset | null; rows: Row[]; profile: DatasetProfile | null; loading: boolean } {
  const { datasets, activeId, mode } = useApp();
  const dataset = datasets.find((d) => d.id === activeId) || datasets[0] || null;
  const rows = useMemo(() => datasetRows(dataset), [dataset]);
  const profile = useMemo(() => (rows.length ? profileDataset(rows) : null), [rows]);
  const loading = mode === "cloud" && !!dataset && dataset.source === "upload" && !dataset.rows && !dataset.localOnly;
  return { dataset, rows, profile, loading };
}
