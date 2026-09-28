export interface Post { slug: string; title: string; excerpt: string; date: string; read: string; tag: string; author: string; body: string }

export const POSTS: Post[] = [
  {
    slug: "introducing-anomaly-watch",
    title: "Introducing Anomaly Watch: your metrics, monitored 24/7",
    excerpt: "Rolling z-scores, root-cause hints and alerts that don’t cry wolf. Here’s how we built the newest DataOps agent capability.",
    date: "2026-09-10", read: "5 min", tag: "Product", author: "DataOps Team",
    body: `Most dashboards tell you what happened. Anomaly Watch tells you **when something unusual happened — and why it probably did**.

### How it works
- Every numeric metric is aggregated into a daily series.
- For each day we compute a **rolling median and MAD** (median absolute deviation) over the previous 14 days (configurable from 7 to 30), in log space.
- If today’s robust z-score is beyond **3σ** (also configurable), it’s flagged. Beyond 5σ it’s marked **critical**.

### Why robust, log-space z-scores?
- **Rolling** baselines adapt to growth and seasonality without a heavy model — a Diwali spike is compared against the fortnight before it, not last summer.
- **Median + MAD** aren’t dragged around by the very outliers we’re trying to catch, unlike mean and standard deviation.
- **Log space** treats a 50% drop the same whether you do ₹5,000 or ₹5 lakh a day.

### Root-cause hints
When a day is flagged, DataOps breaks it down by your primary dimension (city, channel, category…) and tells you which value drove it. That turns “revenue dropped” into “revenue dropped, and 60% of the day came from Ahmedabad”.

### Try it
Load the **Quick-Commerce Orders** sample — it contains a Republic Day spike and a three-day outage dip. Open **Anomaly Watch** and move the sensitivity slider to see detection change live.`,
  },
  {
    slug: "text-to-sql-that-you-can-trust",
    title: "Text-to-SQL you can actually trust",
    excerpt: "Why every DataOps query is shown, explained and run in your browser — and why that matters more than accuracy benchmarks.",
    date: "2026-08-22", read: "6 min", tag: "Engineering", author: "DataOps Team",
    body: `Natural-language SQL is only useful if analysts can verify it. So the SQL agent follows three rules:

1. **Always show the query.** No hidden magic — you see exactly what ran.
2. **Explain every clause.** SELECT, WHERE, GROUP BY, ORDER BY and LIMIT are each described in plain English.
3. **Run locally.** Queries execute in your browser with an in-memory SQL engine, so results are instant and your raw rows are never sent to the AI.

### Hinglish welcome
Ask “kaunse city mein sabse zyada revenue?” and you’ll get the same clean SQL as the English version.

### Edit and re-run
Every generated query can be opened in **SQL Studio**, edited, and re-run with ⌘/Ctrl + Enter. Your history is saved so you can build up a library of trusted queries.`,
  },
  {
    slug: "data-quality-score-explained",
    title: "What’s in a data quality score?",
    excerpt: "Missing values, duplicates, outliers and messy labels — how the Cleaner agent turns them into a single number from 0 to 100.",
    date: "2026-07-30", read: "4 min", tag: "Data Quality", author: "DataOps Team",
    body: `The Cleaner agent’s score starts at **100**. Every issue it finds costs points by severity — **high −10, medium −5, low −2** — plus a small deduction for the overall share of empty cells. Issues it looks for:

- **Missing values** — severity depends on how much of the column is empty.
- **Duplicate rows** — exact copies inflate every total and count.
- **Extreme outliers** — values beyond both the 3×IQR fence and 1.5× the 99th percentile, so naturally skewed metrics aren’t punished.
- **Inconsistent labels** — “Ahmedabad”, “AHMEDABAD” and “ahmedabad ” counted as three cities.

On the Quick-Commerce sample the raw file scores **79**; one click of Auto-clean takes it to **100**.

### Scores in practice
- **90+** — analysis-ready.
- **75–89** — good, fix the flagged columns before reporting.
- **Below 75** — clean first; conclusions may be wrong.

Hit **Auto-clean** and DataOps creates a cleaned copy (never overwriting your original) with a log of every change it made.`,
  },
  {
    slug: "portfolio-case-study-in-an-hour",
    title: "Build a data analyst portfolio case study in one hour",
    excerpt: "A step-by-step playbook: pick a dataset, clean it, ask the right questions and publish an executive report.",
    date: "2026-07-05", read: "7 min", tag: "Guides", author: "DataOps Team",
    body: `Recruiters want to see **how you think**, not just which tools you know. Here’s a one-hour workflow.

### 1. Pick a business question (5 min)
“Which cities and categories should a quick-commerce company invest in next quarter?”

### 2. Clean and document (15 min)
Load the sample, read the Cleaner agent’s report, run Auto-clean and note what changed. Data cleaning decisions are great interview talking points.

### 3. Explore with SQL (20 min)
Ask the SQL agent for top cities, monthly trends and average delivery time by city. Copy the queries into your write-up.

### 4. Tell the story (15 min)
Ask the Advisor for an executive summary and top 3 recommendations. Rewrite them in your own words and add one insight the AI missed.

### 5. Publish (5 min)
Export the report as PDF and link it from your résumé and LinkedIn.`,
  },
];

export const DOCS = [
  { id: "getting-started", title: "Getting started", body: `1. **Create an account** (or open the live demo — no sign-up needed).\n2. The **Quick-Commerce Orders** sample is loaded automatically.\n3. Open **AI Agents** and ask the Advisor for an executive summary.\n4. Upload your own CSV from **Datasets** whenever you’re ready.` },
  { id: "datasets", title: "Uploading data", body: `- Supported format: **CSV** (UTF-8) with headers in the first row, up to 25 MB.\n- From Excel: *File → Save As → CSV UTF-8*. From Google Sheets: *File → Download → .csv*.\n- Types are detected automatically: number, date (YYYY-MM-DD), category, text and ID.\n- Files are parsed in your browser. With an account they are saved privately to your workspace (row-level security); raw rows are never sent to the AI.` },
  { id: "agents", title: "The five agents", body: `- **Cleaner** — profiling, quality score, cleaning plan and pandas code.\n- **SQL** — natural language to SQL, executed in-browser, explained clause by clause.\n- **Viz** — chart recommendations and Power BI-ready dashboard layouts.\n- **Marketing Analytics** — segmentation, channel ROAS/CAC, RFM and campaign plays.\n- **Advisor** — executive summary, insights, top 3 recommendations and KPIs.` },
  { id: "sql", title: "SQL Studio", body: `- Your active dataset is always the table \`data\`.\n- Use standard SELECT, WHERE, GROUP BY, ORDER BY, LIMIT and aggregates (SUM, AVG, COUNT, MIN, MAX, ROUND).\n- Month grouping: \`SUBSTRING(order_date, 1, 7)\`.\n- Run with **⌘/Ctrl + Enter**; results can be viewed as a table or chart and exported to CSV.` },
  { id: "anomalies", title: "Anomaly Watch", body: `- Daily series per metric, compared against a rolling 14-day baseline (7–30 configurable).\n- Robust z-score (median/MAD, log space). Flag when |z| ≥ threshold (default 3σ); critical when |z| ≥ 5.\n- Each alert includes the top contributing value of your main dimension.` },
  { id: "ai", title: "AI engine & privacy", body: `- With a **Google Gemini** key configured (server env \`GEMINI_API_KEY\` or your own key in Settings), agents answer generatively.\n- Without a key, the built-in DataOps engine answers from real statistics computed on your data.\n- Only a compact profile (column names, types, counts, averages, top categories) is sent to the model.` },
  { id: "about", title: "About", body: `DataOps was designed and built as an end-to-end analytics product: a Next.js front end, an in-browser analysis engine, and an LLM layer for natural-language insights.` },
];
