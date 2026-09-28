# 05 · Deployment (free, on Vercel)

## Prerequisites
- **Node.js 20 LTS** — https://nodejs.org
- **Git** — https://git-scm.com
- A **GitHub** account and a **Vercel** account (sign up with GitHub — free, no card)

## 1. Run locally first
```bash
cd dataops
npm install
npm run dev          # http://localhost:3000
npm run build        # make sure the production build passes
```

## 2. Push to GitHub
```bash
git init
git add .
git commit -m "DataOps — AI data analyst platform"
git branch -M main
git remote add origin https://github.com/<your-username>/dataops.git
git push -u origin main
```
(Create the empty `dataops` repo on github.com first — no README.)

## 3. Deploy on Vercel
1. https://vercel.com/new → **Import** your `dataops` repository.
2. Framework preset: **Next.js** (auto). Build command / output: leave defaults.
3. Click **Deploy** → in ~1 minute you get `https://dataops-<random>.vercel.app`.

## 4. Pick your free subdomain
Vercel → Project → **Settings → Domains** → edit the `.vercel.app` domain, e.g. `dataops-yash.vercel.app` (must be unique).

## 5. Real accounts (Supabase)
1. supabase.com → **New project** (free).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **Project Settings → API** → copy *Project URL* and *anon / publishable key*.
4. Vercel → **Settings → Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Redeploy**.
5. Supabase → **Authentication → URL Configuration**: Site URL = `https://<your-app>.vercel.app`; Redirect URLs: `https://<your-app>.vercel.app/**`, `http://localhost:3000/**`.
6. Google sign-in (optional): Google Cloud Console → *APIs & Services → Credentials → OAuth client ID (Web)*, redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` → paste Client ID/Secret in Supabase → *Authentication → Sign In / Providers → Google*.

## 6. (Optional) Enable Gemini
1. Get a free key: https://aistudio.google.com/app/apikey
2. Vercel → Project → **Settings → Environment Variables**
   - `GEMINI_API_KEY` = `AIza…`
   - `GEMINI_MODEL` = `gemini-2.0-flash` (optional; change if Google renames models)
3. **Deployments → ⋯ → Redeploy**.
4. Check `https://<your-site>/api/health` → `"ai": "gemini"`.

Without a key the app still works fully using its built-in engine. Users can also paste their own key in **Settings**.

## 7. Custom domain (optional, paid)
Buy a domain (e.g. from GoDaddy/Namecheap/Hostinger), then Vercel → **Settings → Domains → Add** and follow the DNS instructions.

## Every future update
```bash
git add . && git commit -m "update" && git push
```
Vercel redeploys automatically.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Build fails on Vercel | Run `npm run build` locally and fix the first error shown |
| Agents show "DataOps engine" badge | No Gemini key set, or key invalid — check `/api/health` and Settings → Test |
| "this session only" tag on a dataset | File is larger than 6 MB, so it wasn’t saved to the cloud |
| "Database tables are missing" banner | Run `supabase/schema.sql` in the Supabase SQL editor |
| Google sign-in error | Enable Google in Supabase → Authentication → Providers, and add your site to Redirect URLs |
| Avatars not loading | They come from api.dicebear.com; initials are shown as a fallback |
