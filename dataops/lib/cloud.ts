/**
 * Supabase cloud layer.
 * When NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set, accounts and
 * workspaces live in Postgres (with Row Level Security). Without them the app falls
 * back to browser-only demo mode, so it still runs anywhere.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Row } from "./sample-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "dataops-auth" },
      })
    : null;

export const cloudEnabled = !!supabase;

/** Largest dataset (serialised JSON) we push to the database; bigger files stay in this browser session */
export const MAX_CLOUD_BYTES = 6 * 1024 * 1024;

export interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  company: string;
  bio: string;
  location: string;
  avatar_seed: string | null;
  avatar_url: string | null;
  plan: "Starter" | "Pro" | "Enterprise";
  settings: Record<string, any>;
  usage: { queries: number; tokens: number };
  active_dataset_id: string | null;
  uploads_used?: number;
  created_at: string;
}

export interface DatasetRow {
  id: string;
  name: string;
  source: "sample" | "upload";
  sample_id: string | null;
  row_count: number;
  cleaned: boolean;
  clean_log: string[] | null;
  created_at: string;
  parent_id?: string | null;
  queries?: any[] | null;
  rows?: Row[] | null;
}

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function fetchWorkspace(userId: string) {
  const [p, d, c] = await Promise.all([
    db().from("profiles").select("*").eq("id", userId).maybeSingle(),
    db().from("datasets").select("id,name,source,sample_id,row_count,cleaned,clean_log,created_at,parent_id,queries").eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("chats").select("agent,messages").eq("user_id", userId),
  ]);
  if (p.error) throw p.error;
  if (d.error) throw d.error;
  if (c.error) throw c.error;
  return { profile: p.data as ProfileRow | null, datasets: (d.data || []) as DatasetRow[], chats: (c.data || []) as { agent: string; messages: any[] }[] };
}

export async function fetchDatasetRows(id: string): Promise<Row[]> {
  const { data, error } = await db().from("datasets").select("rows").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data?.rows as Row[]) || [];
}

export async function upsertProfile(row: Partial<ProfileRow> & { id: string }) {
  const { error } = await db().from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function insertDataset(userId: string, d: { id: string; name: string; source: "sample" | "upload"; sampleId?: string; rows?: Row[]; cleaned?: boolean; cleanLog?: string[]; createdAt: number; parentId?: string; queries?: any[] }) {
  let rows: Row[] | null = d.rows ?? null;
  let tooBig = false;
  if (rows && JSON.stringify(rows).length > MAX_CLOUD_BYTES) {
    rows = null;
    tooBig = true;
  }
  const { error } = await db().from("datasets").insert({
    id: d.id,
    user_id: userId,
    name: d.name,
    source: d.source,
    sample_id: d.sampleId ?? null,
    rows,
    row_count: d.rows?.length ?? 0,
    cleaned: !!d.cleaned,
    clean_log: d.cleanLog ?? null,
    parent_id: d.parentId ?? null,
    queries: d.queries ?? [],
    created_at: new Date(d.createdAt).toISOString(),
  });
  if (error) throw error;
  return { tooBig };
}

export async function updateDatasetQueries(id: string, queries: any[]) {
  const { error } = await db().from("datasets").update({ queries }).eq("id", id);
  if (error) throw error;
}

export async function deleteDataset(id: string) {
  const { error } = await db().from("datasets").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertChat(userId: string, agent: string, messages: any[]) {
  const { error } = await db().from("chats").upsert({ user_id: userId, agent, messages }, { onConflict: "user_id,agent" });
  if (error) throw error;
}

export async function wipeWorkspace(userId: string) {
  await db().from("datasets").delete().eq("user_id", userId);
  await db().from("chats").delete().eq("user_id", userId);
  await db().from("profiles").update({ settings: {}, usage: { queries: 0, tokens: 0 }, active_dataset_id: null, plan: "Starter" }).eq("id", userId);
}
