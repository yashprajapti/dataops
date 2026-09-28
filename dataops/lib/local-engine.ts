/**
 * DataOps local analysis engine.
 * Every agent answers the *actual question* from the real dataset — with numbers,
 * charts chosen for the question, and the next steps an analyst would take.
 * Works with zero API keys; when Gemini is configured it writes the prose and
 * this engine still supplies SQL, charts and verified numbers.
 */
import type { AgentId } from "./agents";
import type { Row } from "./sample-data";
import { DatasetProfile, groupBy, label, fmtShort, detectAnomalies, timeSeries, correlation } from "./analytics";
import { aggFor, aggLabel, categoricalCols, isMoney, numericCols, parseQuestion, words, yearColumn, type ParsedQuestion } from "./semantics";
import { bands, buildDashboard, computeInsights, histogramOf, metricBy, money, scatterOf, strength, trendSeries, type ChartSpec } from "./insights";

export type { ChartSpec } from "./insights";

export interface AgentReply {
  content: string;
  sql?: string;
  chart?: ChartSpec; // legacy single chart
  charts?: ChartSpec[];
}

const q = (c: string) => "`" + c + "`";
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (x: number) => (x * 100).toFixed(1) + "%";
const REVENUE_WORDS = /(revenue|sales|kamai|income|turnover|gmv)/;

/* ============================================================================ */
/* Text-to-SQL                                                                   */
/* ============================================================================ */
export function textToSQL(question: string, p: DatasetProfile, rows: Row[]): string {
  const pq = parseQuestion(question, p, rows);
  const dim = pq.dims[0];
  // "which fuel type has the most cars" → no measure named + a group → count records
  const countByDefault = !pq.metrics.length && !!dim && !pq.agg && !pq.wantsTrend && !pq.wantsDistribution;
  const metric = pq.metrics[0] || (pq.wantsCount || countByDefault ? undefined : p.primaryMetric);
  const where = pq.filters.length ? `\nWHERE ${pq.filters.map((f) => `${q(f.col)} = '${f.value.replace(/'/g, "''")}'`).join("\n  AND ")}` : "";
  const andWhere = (cond: string) => (where ? `${where}\n  AND ${cond}` : `\nWHERE ${cond}`);
  const dir = pq.direction === "asc" ? "ASC" : "DESC";
  const agg = pq.agg === "count" || (!metric && !pq.agg) ? "count" : pq.agg || aggFor(metric);
  const measure = (m?: string) => (agg === "count" || !m ? "COUNT(*)" : agg === "avg" ? `ROUND(AVG(${q(m)}), 2)` : `${agg.toUpperCase()}(${q(m)})`);
  const alias = agg === "count" || !metric ? "records" : `${agg}_${words(metric).replace(/ /g, "_")}`;

  // 1. list rows: "top 5 most expensive cars"
  if (pq.wantsRows && metric) {
    const cols = [...p.cols.filter((c) => c.type !== "id" && c.name !== metric).slice(0, 5).map((c) => c.name), metric];
    const idCol = p.cols.find((c) => c.type === "id")?.name;
    return `SELECT ${[...(idCol ? [idCol] : []), ...cols].map(q).join(", ")}\nFROM data${andWhere(`${q(metric)} IS NOT NULL`)}\nORDER BY ${q(metric)} ${dir}\nLIMIT ${pq.topN || 5}`;
  }
  // 2. relationship between two numbers
  if (pq.wantsRelation && pq.metrics.length >= 2 && !dim) {
    const [a, b] = pq.metrics;
    return `SELECT ${q(a)}, ${q(b)}\nFROM data${andWhere(`${q(a)} IS NOT NULL AND ${q(b)} IS NOT NULL`)}`;
  }
  // 3. trend over time (date → month, else a year column)
  if (pq.wantsTrend) {
    if (p.primaryDate) {
      const daily = /(daily|per day|each day|by day|roz)/.test(words(question));
      const expr = daily ? q(p.primaryDate) : `SUBSTRING(${q(p.primaryDate)}, 1, 7)`;
      const name = daily ? "day" : "month";
      return `SELECT ${expr} AS ${name},\n       COUNT(*) AS records,\n       ${measure(metric)} AS ${alias}\nFROM data${where}\nGROUP BY ${expr}\nORDER BY ${name} ASC`;
    }
    const y = yearColumn(p);
    if (y) return `SELECT ${q(y)},\n       COUNT(*) AS records${metric ? `,\n       ${measure(metric)} AS ${alias}` : ""}\nFROM data${where}\nGROUP BY ${q(y)}\nORDER BY ${q(y)} ASC`;
  }
  // 4. distribution buckets
  if (pq.wantsDistribution && metric && !dim) {
    const c = p.cols.find((x) => x.name === metric)!;
    const w = Math.max(1, Math.round(((c.max! - c.min!) / 10) / 10 ** Math.floor(Math.log10(Math.max(1, (c.max! - c.min!) / 10))))) * 10 ** Math.floor(Math.log10(Math.max(1, (c.max! - c.min!) / 10)));
    return `SELECT FLOOR(${q(metric)} / ${w}) * ${w} AS bucket_start,\n       COUNT(*) AS records\nFROM data${andWhere(`${q(metric)} IS NOT NULL`)}\nGROUP BY FLOOR(${q(metric)} / ${w}) * ${w}\nORDER BY bucket_start ASC`;
  }
  // 5. grouped
  const g = dim || (pq.wantsCount || pq.topN ? categoricalCols(p).find((c) => /brand|category|city|product|model|type|region|channel/i.test(c.name))?.name : undefined);
  if (g) {
    const second = metric && agg !== "count" ? `,\n       ${measure(metric)} AS ${alias}` : "";
    const orderBy = second ? alias : "records";
    return `SELECT ${q(g)},\n       COUNT(*) AS records${second}\nFROM data${where}\nGROUP BY ${q(g)}\nORDER BY ${orderBy} ${dir}${pq.topN ? `\nLIMIT ${pq.topN}` : ""}`;
  }
  // 6. single-number summary
  if (metric) return `SELECT COUNT(*) AS records,\n       ROUND(AVG(${q(metric)}), 2) AS avg_${words(metric).replace(/ /g, "_")},\n       MIN(${q(metric)}) AS min_${words(metric).replace(/ /g, "_")},\n       MAX(${q(metric)}) AS max_${words(metric).replace(/ /g, "_")}${aggFor(metric) === "sum" ? `,\n       SUM(${q(metric)}) AS total_${words(metric).replace(/ /g, "_")}` : ""}\nFROM data${where}`;
  return `SELECT COUNT(*) AS records\nFROM data${where}`;
}

export function explainSQL(raw: string): string {
  const sql = raw.replace(/`/g, "");
  const b: string[] = [];
  const sel = sql.match(/SELECT([\s\S]*?)FROM/i)?.[1]?.trim().replace(/\s+/g, " ");
  if (sel) b.push(`**SELECT** returns \`${sel.length > 110 ? sel.slice(0, 110) + "…" : sel}\``);
  if (/WHERE/i.test(sql)) b.push(`**WHERE** keeps only rows where \`${sql.match(/WHERE([\s\S]*?)(GROUP|ORDER|LIMIT|$)/i)?.[1]?.trim().replace(/\s+/g, " ")}\``);
  if (/GROUP BY/i.test(sql)) b.push(`**GROUP BY** collapses rows into one line per \`${sql.match(/GROUP BY\s+([^\n]+)/i)?.[1]}\``);
  if (/ORDER BY/i.test(sql)) b.push(`**ORDER BY** sorts by \`${sql.match(/ORDER BY\s+([^\n]+)/i)?.[1]}\``);
  if (/LIMIT/i.test(sql)) b.push(`**LIMIT** keeps the first ${sql.match(/LIMIT\s+(\d+)/i)?.[1]} rows`);
  return b.map((x) => `- ${x}`).join("\n");
}

/** Plain-English reading of a query result — appended under the SQL agent's answer */
export function describeResult(result: { columns: string[]; rows: Row[]; error?: string }, p: DatasetProfile | null, sql?: string): string {
  if (result.error || !result.rows.length) return result.error ? "" : "\n\n### Answer\nThe query returned **no rows** — try removing a filter.";
  const { columns, rows } = result;
  const nums = columns.filter((c) => rows.every((r) => typeof r[c] === "number" || r[c] == null));
  const texts = columns.filter((c) => !nums.includes(c));
  const isAggCol = (c: string) => /^(avg|sum|total|min|max|records|count)(_|$)/i.test(c);
  const aggCols = nums.filter(isAggCol);
  const labelCol = texts[0] ?? (aggCols.length && nums[0] && !isAggCol(nums[0]) ? nums[0] : undefined);
  const uniqueLabels = labelCol ? new Set(rows.map((r) => String(r[labelCol]))).size === rows.length : false;
  const out: string[] = ["\n\n### Answer"];
  const orderCol = sql?.match(/ORDER BY\s+`?([\w ]+?)`?\s+(ASC|DESC)/i)?.[1];

  // 1. single summary row
  if (rows.length === 1 && (!labelCol || aggCols.length === nums.length)) {
    if (labelCol) out.push(`**${rows[0][labelCol]}** — ${nums.map((c) => `${label(c).toLowerCase()} ${money(Number(rows[0][c]), isMoney(c.replace(/^(avg|sum|min|max|total)_/, "")))}`).join(", ")}.`);
    else out.push(...nums.map((c) => `- **${label(c)}:** ${money(Number(rows[0][c]), isMoney(c.replace(/^(avg|sum|min|max|total)_/, "")))}`));
    return out.join("\n");
  }

  // 2. individual records (e.g. "5 most expensive cars")
  if (!aggCols.length && (!uniqueLabels || columns.length > 3)) {
    const valCol = orderCol && columns.includes(orderCol) ? orderCol : nums.filter((c) => !/(^id$|_id$)/i.test(c)).pop();
    const nameCols = texts.filter((c) => !/(^id$|_id$|\bid\b)/i.test(c)).slice(0, 2);
    const extra = columns.find((c) => /year|yr/i.test(c) && c !== valCol);
    const m = isMoney(valCol);
    out.push(`${rows.length} record${rows.length === 1 ? "" : "s"}${valCol ? `, sorted by **${label(valCol)}**` : ""}:`);
    rows.slice(0, 10).forEach((r, i) => {
      const name = nameCols.map((c) => r[c]).filter((v) => v != null).join(" ") || `Row ${i + 1}`;
      out.push(`${i + 1}. **${name}**${extra ? ` (${r[extra]})` : ""}${valCol ? ` — ${label(valCol)} ${money(Number(r[valCol]), m)}` : ""}`);
    });
    if (valCol && rows.length > 1) {
      const vals = rows.map((r) => Number(r[valCol])).filter(Number.isFinite);
      out.push(`\nRange **${money(Math.min(...vals), m)} – ${money(Math.max(...vals), m)}**.`);
    }
    if (nameCols[0]) {
      const counts = new Map<string, number>();
      rows.forEach((r) => counts.set(String(r[nameCols[0]]), (counts.get(String(r[nameCols[0]])) || 0) + 1));
      const [topName, topN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topN > 1) out.push(`**${topName}** appears ${topN} times in this list — it dominates this segment.`);
    }
    return out.join("\n");
  }

  // 3. grouped result (one row per category)
  const val = [...aggCols].reverse().find((c) => !/^records$/i.test(c)) || aggCols[0] || nums[nums.length - 1];
  if (labelCol && val) {
    const m = isMoney(val.replace(/^(avg|sum|min|max|total)_/, ""));
    const sorted = [...rows].sort((a, b) => Number(b[val]) - Number(a[val]));
    const top = sorted[0], bot = sorted[sorted.length - 1];
    const additive = /^(sum|total|records|count)/i.test(val);
    const total = rows.reduce((s, r) => s + (Number(r[val]) || 0), 0);
    out.push(`- **${top[labelCol]}** is highest at **${money(Number(top[val]), m)}**${additive ? ` (${pct(Number(top[val]) / (total || 1))} of the shown total)` : ""}.`);
    if (rows.length > 1) out.push(`- **${bot[labelCol]}** is lowest at **${money(Number(bot[val]), m)}** — ${Number(bot[val]) ? `the leader is ${(Number(top[val]) / Number(bot[val])).toFixed(1)}× higher` : "a big gap"}.`);
    if (rows.length >= 4 && additive) out.push(`- The top 3 make up **${pct(sorted.slice(0, 3).reduce((s, r) => s + Number(r[val]), 0) / (total || 1))}** of the shown total.`);
    if (!additive && aggCols.includes("records")) {
      const small = rows.filter((r) => Number(r.records) < 5);
      if (small.length) out.push(`- ⚠️ ${small.length} group${small.length === 1 ? " has" : "s have"} fewer than 5 records — treat ${small.length === 1 ? "that average" : "those averages"} with caution.`);
    }
    return out.join("\n");
  }
  if (rows.length > 1 && nums.length >= 2) {
    const r = correlation(rows, nums[0], nums[1]);
    out.push(`- ${rows.length.toLocaleString("en-IN")} rows · \`${nums[0]}\` vs \`${nums[1]}\`: **${strength(r)}** relationship (r = ${r.toFixed(2)}).`);
    return out.join("\n");
  }
  out.push(`- ${rows.length.toLocaleString("en-IN")} rows returned.`);
  return out.join("\n");
}

/* ============================================================================ */
/* Helpers                                                                       */
/* ============================================================================ */
function followUps(p: DatasetProfile, pq: ParsedQuestion, rows: Row[]): string[] {
  const cats = categoricalCols(p).map((c) => c.name);
  const nums = numericCols(p).map((c) => c.name);
  const m = pq.metrics[0] || p.primaryMetric;
  const d = pq.dims[0] || p.primaryDim || cats[0];
  const d2 = cats.find((c) => c !== d);
  const n2 = nums.find((x) => x !== m);
  const out: string[] = [];
  if (m && d2) out.push(`${aggLabel(m).toLowerCase()} ${label(m).toLowerCase()} by ${label(d2).toLowerCase()}`);
  if (m && n2) out.push(`relation between ${label(m).toLowerCase()} and ${label(n2).toLowerCase()}`);
  if (m && d) out.push(`top 5 ${label(d).toLowerCase()} by ${aggLabel(m).toLowerCase()} ${label(m).toLowerCase()}`);
  if ((p.primaryDate || yearColumn(p)) && m) out.push(`${label(m).toLowerCase()} trend over time`);
  return out.filter((x) => !words(pq.raw).includes(words(x))).slice(0, 3);
}

const nextBlock = (items: string[]) => (items.length ? `\n\n### Ask next\n${items.map((x) => `- “${x}”`).join("\n")}` : "");

/* ============================================================================ */
/* Cleaner agent                                                                 */
/* ============================================================================ */
function cleaner(rows: Row[], p: DatasetProfile, question: string): AgentReply {
  const pq = parseQuestion(question, p, rows);
  const grade = p.qualityScore >= 90 ? "Excellent" : p.qualityScore >= 75 ? "Good" : p.qualityScore >= 60 ? "Needs work" : "Poor";
  const focus = [...new Set([...pq.metrics, ...pq.dims, ...p.cols.filter((c) => words(question).includes(words(c.name))).map((c) => c.name)])];
  const missingCols = p.cols.filter((c) => c.missing).sort((a, b) => b.missing - a.missing);
  const qs = words(question);
  const askMissing = /(missing|null|blank|empty|khali|gayab|na\b|nan)/.test(qs);
  const askDup = /(duplicate|repeat|dohra|same row)/.test(qs);
  const askOutlier = /(outlier|extreme|galat value|wrong value|anomal|ajeeb)/.test(qs);

  const sections: string[] = [];
  sections.push(`### Data Quality — ${p.qualityScore}/100 (${grade})\n- **${p.rows.toLocaleString("en-IN")} rows × ${p.columns} columns** · ${p.missingCells.toLocaleString("en-IN")} empty cells (${(p.missingPct * 100).toFixed(2)}%) · ${p.duplicates} duplicate rows · ${p.issues.length} issue${p.issues.length === 1 ? "" : "s"}`);

  // direct answer first
  if (askMissing || (!askDup && !askOutlier && !focus.length)) {
    sections.push(missingCols.length
      ? `### Columns with missing values\n| Column | Type | Missing | % of rows | Suggested fill |\n|---|---|---|---|---|\n${missingCols.map((c) => `| \`${c.name}\` | ${c.type} | ${c.missing} | ${(c.missingPct * 100).toFixed(1)}% | ${c.type === "number" ? `median (${fmtShort(c.median ?? 0)})` : `mode (“${c.top?.[0]?.value ?? "Unknown"}”)`} |`).join("\n")}`
      : "### Missing values\n✅ **No missing values** in any column.");
  }
  if (askDup || !focus.length) sections.push(p.duplicates ? `### Duplicates\n**${p.duplicates} rows** are exact copies of another row — they inflate every total and count. Remove them first.` : "### Duplicates\n✅ No exact duplicate rows.");
  const outCols = p.cols.filter((c) => c.outliers);
  if (askOutlier || !focus.length) sections.push(outCols.length ? `### Outliers\n${outCols.map((c) => `- \`${c.name}\`: **${c.outliers}** extreme values (max ${fmtShort(c.max!)} vs median ${fmtShort(c.median!)}) — verify at source, then cap at P99.`).join("\n")}` : "### Outliers\n✅ No extreme outliers.");
  const messy = p.cols.filter((c) => c.inconsistentCase);
  if (messy.length) sections.push(`### Inconsistent labels\n${messy.map((c) => `- \`${c.name}\`: **${c.inconsistentCase}** values written differently (e.g. casing/extra spaces) → standardise.`).join("\n")}`);

  focus.forEach((name) => {
    const c = p.cols.find((x) => x.name === name);
    if (!c) return;
    sections.push(`### Column deep-dive: \`${c.name}\`\n- Type: **${c.type}** · unique values: ${c.unique.toLocaleString("en-IN")} · missing: ${c.missing} (${(c.missingPct * 100).toFixed(1)}%)\n${c.type === "number" ? `- Range ${fmtShort(c.min!)} → ${fmtShort(c.max!)}, mean ${fmtShort(c.mean!)}, median ${fmtShort(c.median!)}, σ ${fmtShort(c.std!)} · outliers: ${c.outliers}` : `- Most common: ${(c.top || []).slice(0, 5).map((t) => `${t.value} (${t.count})`).join(", ")}${c.inconsistentCase ? ` · ${c.inconsistentCase} inconsistent labels` : ""}`}\n- **Verdict:** ${c.missing || c.outliers || c.inconsistentCase ? "needs cleaning — see plan below" : "clean ✅"}`);
  });

  const numMissing = missingCols.filter((c) => c.type === "number").map((c) => c.name);
  const catMissing = missingCols.filter((c) => c.type !== "number").map((c) => c.name);
  const catClean = messy.map((c) => c.name);
  if (p.issues.length) {
    sections.push(`### Cleaning plan (in this order)
1. **Remove duplicates**${p.duplicates ? ` — ${p.duplicates} rows` : " — none found, skip"}.
2. **Standardise labels**${catClean.length ? ` in ${catClean.map((c) => `\`${c}\``).join(", ")}` : " — none needed"}.
3. **Fill missing values**${numMissing.length ? ` — numbers with the median (${numMissing.map((c) => `\`${c}\``).join(", ")})` : ""}${catMissing.length ? `; text with the most common value (${catMissing.map((c) => `\`${c}\``).join(", ")})` : ""}${!numMissing.length && !catMissing.length ? " — none" : ""}.
4. **Cap outliers** at the 99th percentile${outCols.length ? ` (${outCols.map((c) => `\`${c.name}\``).join(", ")})` : " — none"}.

**In Excel:** Data → *Remove Duplicates* · helper column \`=PROPER(TRIM(A2))\` for labels · \`=IF(ISBLANK(B2), MEDIAN(B:B), B2)\` for gaps · Home → *Find & Select* → *Go To Special → Blanks* to spot empties.

**In SQL:**
\`\`\`sql
-- find missing values
SELECT ${missingCols.slice(0, 4).map((c) => `SUM(CASE WHEN ${q(c.name)} IS NULL THEN 1 ELSE 0 END) AS ${words(c.name).replace(/ /g, "_")}_missing`).join(",\n       ") || "COUNT(*) AS records"}
FROM data;
\`\`\`

**In Python (pandas):**
\`\`\`python
df = df.drop_duplicates()
${catClean.map((c) => `df["${c}"] = df["${c}"].str.strip().str.title()`).join("\n")}${catClean.length ? "\n" : ""}${numMissing.map((c) => `df["${c}"] = df["${c}"].fillna(df["${c}"].median())`).join("\n")}${numMissing.length ? "\n" : ""}${catMissing.map((c) => `df["${c}"] = df["${c}"].fillna(df["${c}"].mode()[0])`).join("\n")}
\`\`\``);
  }
  sections.push(`### Next step\n${p.issues.length ? "Click **Auto-clean** on the Datasets page — it applies this exact plan to a new copy (your original stays untouched) and logs every change. Then download the **cleaned Excel** from **Reports**." : "Your data is analysis-ready — go to **SQL Studio** or ask the **Advisor** for insights."}`);

  const charts: ChartSpec[] = [];
  if (missingCols.length) charts.push({ type: "bar", title: "Missing values by column", data: missingCols.slice(0, 12).map((c) => ({ name: c.name, value: c.missing })) });
  if (outCols.length) charts.push({ type: "bar", title: "Outliers by column", data: outCols.map((c) => ({ name: c.name, value: c.outliers! })) });
  focus.forEach((f) => {
    const c = p.cols.find((x) => x.name === f);
    if (c?.type === "number") charts.push({ type: "hist", title: `Distribution of ${label(f)}`, data: histogramOf(rows, f), money: isMoney(f) });
  });
  return { content: sections.join("\n\n"), charts: charts.slice(0, 3) };
}

/* ============================================================================ */
/* Viz agent                                                                     */
/* ============================================================================ */
function viz(rows: Row[], p: DatasetProfile, question: string): AgentReply {
  const pq = parseQuestion(question, p, rows);
  const qs = words(question);
  const cats = categoricalCols(p);
  const charts: ChartSpec[] = [];
  const lines: string[] = [];
  const hasRevenueCol = numericCols(p).some((c) => /revenue|sales|amount|gmv|income/i.test(c.name));
  const revenueAsked = REVENUE_WORDS.test(qs);
  const metric = pq.metrics[0] || p.primaryMetric;
  const dim = pq.dims[0] || p.primaryDim || cats[0]?.name;
  const m = isMoney(metric);
  let powerBI = "";

  if (revenueAsked && !hasRevenueCol && metric) {
    // e.g. car listings: treat price as the sale value
    lines.push(`### Revenue view\nThis dataset has **no revenue/sales column**, so I’m treating **\`${metric}\` as the sale value of each record** (i.e. revenue if every listing sold). Total = **${money(rows.reduce((s, r) => s + (Number(r[metric]) || 0), 0), m)}** across ${rows.length.toLocaleString("en-IN")} records.`);
    const byDim = dim ? groupBy(rows, dim, metric, "sum").filter((x) => x.name !== "Unknown") : [];
    if (byDim.length) charts.push({ type: "bar", title: `Revenue (total ${label(metric)}) by ${label(dim!)}`, data: byDim.slice(0, 12).map((d) => ({ name: d.name, value: r2(d.value) })), money: true });
    const y = yearColumn(p);
    if (y) charts.push({ type: "line", title: `Revenue (total ${label(metric)}) by ${label(y)}`, data: groupBy(rows, y, metric, "sum").filter((x) => x.name !== "Unknown").sort((a, b) => Number(a.name) - Number(b.name)).map((d) => ({ name: d.name, value: r2(d.value) })), money: true });
    const d2 = cats.find((c) => c.name !== dim && c.unique <= 6)?.name;
    if (d2) charts.push({ type: "donut", title: `Revenue share by ${label(d2)}`, data: groupBy(rows, d2, metric, "sum").filter((x) => x.name !== "Unknown").map((d) => ({ name: d.name, value: r2(d.value) })) });
    if (byDim.length) lines.push(`- **${byDim[0].name}** brings the most: ${money(byDim[0].value, true)} (${pct(byDim[0].value / byDim.reduce((s, x) => s + x.value, 0))}).`);
    powerBI = `Bar chart → Axis: \`${dim}\`, Values: Sum of \`${metric}\` · Line chart → Axis: \`${y ?? "date"}\`, Values: Sum of \`${metric}\` · Donut → Legend: \`${d2 ?? dim}\`, Values: Sum of \`${metric}\``;
  } else if (pq.wantsRelation && pq.metrics.length >= 2 && !(pq.wantsTrend && !pq.explicitRelation)) {
    const [a, b] = pq.metrics;
    const r = correlation(rows, a, b);
    charts.push({ type: "scatter", title: `${label(a)} vs ${label(b)}`, subtitle: `r = ${r.toFixed(2)} · ${strength(r)}`, points: scatterOf(rows, a, b, dim), xLabel: label(a), yLabel: label(b) });
    const bd = bands(rows, a);
    if (bd) {
      const g = groupBy(rows.map((x) => ({ ...x, __band: Number.isFinite(Number(x[a])) ? bd.label(Number(x[a])) : null })), "__band", b, "avg").filter((x) => x.name !== "Unknown");
      const order = ["Budget", "Mid-range", "Premium"];
      charts.push({ type: "bar", title: `Average ${label(b)} by ${label(a)} band`, subtitle: `Budget ≤ ${fmtShort(bd.q1)} < Mid ≤ ${fmtShort(bd.q2)} < Premium`, data: g.sort((x, y) => order.indexOf(x.name) - order.indexOf(y.name)).map((d) => ({ name: d.name, value: r2(d.value) })), money: isMoney(b) });
    }
    lines.push(`### ${label(a)} vs ${label(b)}\n**Best chart: scatter plot** — one dot per record, ${label(a)} on X, ${label(b)} on Y.\n- Correlation **r = ${r.toFixed(2)}** → ${strength(r)} relationship. ${Math.abs(r) < 0.2 ? `Knowing ${label(a).toLowerCase()} tells you almost nothing about ${label(b).toLowerCase()}.` : r > 0 ? `As ${label(a).toLowerCase()} rises, ${label(b).toLowerCase()} tends to rise.` : `As ${label(a).toLowerCase()} rises, ${label(b).toLowerCase()} tends to fall.`}\n- The band chart below makes the pattern easy for non-technical readers.`);
    powerBI = `Scatter chart → X axis: \`${a}\`, Y axis: \`${b}\`, Legend: \`${dim ?? ""}\` · Analytics pane → add **Trend line**`;
  } else if (pq.wantsTrend) {
    const t = trendSeries(rows, p, metric);
    if (t && t.data.length >= 2) {
      charts.push({ type: t.axis === "Month" ? "area" : "line", title: `${aggLabel(metric)} ${label(metric || "records")} by ${t.axis.toLowerCase()}`, data: t.data.map((d) => ({ name: d.name, value: r2(d.value) })), xLabel: t.axis, money: m });
      const first = t.data[0], last = t.data[t.data.length - 1];
      const peak = [...t.data].sort((a, b) => b.value - a.value)[0];
      lines.push(`### Trend\n**Best chart: line chart** over ${t.axis.toLowerCase()}.\n- From **${first.name}** (${money(first.value, m)}) to **${last.name}** (${money(last.value, m)}): ${last.value >= first.value ? "▲" : "▼"} ${pct(Math.abs(last.value - first.value) / (first.value || 1))}.\n- Peak: **${peak.name}** at ${money(peak.value, m)}.`);
      const bd2 = dim && dim !== yearColumn(p) ? dim : cats.find((c) => c.name !== yearColumn(p))?.name;
      if (bd2) charts.push({ type: "bar", title: `${aggLabel(metric)} ${label(metric || "records")} by ${label(bd2)}`, data: metricBy(rows, bd2, metric).filter((x) => x.name !== "Unknown").slice(0, 10).map((d) => ({ name: d.name, value: r2(d.value) })), money: m });
      powerBI = `Line chart → X axis: \`${p.primaryDate ?? yearColumn(p)}\`, Y axis: ${aggLabel(metric)} of \`${metric}\``;
    } else lines.push("### Trend\nThis dataset has **no date or year column**, so a time trend isn’t possible. Showing the breakdown instead.");
  }

  if (!charts.length) {
    if (pq.wantsDistribution && metric) {
      charts.push({ type: "hist", title: `Distribution of ${label(metric)}`, data: histogramOf(rows, metric), money: m });
      const c = p.cols.find((x) => x.name === metric)!;
      lines.push(`### Distribution of ${label(metric)}\n**Best chart: histogram.** Median ${money(c.median!, m)}, mean ${money(c.mean!, m)}${c.mean! > c.median! * 1.2 ? " — right-skewed, a few high values pull the average up" : ""}.`);
      powerBI = `Histogram: create bins on \`${metric}\` (right-click → New group → Bin), then Column chart → Axis: bins, Values: Count`;
    } else if (pq.dims.length && (pq.wantsShare || pq.wantsCount || !pq.metrics.length)) {
      const d = pq.dims[0];
      const g = groupBy(rows, d, undefined, "count").filter((x) => x.name !== "Unknown");
      charts.push(g.length <= 6 || pq.wantsShare ? { type: "donut", title: `Share of records by ${label(d)}`, data: g.slice(0, 8) } : { type: "bar", title: `Records by ${label(d)}`, data: g.slice(0, 12) });
      lines.push(`### ${label(d)} breakdown\n**Best chart: ${g.length <= 6 ? "donut (few groups)" : "ranked bar (many groups)"}.** **${g[0]?.name}** leads with ${g[0]?.value} records (${pct((g[0]?.value || 0) / rows.length)}).`);
      if (metric) charts.push({ type: "bar", title: `${aggLabel(metric)} ${label(metric)} by ${label(d)}`, data: metricBy(rows, d, metric).filter((x) => x.name !== "Unknown").slice(0, 12).map((x) => ({ name: x.name, value: r2(x.value) })), money: m });
      powerBI = `${g.length <= 6 ? "Donut" : "Clustered bar"} chart → Legend/Axis: \`${d}\`, Values: Count`;
    } else if (pq.dims.length && metric) {
      const d = pq.dims[0];
      const g = metricBy(rows, d, metric).filter((x) => x.name !== "Unknown");
      charts.push({ type: "bar", title: `${aggLabel(metric)} ${label(metric)} by ${label(d)}`, data: g.slice(0, 12).map((x) => ({ name: x.name, value: r2(x.value) })), money: m });
      lines.push(`### ${aggLabel(metric)} ${label(metric)} by ${label(d)}\n**Best chart: ranked bar.** **${g[0]?.name}** is highest (${money(g[0]?.value || 0, m)}), **${g[g.length - 1]?.name}** lowest (${money(g[g.length - 1]?.value || 0, m)}).`);
      powerBI = `Clustered bar chart → Axis: \`${d}\`, Values: ${aggLabel(metric)} of \`${metric}\` · sort descending`;
    } else if (pq.metrics.length === 1) {
      const mm = pq.metrics[0];
      charts.push({ type: "hist", title: `Distribution of ${label(mm)}`, data: histogramOf(rows, mm), money: isMoney(mm) });
      if (dim) charts.push({ type: "bar", title: `${aggLabel(mm)} ${label(mm)} by ${label(dim)}`, data: metricBy(rows, dim, mm).filter((x) => x.name !== "Unknown").slice(0, 12).map((x) => ({ name: x.name, value: r2(x.value) })), money: isMoney(mm) });
      lines.push(`### ${label(mm)}\nTwo views: the **histogram** shows how values are spread; the **bar** compares ${label(dim || "groups").toLowerCase()}.`);
    } else {
      // "which charts should I build?" → full dashboard
      const dash = buildDashboard(rows, p);
      charts.push(...dash.slice(0, 4));
      lines.push(`### Recommended dashboard for this dataset\n${dash.map((c, i) => `${i + 1}. **${c.title}** — ${c.type === "scatter" ? "scatter" : c.type === "hist" ? "histogram" : c.type === "donut" ? "donut" : c.type === "bar" ? "ranked bar" : "line"} chart${c.subtitle ? ` (${c.subtitle})` : ""}`).join("\n")}\n\nThe first four are rendered below; the full set is in **Reports**.`);
    }
  }

  const ins = computeInsights(rows, p);
  lines.push(`### Build it in Power BI / Tableau\n${powerBI ? `- ${powerBI}\n` : ""}- KPI cards on top: ${ins.kpis.slice(0, 4).map((k) => k.label).join(" · ")}\n- Slicers: ${[...cats.slice(0, 3).map((c) => `\`${c.name}\``), yearColumn(p) ? `\`${yearColumn(p)}\`` : p.primaryDate ? "date range" : ""].filter(Boolean).join(", ")}\n- Title each chart with the insight (e.g. “${ins.byDim[0] ? `${ins.byDim[0].name} leads ${label(ins.dim!).toLowerCase()}` : "Key driver"}”), sort bars descending, start axes at zero.`);
  return { content: lines.join("\n\n") + nextBlock(followUps(p, pq, rows)), charts: charts.slice(0, 3) };
}

/* ============================================================================ */
/* Marketing Analytics agent                                                     */
/* ============================================================================ */
function marketing(rows: Row[], p: DatasetProfile, question: string): AgentReply {
  const pq = parseQuestion(question, p, rows);
  const cats = categoricalCols(p);
  const metric = pq.metrics[0] || p.primaryMetric;
  const m = isMoney(metric);
  const dim = pq.dims[0] || cats.find((c) => /brand|product|model|category|channel|campaign|segment|city/i.test(c.name))?.name || cats[0]?.name;
  const sections: string[] = [];
  const charts: ChartSpec[] = [];
  const has = (n: string) => p.numeric.includes(n);

  // campaign datasets → channel efficiency
  if (has("spend") && has("revenue")) {
    const ch = cats.find((c) => /channel/i.test(c.name))?.name || dim!;
    const spend = groupBy(rows, ch, "spend");
    const rev = new Map(groupBy(rows, ch, "revenue").map((d) => [d.name, d.value]));
    const conv = has("conversions") ? new Map(groupBy(rows, ch, "conversions").map((d) => [d.name, d.value])) : null;
    const tbl = spend.map((s) => ({ name: s.name, spend: s.value, rev: rev.get(s.name) || 0, cac: conv ? s.value / (conv.get(s.name) || 1) : 0 })).map((x) => ({ ...x, roas: x.rev / (x.spend || 1) })).sort((a, b) => b.roas - a.roas);
    sections.push(`### Channel efficiency\n| ${label(ch)} | Spend | Revenue | ROAS | ${conv ? "CAC |" : ""}\n|---|---|---|---|${conv ? "---|" : ""}\n${tbl.map((t) => `| ${t.name} | ₹${fmtShort(t.spend)} | ₹${fmtShort(t.rev)} | **${t.roas.toFixed(2)}x** | ${conv ? `₹${t.cac.toFixed(0)} |` : ""}`).join("\n")}\n\n**Move budget** from **${tbl[tbl.length - 1].name}** (${tbl[tbl.length - 1].roas.toFixed(1)}x) to **${tbl[0].name}** (${tbl[0].roas.toFixed(1)}x).`);
    charts.push({ type: "bar", title: `ROAS by ${label(ch)}`, data: tbl.map((t) => ({ name: t.name, value: r2(t.roas) })), valueLabel: "x" });
  }

  // popularity / market share
  if (dim) {
    const cnt = groupBy(rows, dim, undefined, "count").filter((x) => x.name !== "Unknown");
    const total = cnt.reduce((s, x) => s + x.value, 0) || 1;
    const top3 = cnt.slice(0, 3).reduce((s, x) => s + x.value, 0) / total;
    sections.push(`### Most popular ${label(dim).toLowerCase()} (by number of records)\n| Rank | ${label(dim)} | Records | Share |\n|---|---|---|---|\n${cnt.slice(0, 8).map((x, i) => `| ${i + 1} | **${x.name}** | ${x.value.toLocaleString("en-IN")} | ${pct(x.value / total)} |`).join("\n")}\n\n**Answer:** **${cnt[0]?.name}** is the most popular with **${pct((cnt[0]?.value || 0) / total)}** of all records. The top 3 together hold **${pct(top3)}** — ${top3 > 0.6 ? "a concentrated market" : top3 > 0.35 ? "moderately concentrated" : "a fragmented market with many players"}.`);
    charts.push(cnt.length <= 6 ? { type: "donut", title: `Market share by ${label(dim)}`, data: cnt } : { type: "bar", title: `Records by ${label(dim)}`, data: cnt.slice(0, 12) });

    if (metric) {
      const byM = metricBy(rows, dim, metric).filter((x) => x.name !== "Unknown");
      const bd = bands(rows, metric);
      sections.push(`### ${aggLabel(metric)} ${label(metric).toLowerCase()} by ${label(dim).toLowerCase()}\n${byM.slice(0, 5).map((x) => `- **${x.name}**: ${money(x.value, m)}`).join("\n")}`);
      if (bd && m) {
        const prem = rows.filter((r) => Number(r[metric]) > bd.q2);
        const premCnt = groupBy(prem, dim, undefined, "count").filter((x) => x.name !== "Unknown");
        const budget = rows.filter((r) => Number(r[metric]) <= bd.q1);
        const budCnt = groupBy(budget, dim, undefined, "count").filter((x) => x.name !== "Unknown");
        sections.push(`### Price positioning\n- **Budget** (≤ ${money(bd.q1, m)}): led by **${budCnt[0]?.name ?? "—"}** (${pct((budCnt[0]?.value || 0) / (budget.length || 1))} of budget records)\n- **Premium** (> ${money(bd.q2, m)}): led by **${premCnt[0]?.name ?? "—"}** (${pct((premCnt[0]?.value || 0) / (prem.length || 1))} of premium records)`);
        charts.push({ type: "bar", title: `Premium segment (> ${money(bd.q2, m)}) by ${label(dim)}`, data: premCnt.slice(0, 8) });
      }
    }
  }

  // segment mix (two categories)
  const d2 = cats.find((c) => c.name !== dim && c.unique <= 8)?.name;
  const d3 = cats.find((c) => c.name !== dim && c.name !== d2 && c.unique <= 8)?.name;
  if (d2 && d3) {
    const combos = groupBy(rows.map((r) => ({ ...r, __seg: r[d2] != null && r[d3] != null ? `${r[d2]} · ${r[d3]}` : null })), "__seg", undefined, "count").filter((x) => x.name !== "Unknown");
    sections.push(`### Customer / product segments (${label(d2)} × ${label(d3)})\n${combos.slice(0, 5).map((x, i) => `${i + 1}. **${x.name}** — ${x.value.toLocaleString("en-IN")} records (${pct(x.value / rows.length)})`).join("\n")}`);
  }

  // customer-type columns (e.g. new vs returning)
  const custCol = cats.find((c) => /customer|segment|type|tier|loyal/i.test(c.name) && c.name !== dim)?.name;
  if (custCol && metric) {
    const g = metricBy(rows, custCol, metric);
    sections.push(`### ${label(custCol)}\n${g.map((x) => `- **${x.name}**: ${aggLabel(metric).toLowerCase()} ${money(x.value, m)}`).join("\n")}`);
  }

  // data-driven plays
  const cnt = dim ? groupBy(rows, dim, undefined, "count").filter((x) => x.name !== "Unknown") : [];
  const byM = dim && metric ? metricBy(rows, dim, metric).filter((x) => x.name !== "Unknown") : [];
  const niche = byM.length && cnt.length ? byM.find((x) => (cnt.find((c) => c.name === x.name)?.value || 0) < (cnt[Math.floor(cnt.length / 2)]?.value || 0)) : undefined;
  sections.push(`### Recommended plays
1. **Lead with ${cnt[0]?.name ?? "the leader"}** — it already has the most demand (${cnt[0] ? pct(cnt[0].value / rows.length) : "—"}); feature it in ads and landing pages.
2. **${niche ? `Grow ${niche.name}` : "Test the long tail"}** — ${niche ? `fewer records but ${aggLabel(metric).toLowerCase()} ${label(metric!).toLowerCase()} of ${money(niche.value, m)}: a high-value niche worth targeted campaigns` : "run a small campaign on low-share groups and measure lift"}.
3. **Track weekly:** share by ${label(dim || "segment").toLowerCase()}, ${metric ? `${aggLabel(metric).toLowerCase()} ${label(metric).toLowerCase()}, ` : ""}conversion rate and CAC vs average order value.`);
  return { content: sections.join("\n\n") + nextBlock(followUps(p, pq, rows)), charts: charts.slice(0, 3) };
}

/* ============================================================================ */
/* Advisor agent                                                                 */
/* ============================================================================ */
function advisor(rows: Row[], p: DatasetProfile, question: string): AgentReply {
  const pq = parseQuestion(question, p, rows);
  const ins = computeInsights(rows, p);
  const { metric, dim, money: m } = ins;
  const sections: string[] = [];
  sections.push(`### Executive summary\n${ins.findings.slice(0, 6).map((f) => `- ${f}`).join("\n")}`);
  sections.push(`### Key numbers\n| Metric | Value | Note |\n|---|---|---|\n${ins.kpis.map((k) => `| ${k.label} | **${k.value}** | ${k.sub ?? ""} |`).join("\n")}`);

  // deep dive on anything the question names
  const focus = [...new Set([...pq.metrics, ...pq.dims])].filter((c) => c !== metric || pq.metrics.length);
  focus.slice(0, 2).forEach((f) => {
    const c = p.cols.find((x) => x.name === f);
    if (!c) return;
    if (c.type === "number") {
      const g = dim ? metricBy(rows, dim, f).filter((x) => x.name !== "Unknown") : [];
      sections.push(`### Deep dive: ${label(f)}\n- ${aggLabel(f)}: **${money(aggFor(f) === "sum" ? c.sum! : c.mean!, isMoney(f))}** · median ${money(c.median!, isMoney(f))} · range ${money(c.min!, isMoney(f))}–${money(c.max!, isMoney(f))}${g.length ? `\n- Highest ${label(dim!).toLowerCase()}: **${g[0].name}** (${money(g[0].value, isMoney(f))}); lowest: **${g[g.length - 1].name}** (${money(g[g.length - 1].value, isMoney(f))})` : ""}`);
    } else {
      const g = groupBy(rows, f, undefined, "count").filter((x) => x.name !== "Unknown");
      const gm = metric ? metricBy(rows, f, metric).filter((x) => x.name !== "Unknown") : [];
      sections.push(`### Deep dive: ${label(f)}\n- ${g.length} groups; most common **${g[0]?.name}** (${pct((g[0]?.value || 0) / rows.length)})${gm.length ? `\n- Best by ${aggLabel(metric).toLowerCase()} ${label(metric!).toLowerCase()}: **${gm[0].name}** (${money(gm[0].value, m)})` : ""}`);
    }
  });

  // recommendations built from the findings
  const recs: string[] = [];
  if (ins.byDim.length >= 2 && metric) {
    const top = ins.byDim[0], bot = ins.byDim[ins.byDim.length - 1];
    recs.push(ins.metricAgg === "sum"
      ? `**Double down on ${top.name}** — it drives ${pct(top.share)} of total ${label(metric).toLowerCase()}. Study what works there and replicate it in ${bot.name}. *Impact: high*`
      : `**Position around ${top.name}** — its average ${label(metric).toLowerCase()} (${money(top.value, m)}) is ${(top.value / (bot.value || 1)).toFixed(1)}× ${bot.name}'s. Price/promote the two segments differently. *Impact: high*`);
  }
  const driver = ins.correlations.find((c) => Math.abs(c.r) >= 0.3 && (c.a === metric || c.b === metric));
  if (driver) {
    const other = driver.a === metric ? driver.b : driver.a;
    recs.push(`**Use \`${other}\` as a lever for \`${metric}\`** — ${strength(driver.r)} link (r = ${driver.r.toFixed(2)}). ${driver.r > 0 ? "Increasing" : "Reducing"} ${label(other).toLowerCase()} is associated with higher ${label(metric!).toLowerCase()}; test it before acting (correlation ≠ causation). *Impact: medium*`);
  }
  if (ins.trend?.change !== undefined && ins.trend.axis === "Month") recs.push(`**${ins.trend.change >= 0 ? "Protect the growth" : "Reverse the decline"}** — ${label(metric || "records").toLowerCase()} moved ${ins.trend.change >= 0 ? "up" : "down"} ${pct(Math.abs(ins.trend.change))} over the period. Set a monthly target and track it on a dashboard. *Impact: medium*`);
  else if (ins.trend?.change !== undefined && metric) recs.push(`**Price/plan by ${ins.trend.axis.toLowerCase()}** — newer records carry ${pct(Math.abs(ins.trend.change))} ${ins.trend.change >= 0 ? "higher" : "lower"} ${aggLabel(metric).toLowerCase()} ${label(metric).toLowerCase()}; use ${ins.trend.axis.toLowerCase()} as a key segment in pricing and reporting. *Impact: medium*`);
  if (ins.anomalies) recs.push(`**Turn on Anomaly Watch alerts** — ${ins.anomalies} unusual days were detected; catching them within a day prevents repeat losses. *Impact: medium*`);
  if (p.qualityScore < 90) recs.push(`**Fix data quality at the source** (score ${p.qualityScore}/100) — every number above depends on it. Run Auto-clean, then fix the form/export that produces the errors. *Impact: medium*`);
  const col = metric ? p.cols.find((c) => c.name === metric) : undefined;
  if (col && col.mean! > col.median! * 1.3) recs.push(`**Report the median, not the average, for ${label(metric!).toLowerCase()}** — the average (${money(col.mean!, m)}) is inflated by a few high values; the typical value is ${money(col.median!, m)}. *Impact: low*`);
  sections.push(`### Top recommendations\n${recs.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join("\n")}`);

  const nextQ = followUps(p, pq, rows);
  sections.push(`### What I’d analyse next\n${nextQ.map((x) => `- “${x}”`).join("\n")}\n- Download the full dashboard, cleaned Excel and SQL script from **Reports**.`);
  const charts = buildDashboard(rows, p, ins).slice(0, 2);
  return { content: sections.join("\n\n"), charts };
}

/* ============================================================================ */
/* Entry point                                                                   */
/* ============================================================================ */
export function localAgentReply(agent: AgentId, question: string, rows: Row[] | null, p: DatasetProfile | null): AgentReply {
  if (!rows || !p || !rows.length) {
    return {
      content: `### Let's get some data in first\nI work best with a dataset. Head to **Datasets** and either:\n- upload a **CSV** (Excel → *Save As → CSV*), or\n- load one of the **sample datasets**.\n\nThen ask me anything — I'll ${agent === "sql" ? "write and run SQL for you" : "analyse it for you"}.`,
    };
  }
  switch (agent) {
    case "cleaner":
      return cleaner(rows, p, question);
    case "viz":
      return viz(rows, p, question);
    case "marketing":
      return marketing(rows, p, question);
    case "advisor":
      return advisor(rows, p, question);
    case "sql": {
      const sql = textToSQL(question, p, rows);
      const pq = parseQuestion(question, p, rows);
      const notes: string[] = [];
      if (REVENUE_WORDS.test(words(question)) && !numericCols(p).some((c) => /revenue|sales|amount|gmv|income/i.test(c.name)) && pq.metrics[0])
        notes.push(`> No revenue column exists, so I used \`${pq.metrics[0]}\` as the value per record.`);
      if (pq.metrics[0] && aggFor(pq.metrics[0]) === "avg" && !pq.agg && /AVG\(/.test(sql)) notes.push(`> \`${pq.metrics[0]}\` is a per-item value, so I **averaged** it — summing prices/ratings is misleading.`);
      return { content: `### The SQL\nFor: *${question}*\n\n\`\`\`sql\n${sql}\n\`\`\`\n${notes.length ? "\n" + notes.join("\n") + "\n" : ""}\n### How it works\n${explainSQL(sql)}${nextBlock(followUps(p, pq, rows))}`, sql };
    }
  }
}

/** Compact profile summary sent to the LLM as context (aggregates only — never raw rows) */
export function profileContext(name: string, p: DatasetProfile, rows: Row[]) {
  const cols = p.cols
    .map((c) => {
      if (c.type === "number") return `- ${c.name} (number, aggregate with ${aggFor(c.name).toUpperCase()}): mean ${fmtShort(c.mean!)}, median ${fmtShort(c.median!)}, min ${fmtShort(c.min!)}, max ${fmtShort(c.max!)}, missing ${c.missing}, outliers ${c.outliers}`;
      if (c.type === "date") return `- ${c.name} (date): ${c.minDate} → ${c.maxDate}, missing ${c.missing}`;
      return `- ${c.name} (${c.type}): ${c.unique} unique, missing ${c.missing}${c.top ? `, top: ${c.top.slice(0, 6).map((t) => `${t.value} (${t.count})`).join(", ")}` : ""}${c.inconsistentCase ? `, ${c.inconsistentCase} inconsistent labels` : ""}`;
    })
    .join("\n");
  const ins = computeInsights(rows, p);
  const extra: string[] = [];
  if (ins.dim && ins.metric) extra.push(`${aggLabel(ins.metric)} ${ins.metric} by ${ins.dim}: ` + ins.byDim.slice(0, 8).map((g) => `${g.name}=${fmtShort(g.value)}`).join(", "));
  if (ins.trend) extra.push(`${ins.metric ?? "records"} by ${ins.trend.axis}: ` + ins.trend.data.slice(0, 24).map((g) => `${g.name}=${fmtShort(g.value)}`).join(", "));
  if (ins.correlations.length) extra.push("Correlations: " + ins.correlations.map((c) => `${c.a}~${c.b} r=${c.r.toFixed(2)}`).join(", "));
  return `Dataset "${name}": ${p.rows} rows, ${p.columns} columns, ${p.duplicates} duplicate rows, quality score ${p.qualityScore}/100.
Columns:
${cols}
${extra.join("\n")}
Key findings: ${ins.findings.map((f) => f.replace(/\*\*/g, "")).join(" | ")}`;
}

// keep legacy imports working
export { detectAnomalies, timeSeries };
