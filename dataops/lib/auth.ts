/**
 * Authentication.
 * • Cloud mode (Supabase configured): real email/password + Google sign-in, email
 *   confirmation and password reset. Sessions are handled by Supabase Auth.
 * • Demo mode (no Supabase keys): accounts are kept in this browser with SHA-256
 *   hashed passwords, so the project still runs with zero setup.
 */
import { supabase, cloudEnabled } from "./cloud";

export { cloudEnabled };

const KEY = "dataops:accounts";

interface Account { name: string; hash: string; provider: string; created: number }

function read(): Record<string, Account> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(a: Record<string, Account>) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {}
}

export async function hash(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dataops::" + text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export function passwordStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s); // 0..4
}

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

/** Friendlier messages for common Supabase auth errors */
function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox (and spam) for the link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Try logging in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password should be")) return "Password is too weak — use at least 8 characters.";
  if (m.includes("provider is not enabled")) return "This sign-in option isn’t enabled yet (Supabase → Authentication → Sign In / Providers).";
  return msg;
}

export type AuthResult =
  | { status: "signed-in"; email: string; name: string; cloud: boolean }
  | { status: "confirm-email"; email: string }
  | { status: "redirecting" };

export async function register(name: string, email: string, password: string, role = "Data Analyst"): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
      options: { data: { full_name: name.trim(), role }, emailRedirectTo: `${origin()}/auth/callback` },
    });
    if (error) throw new Error(friendly(error.message));
    // Supabase returns a user with no identities when the email is already taken (anti-enumeration)
    if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error(friendly("already registered"));
    if (!data.session) return { status: "confirm-email", email: e };
    return { status: "signed-in", email: e, name: name.trim(), cloud: true };
  }
  const accounts = read();
  if (accounts[e]) throw new Error("An account with this email already exists. Try logging in.");
  accounts[e] = { name: name.trim(), hash: await hash(password), provider: "email", created: Date.now() };
  write(accounts);
  return { status: "signed-in", email: e, name: name.trim(), cloud: false };
}

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) throw new Error(friendly(error.message));
    return { status: "signed-in", email: e, name: (data.user?.user_metadata?.full_name as string) || e.split("@")[0], cloud: true };
  }
  const acc = read()[e];
  if (!acc) throw new Error("No account found for this email. Create one — it takes 10 seconds.");
  if (acc.provider === "email" && acc.hash !== (await hash(password))) throw new Error("Incorrect password. Please try again.");
  return { status: "signed-in", email: e, name: acc.name, cloud: false };
}

export async function socialSignIn(provider: "google" | "github"): Promise<AuthResult> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin()}/auth/callback` } });
    if (error) throw new Error(friendly(error.message));
    return { status: "redirecting" };
  }
  const email = `${provider}.user@dataops.app`;
  const accounts = read();
  if (!accounts[email]) {
    accounts[email] = { name: provider === "github" ? "GitHub User" : "Google User", hash: "", provider, created: Date.now() };
    write(accounts);
  }
  return { status: "signed-in", email, name: accounts[email].name, cloud: false };
}

export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error("Password reset emails need Supabase. In demo mode, just create a new account.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin()}/auth/reset` });
  if (error) throw new Error(friendly(error.message));
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendly(error.message));
}

/** Exchange the ?code= from an email / OAuth redirect for a session (PKCE) */
export async function completeRedirect(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const u = new URL(window.location.href);
  const err = u.searchParams.get("error_description") || u.hash.match(/error_description=([^&]+)/)?.[1];
  if (err) return { ok: false, error: decodeURIComponent(err.replace(/\+/g, " ")) };
  const code = u.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // e.g. confirmation link opened in a different browser — the email is still confirmed
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { ok: false, error: friendly(error.message) };
    }
  }
  const { data } = await supabase.auth.getSession();
  return data.session ? { ok: true } : { ok: false, error: "Your email is confirmed. Please log in." };
}
