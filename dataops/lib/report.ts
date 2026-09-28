/**
 * Builds the full analysis "project package" for a dataset:
 * data overview → cleaning (before/after) → dashboard → SQL analysis → recommendations.
 * The Reports page renders it, and the Excel / SQL / ZIP exports are generated from it.
 */
import type { Row } from "./sample-data";
import { autoClean, profileDataset, label, fmtShort, type DatasetProfile, type Issue } from "./analytics";
import { computeInsights, buildDashboard, type ChartSpec, type Insights } from "./insights";
import { aggFor, categoricalCols, numericCols, yearColumn, words } from "./semantics";
import { localAgentReply } from "./local-engine";
import { runSQL } from "./sql";
import type { QueryEntry } from "./store";

export interface SQLSection {
  title: string;
  purpose: string;
  sql: string;
  source: "auto" | "studio" | "agent";
  question?: string;
  result: { columns: string[]; rows: Row[]; total: number; error?: string };
}

export interface ReportModel {
  datasetName: string;
  baseName: string;
  author: string;
  role?: string;
  date: string;
  raw: { rows: Row[]; profile: DatasetProfile };
  cleaned: { rows: Row[]; profile: DatasetProfile; log: string[] };
  issuesBefore: Issue[];
  insights: Insights;
  charts: ChartSpec[];
  summary: string[];
  recommendations: string[];
  sql: SQLSection[];
}

const q = (c: string) => "`" + c + "`";

export function baseNameOf(name: string) {
  return name.replace(/\.csv$/i, "").replace(/_cleaned$/i, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "dataset";
}

function standardQueries(p: DatasetProfile, ins: Insights): Omit<SQLSection, "result">[] {
  const out: Omit<SQLSection, "result">[] = [];
  const m = ins.metric;
  const nums = numericCols(p).slice(0, 4);
  out.push({
    title: "Dataset overview",
    purpose: "How many records there are and the headline statistics of the main measures.",
    source: "auto",
    sql: `SELECT COUNT(*) AS records${nums.map((c) => `,\n       ROUND(AVG(${q(c.name)}), 2) AS avg_${words(c.name).replace(/ /g, "_")}`).join("")}${m ? `,\n       MIN(${q(m)}) AS min_${words(m).replace(/ /g, "_")},\n       MAX(${q(m)}) AS max_${words(m).replace(/ /g, "_")}` : ""}\nFROM data`,
  });
  categoricalCols(p, 30).slice(0, 3).forEach((c) => {
    const measure = m ? (aggFor(m) === "avg" ? `ROUND(AVG(${q(m)}), 2) AS avg_${words(m).replace(/ /g, "_")}` : `SUM(${q(m)}) AS total_${words(m).replace(/ /g, "_")}`) : "";
    out.push({
      title: `${m ? `${aggFor(m) === "avg" ? "Average" : "Total"} ${label(m)}` : "Records"} by ${label(c.name)}`,
      purpose: `Compares each ${label(c.name).toLowerCase()} — which ones lead and which lag.`,
      source: "auto",
      sql: `SELECT ${q(c.name)},\n       COUNT(*) AS records${measure ? `,\n       ${measure}` : ""}\nFROM data\nGROUP BY ${q(c.name)}\nORDER BY ${measure ? measure.split(" AS ")[1] : "records"} DESC`,
    });
  });
  if (p.primaryDate) {
    out.push({
      title: `Monthly trend${m ? ` of ${label(m)}` : ""}`,
      purpose: "How the business moved month by month.",
      source: "auto",
      sql: `SELECT SUBSTRING(${q(p.primaryDate)}, 1, 7) AS month,\n       COUNT(*) AS records${m ? `,\n       ${aggFor(m) === "avg" ? `ROUND(AVG(${q(m)}), 2)` : `SUM(${q(m)})`} AS ${aggFor(m) === "avg" ? "avg" : "total"}_${words(m).replace(/ /g, "_")}` : ""}\nFROM data\nGROUP BY SUBSTRING(${q(p.primaryDate)}, 1, 7)\nORDER BY month ASC`,
    });
  } else {
    const y = yearColumn(p);
    if (y)
      out.push({
        title: `${label(y)}-wise view${m ? ` of ${label(m)}` : ""}`,
        purpose: `How records and ${m ? label(m).toLowerCase() : "counts"} change across ${label(y).toLowerCase()}.`,
        source: "auto",
        sql: `SELECT ${q(y)},\n       COUNT(*) AS records${m ? `,\n       ROUND(AVG(${q(m)}), 2) AS avg_${words(m).replace(/ /g, "_")}` : ""}\nFROM data\nGROUP BY ${q(y)}\nORDER BY ${q(y)} ASC`,
      });
  }
  if (m)
    out.push({
      title: `Top 10 records by ${label(m)}`,
      purpose: "The individual records with the highest values.",
      source: "auto",
      sql: `SELECT *\nFROM data\nWHERE ${q(m)} IS NOT NULL\nORDER BY ${q(m)} DESC\nLIMIT 10`,
    });
  return out;
}

function sectionLines(md: string, heading: RegExp) {
  const parts = md.split(/\n(?=### )/);
  const sec = parts.find((s) => heading.test(s.split("\n")[0]));
  if (!sec) return [];
  return sec
    .split("\n")
    .slice(1)
    .filter((l) => /^\s*(\d+\.|-)\s/.test(l))
    .map((l) => l.replace(/^\s*(\d+\.|-)\s/, "").trim());
}

export async function buildReport(opts: {
  datasetName: string;
  rows: Row[];
  cleaned: boolean;
  cleanLog?: string[];
  parentRows?: Row[] | null;
  queries?: QueryEntry[];
  author: string;
  role?: string;
}): Promise<ReportModel> {
  let rawRows: Row[];
  let cleanRows: Row[];
  let log: string[];
  if (opts.cleaned) {
    rawRows = opts.parentRows && opts.parentRows.length ? opts.parentRows : opts.rows;
    cleanRows = opts.rows;
    log = opts.cleanLog || [];
  } else {
    rawRows = opts.rows;
    const res = autoClean(rawRows, profileDataset(rawRows));
    cleanRows = res.rows;
    log = res.log;
  }
  const rawProfile = profileDataset(rawRows);
  const cleanProfile = profileDataset(cleanRows);
  const insights = computeInsights(cleanRows, cleanProfile);
  const charts = buildDashboard(cleanRows, cleanProfile, insights);

  const advisor = localAgentReply("advisor", "executive summary and recommendations", cleanRows, cleanProfile);
  const summary = sectionLines(advisor.content, /Executive summary/i);
  const recommendations = sectionLines(advisor.content, /Top recommendations/i);

  // SQL: standard analysis + everything the user ran (newest first, de-duplicated)
  const std = standardQueries(cleanProfile, insights);
  const seen = new Set(std.map((s) => s.sql.replace(/\s+/g, " ").trim()));
  const user = (opts.queries || [])
    .filter((x) => {
      const k = x.sql.replace(/\s+/g, " ").trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12)
    .map((x, i) => ({
      title: x.question ? `“${x.question}”` : `Your query ${i + 1}`,
      purpose: x.source === "agent" ? "Asked to the SQL agent in plain language." : "Written / run in SQL Studio.",
      source: x.source,
      question: x.question,
      sql: x.sql,
    }));
  const sql: SQLSection[] = [];
  for (const s of [...std, ...user]) {
    const r = await runSQL(s.sql, cleanRows);
    sql.push({ ...s, result: { columns: r.columns, rows: r.rows.slice(0, 15), total: r.rows.length, error: r.error } });
  }

  return {
    datasetName: opts.datasetName,
    baseName: baseNameOf(opts.datasetName),
    author: opts.author,
    role: opts.role,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    raw: { rows: rawRows, profile: rawProfile },
    cleaned: { rows: cleanRows, profile: cleanProfile, log },
    issuesBefore: rawProfile.issues,
    insights,
    charts,
    summary,
    recommendations,
    sql,
  };
}

export const mdStrip = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "").replace(/\*([^*]+)\*/g, "$1");

export function reportMarkdown(r: ReportModel) {
  const L: string[] = [];
  L.push(`# Data Analysis Report — ${r.datasetName}`, `Prepared by ${r.author}${r.role ? `, ${r.role}` : ""} · ${r.date} · Generated with DataOps`, "");
  L.push("## 1. Executive summary", ...r.summary.map((s) => `- ${s}`), "");
  L.push("## 2. Data overview", `- Records: ${r.raw.profile.rows.toLocaleString("en-IN")} raw → ${r.cleaned.profile.rows.toLocaleString("en-IN")} after cleaning`, `- Columns: ${r.raw.profile.columns}`, `- Quality score: ${r.raw.profile.qualityScore}/100 → ${r.cleaned.profile.qualityScore}/100`, "");
  L.push("## 3. Data cleaning", ...(r.cleaned.log.length ? r.cleaned.log.map((l, i) => `${i + 1}. ${l}`) : ["No cleaning was required."]), "");
  L.push("## 4. Key numbers", ...r.insights.kpis.map((k) => `- ${k.label}: ${k.value}${k.sub ? ` (${k.sub})` : ""}`), "");
  L.push("## 5. SQL analysis");
  r.sql.forEach((s, i) => {
    L.push(`### 5.${i + 1} ${s.title}`, s.purpose, "```sql", s.sql, "```");
    if (s.result.error) L.push(`Error: ${s.result.error}`);
    else if (s.result.rows.length) {
      L.push(`| ${s.result.columns.join(" | ")} |`, `|${s.result.columns.map(() => "---").join("|")}|`);
      s.result.rows.slice(0, 10).forEach((row) => L.push(`| ${s.result.columns.map((c) => (row[c] == null ? "" : typeof row[c] === "number" ? fmtShort(row[c]) : String(row[c]))).join(" | ")} |`));
      if (s.result.total > 10) L.push(`_…${s.result.total - 10} more rows_`);
    }
    L.push("");
  });
  L.push("## 6. Recommendations", ...r.recommendations.map((x, i) => `${i + 1}. ${x}`), "");
  return L.join("\n").replace(/\*Impact: (\w+)\*/g, "(Impact: $1)");
}
