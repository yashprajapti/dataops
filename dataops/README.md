# DataOps — Your AI Data Analyst Team

> Five specialised AI agents that **clean, query, visualise and explain** your data.
> Upload a CSV, ask in plain English (or Hindi / Hinglish), and get SQL, charts and a boardroom-ready summary in seconds.

**Designed & built by Yash Prajapati**

---

## ✨ Highlights

| | |
|---|---|
| 🤖 **5 AI agents** | Cleaner · SQL · Viz · Marketing Analytics · Advisor |
| 🧹 **Auto Data Profiling** | Column types, distributions, missing values, duplicates, outliers and a 0–100 quality score |
| 💬 **Natural Language → SQL** | Plain English / Hinglish → SQL, executed **in the browser** in milliseconds, explained clause by clause |
| 📊 **Smart Dashboards** | KPI cards, trend, breakdown and composition charts built automatically from any dataset |
| 🚨 **Anomaly Watch** (new) | Robust rolling z-score (median/MAD, log-space) monitoring with root-cause hints |
| 📄 **Analysis package** | White, print-ready PDF report + cleaned **Excel** workbook (7 sheets) + **SQL script** for MySQL / SQL Server / PostgreSQL + one-click ZIP |
| 🎯 **Question-aware agents** | Every answer is computed from your data for *that* question — the right aggregation (sum vs average), the right chart, and the next questions to ask |
| 🔒 **Free-plan limit** | 15 dataset uploads on Starter, enforced by a database trigger |
| 🔐 **Private by default** | CSVs are parsed locally; only a statistical profile is ever sent to the AI model |
| 💸 **Zero cost** | Runs on the Vercel free tier. Gemini is optional — a built-in engine answers without any API key |

---

## 🖥️ Pages

**Marketing site:** Home (hero with animated product demo, agents, features bento, live case study, use cases, scrolling testimonials, pricing, FAQ) · Use Cases · Sample Datasets · Docs · Blog (4 posts) · Privacy · Terms · 404

**App (after login):** Overview · AI Agents (chat) · SQL Studio · Datasets · Anomaly Watch · Reports · Profile · Plan & Usage · Settings — plus a **⌘K command palette**, dataset switcher and notification centre.

**Auth:** Sign up · Log in · Google / GitHub (demo) · **Live demo** (`/demo`, no sign-up)

---

## 🧰 Tech stack

| Layer | Tech |
|---|---|
| Framework | **Next.js 14** (App Router) + **React 18** + **TypeScript** |
| Styling | **Tailwind CSS**, Geist font, custom glass / aurora design system |
| Animation | **Framer Motion** |
| Charts | **Recharts** (validated colour-blind-safe palette) |
| CSV parsing | **PapaParse** |
| In-browser SQL | **AlaSQL** |
| AI | **Google Gemini API** (optional) via an Edge API route, with a local fallback engine |
| Icons | Lucide |
| Hosting | **Vercel** (free) |

---

## 🚀 Run it locally

```bash
# 1. Install Node.js 18.17+ (20 LTS recommended) from https://nodejs.org
# 2. Unzip the project, open a terminal in the folder, then:
npm install
npm run dev
# open http://localhost:3000
```

### Real accounts with Supabase (free)

1. Create a project at **supabase.com** → **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Then do the same with [`supabase/migration_002_limits_and_reports.sql`](supabase/migration_002_limits_and_reports.sql) (15-upload free limit, query log).
2. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.
3. `cp .env.example .env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Authentication → URL Configuration**: Site URL = your site; add `http://localhost:3000/**` and `https://<your-app>.vercel.app/**` to Redirect URLs.
5. (Optional) **Authentication → Sign In / Providers → Google**: enable and paste a Google OAuth Client ID + Secret. In Google Cloud Console, the authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.

Without these keys the app still works in browser-only demo mode.

Optional — enable generative AI answers:

```bash
cp .env.example .env.local
# paste your free key from https://aistudio.google.com/app/apikey
# GEMINI_API_KEY=AIza...
```

Production build: `npm run build && npm start`

---

## ☁️ Deploy free on Vercel (`your-name.vercel.app`)

1. Create a GitHub repo and push this folder (`git init && git add . && git commit -m "DataOps" && git push`).
2. Go to **vercel.com → Sign up with GitHub → Add New → Project → Import** your repo.
3. Framework is auto-detected as **Next.js**. Click **Deploy**.
4. **Settings → Environment Variables →** add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `GEMINI_API_KEY`), then **Redeploy**.
5. Your site is live at `https://<project-name>.vercel.app`. Rename the project in **Settings → General** to change the subdomain.

Full walkthrough: [`docs/05-DEPLOYMENT.md`](docs/05-DEPLOYMENT.md)

---

## 🗂️ Project structure

```
dataops/
├─ app/
│  ├─ page.tsx                 # Landing page
│  ├─ login/ signup/ demo/     # Auth + instant demo
│  ├─ dashboard/               # The app (overview, assistant, sql, datasets, anomalies, reports, profile, billing, settings)
│  ├─ docs/ blog/ use-cases/ datasets/ privacy/ terms/
│  └─ api/chat/route.ts        # Gemini proxy (Edge) with graceful fallback
├─ components/
│  ├─ landing/                 # Navbar, Hero, HeroPreview, Sections, DemoCase, Testimonials, Pricing, Footer
│  ├─ dash/                    # Shell (sidebar, topbar, ⌘K), ResultTable
│  ├─ ui/                      # Avatar, Spotlight, Reveal, AgentIcon
│  ├─ charts.tsx  Markdown.tsx  Logo.tsx  AuthShell.tsx
├─ lib/
│  ├─ agents.ts                # The 5 agents: roles, prompts, suggestions
│  ├─ analytics.ts             # Profiling, quality score, auto-clean, group-by, time series, anomalies, correlation
│  ├─ local-engine.ts          # Offline agent brains + text-to-SQL
│  ├─ sql.ts                   # In-browser SQL runner
│  ├─ sample-data.ts           # 3 deterministic sample datasets
│  ├─ store.tsx                # App state; syncs to Supabase for signed-in users, localStorage in demo mode
│  ├─ cloud.ts                 # Supabase client + database reads/writes
│  ├─ auth.ts                  # Supabase Auth (email, Google, reset) with a browser-only demo fallback
│  ├─ site.ts                  # ← Edit name, owner, links, socials here
│  └─ content.ts               # Blog posts + docs content
└─ docs/                       # Full project documentation (see below)
```

---

## 📚 Documentation

| # | Document | What's inside |
|---|---|---|
| 01 | [Project Overview](docs/01-PROJECT-OVERVIEW.md) | Problem, solution, personas, feature list |
| 02 | [Architecture](docs/02-ARCHITECTURE.md) | System design, data flow, module map |
| 03 | [Features Guide](docs/03-FEATURES-GUIDE.md) | Every page and agent, how to use it |
| 04 | [Algorithms](docs/04-ALGORITHMS.md) | Profiling, quality score, auto-clean, anomaly detection, text-to-SQL |
| 05 | [Deployment](docs/05-DEPLOYMENT.md) | GitHub → Vercel step by step, env vars, custom domain |
| 06 | [BRD](docs/06-BRD.md) | Business Requirements Document — scope, requirements, user stories, KPIs |
| 07 | [Customisation](docs/07-CUSTOMISATION.md) | Change branding, colours, pricing, agents, datasets |
| 08 | [Interview Guide](docs/08-INTERVIEW-GUIDE.md) | How to present this project + likely questions |

---

## ⚠️ Notes

- **Accounts are real** when Supabase keys are set (email + Google sign-in, per-user workspaces with row-level security). Without keys the app runs in a browser-only demo mode.
- **Billing is simulated** (plan changes, no payment gateway). Add Razorpay / Stripe for real payments — see `docs/07-CUSTOMISATION.md`.
- Testimonials, company names and review ratings on the landing page are **sample content** for the portfolio.
- Sample datasets are **synthetic** (generated deterministically in `lib/sample-data.ts`), with realistic mess injected on purpose.

© 2026 DataOps · Yash Prajapati
