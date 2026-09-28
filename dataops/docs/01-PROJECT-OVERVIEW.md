# 01 · Project Overview

## The problem
Most business questions are simple — *"Which city sells the most?"*, *"Why did revenue drop last Tuesday?"* — but answering them still takes an analyst hours:

1. Clean a messy export (duplicates, blanks, "AHMEDABAD" vs "Ahmedabad").
2. Write SQL or pivot tables.
3. Pick and build the right charts.
4. Turn numbers into a story a manager can act on.

Non-technical teams wait in a queue; analysts spend their week on repetitive requests.

## The solution — DataOps
An AI data-analyst **team** in the browser. Five agents each own one step of the analytics workflow and share the same dataset context:

| Agent | Role | Output |
|---|---|---|
| 🧹 **Cleaner** | Data Quality Engineer | Quality score, issue table, cleaning plan, pandas code, one-click auto-clean |
| 🗄️ **SQL** | Query Specialist | Natural language → SQL, executed in-browser, explained |
| 📊 **Viz** | Visualization Designer | Chart recommendations, Power BI dashboard layout, a rendered chart |
| 📣 **Marketing Analytics** | Growth & Customer Analyst | Segmentation, channel ROAS/CAC, RFM starter, campaign plays |
| 🧭 **Advisor** | Chief Insights Officer | Executive summary, insights, top-3 recommendations, KPI list |

Plus four platform capabilities: **Auto Data Profiling**, **Natural Language → SQL**, **Smart Dashboards**, **Anomaly Watch**.

## Target users (personas)
| Persona | Need | How DataOps helps |
|---|---|---|
| **Riya — Business Analyst** | Answer ad-hoc stakeholder questions fast | Ask in English, get SQL + chart + explanation |
| **Arjun — Ops Manager (non-technical)** | Know when something breaks | Anomaly Watch with root-cause hints |
| **Meera — Marketing Lead** | Decide where the next rupee goes | Marketing agent's channel efficiency table |
| **Student / fresher** | Build a portfolio case study | Sample datasets + executive report export |

## Key differentiators
- **Explainable** — every query is shown and explained; every quality deduction is listed.
- **Private** — workspaces are isolated per user with row-level security; only aggregates (never raw rows) reach the LLM.
- **Always works** — a local statistical engine answers even without an AI key or internet.
- **Indian context** — ₹, lakh/crore formatting, Hinglish questions, Indian sample data.

## Feature list
- Landing site: animated hero demo, agent explorer, features bento, live case study computed in-browser, use cases, auto-scrolling testimonials, pricing with monthly/yearly toggle and comparison table, FAQ, newsletter footer.
- Auth: email sign-up with password strength meter, login, Google/GitHub demo sign-in, one-click live demo.
- App: overview dashboard, 5-agent chat, SQL Studio (editor, schema, history, chart/table toggle, CSV export), dataset upload + profiling + auto-clean, Anomaly Watch, PDF/Markdown reports, profile, plan & usage, settings (Gemini key test), ⌘K command palette, notifications.
- Content: Docs, Blog (4 articles), Sample datasets page, Privacy, Terms, 404.
