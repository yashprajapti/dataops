# 03 · Features Guide

## Public site
| Route | What it does |
|---|---|
| `/` | Landing page — hero with an auto-playing product demo (3 scenes), agent explorer, features bento, live case study computed from real sample data, use cases, testimonials marquee, pricing, FAQ, CTA |
| `/use-cases` | Retail, Marketing, Finance, Operations, Automotive — KPIs and clickable example questions |
| `/datasets` | Download or open the 3 sample datasets |
| `/docs` | Product documentation |
| `/blog`, `/blog/[slug]` | 4 articles (Anomaly Watch, Text-to-SQL, Quality score, Portfolio guide) |
| `/login`, `/signup` | Auth with validation, password strength meter, social demo sign-in |
| `/demo` | Instantly creates a demo workspace — no sign-up |

## App (`/dashboard`)
### Overview
KPI cards (total metric with 7-day change + sparkline, records, a secondary average, quality score), trend chart with Daily/Weekly/Monthly toggle and anomaly markers, composition donut, ranked breakdown, one-click agent prompts, data-health list and recent anomalies. **Everything adapts to whatever CSV you upload** — columns are detected automatically.

### AI Agents
Chat with each of the 5 agents. Features: suggested prompts, typing reveal, engine badge (Gemini / DataOps engine), SQL "Run on my data", copy SQL, open in SQL Studio, inline tables & charts, per-agent history, clear chat, deep links (`?agent=sql&q=...`).

### SQL Studio
Schema panel (click to insert column), natural-language → SQL generator, editor with line numbers (**⌘/Ctrl + Enter** to run), results as table or auto-chart, CSV export, "What this query does" explanation, query history.

### Datasets
Drag-and-drop CSV upload (25 MB), 3 sample datasets, dataset list (activate, download, delete), quality gauge, Cleaner report, **Auto-clean** (creates a `_cleaned.csv` copy with a change log), column profile cards (histograms, top values, missing/outlier counts), 100-row data preview.

### Anomaly Watch
Metric selector, sensitivity slider (σ), baseline window slider, daily chart with spike/drop markers, alert feed with severity and top-driver root cause, notification channel toggles.

### Reports
Executive report (Advisor summary, charts, data-quality section) → **Save as PDF** (print-optimised) or **Markdown**.

### Profile · Plan & Usage · Settings
Editable profile with random avatar, agent-activity chart; plan cards with usage meters and simulated upgrade; Gemini key with live connection test, alert toggles, anomaly sensitivity, workspace reset.

### Global
⌘K command palette · dataset switcher · anomaly notification bell · user menu · collapsible sidebar · mobile drawer.

## Try this 5-minute demo script
1. Open `/demo`.
2. **Overview** → switch the trend to *Daily* — see the 26 Jan spike and 18–20 Feb outage marked.
3. **AI Agents → SQL** → "kaunse city mein sabse zyada revenue hai" → Run.
4. **Datasets** → note quality **79/100** → *Auto-clean* → **100/100**.
5. **AI Agents → Advisor** → "Give me an executive summary".
6. **Reports** → *Save as PDF*.
