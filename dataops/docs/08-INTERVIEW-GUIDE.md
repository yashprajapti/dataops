# 08 · Interview Guide — presenting DataOps

## 30-second pitch
"DataOps is an AI data-analyst platform I designed and built end to end. You upload a CSV and five specialised agents take over — one audits data quality, one turns plain-English or Hinglish questions into SQL and runs it in the browser, one designs dashboards, one does marketing analytics and one writes the executive summary. It also monitors metrics for anomalies using a robust z-score. It's built with Next.js, TypeScript, Tailwind and Recharts, uses Google Gemini with a local fallback, and is deployed free on Vercel."

## 2-minute demo path
`/demo` → Overview (daily view shows the 26 Jan spike & 18–20 Feb outage) → Datasets (quality 79 → Auto-clean → 100) → SQL agent ("kaunse city mein sabse zyada revenue hai") → Advisor summary → Reports → Save as PDF.

## Talking points by role
**Business Analyst:** requirements in `docs/06-BRD.md` (objectives, FR/NFR, user stories with acceptance criteria, as-is/to-be process, KPIs); personas; the Advisor turns numbers into three prioritised actions.
**Data Analyst:** profiling, quality scoring, cleaning decisions (median vs mean imputation, winsorising at P99), SQL generation, anomaly detection maths (`docs/04-ALGORITHMS.md`).
**Product:** privacy-first architecture, fallback design so the product never breaks, freemium pricing.

## Likely questions — and honest answers
**Q: Is the AI really answering, or is it scripted?**
A: With a Gemini key it's fully generative; the model receives a statistical profile of the dataset. Without a key, a rule-based engine I wrote computes the answers from the actual data — so numbers are always real, just the wording is templated.

**Q: How does text-to-SQL work?**
A: With Gemini, the model gets the schema and must return one SELECT against table `data`. Offline, a parser detects aggregation, metric, dimension, top-N, time grain and filters (including Hinglish like "sabse zyada"). Either way the SQL runs in-browser with AlaSQL and is shown to the user.

**Q: Why median/MAD for anomalies instead of mean/std?**
A: Outliers inflate the mean and std, which hides the anomalies you're trying to catch. Median and MAD are robust. I also work in log space because a 50% drop matters equally on small and big days.

**Q: How do accounts and data storage work?**
A: Supabase Auth handles email/password and Google sign-in (PKCE flow, email confirmation, password reset). Each user's datasets, chats and settings live in Postgres tables protected by row-level security policies (`auth.uid() = user_id`), so users can never read each other's data. A trigger creates the profile on sign-up. The store diff-syncs changes and lazy-loads dataset rows. Without Supabase keys the app falls back to a browser-only demo mode.

**Q: Are the testimonials and customer logos real?**
A: No — they're sample marketing content for the portfolio, like the pricing. The sample datasets are synthetic but realistic, with deliberately injected quality issues and business events.

**Q: What would you build next?**
A: Database connectors (Postgres/BigQuery), DuckDB-WASM for 100 MB+ files, scheduled email/Slack alerts, team workspaces, and forecasting.

## Résumé bullet (copy-paste)
> **DataOps — AI Data Analyst Platform** (Next.js, TypeScript, Tailwind, Recharts, Gemini API) · Built a multi-agent analytics web app that profiles CSVs, scores data quality (0–100) with one-click cleaning, converts English/Hinglish questions to SQL executed in-browser, and detects anomalies using robust rolling z-scores; authored BRD with user stories & KPIs; deployed on Vercel.
