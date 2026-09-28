/**
 * Deliverables a data analyst hands over:
 *  • Excel workbook — cleaned data + cleaning log + quality + column profile + SQL results
 *  • SQL script     — CREATE TABLE + INSERTs of the cleaned data + every analysis query
 *                     (MySQL, SQL Server / SSMS, or PostgreSQL)
 *  • ZIP package    — all of the above + cleaned CSV + a Markdown report
 */
import type { Row } from "./sample-data";
import { toCSV, label, type ColumnProfile } from "./analytics";
import { isMoney } from "./semantics";
import { reportMarkdown, mdStrip, type ReportModel } from "./report";

export type Dialect = "mysql" | "mssql" | "postgres";
export const DIALECTS: { id: Dialect; label: string; tool: string }[] = [
  { id: "mysql", label: "MySQL", tool: "MySQL Workbench" },
  { id: "mssql", label: "SQL Server", tool: "SSMS" },
  { id: "postgres", label: "PostgreSQL", tool: "pgAdmin / psql" },
];

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================================================================ */
/* Excel                                                                         */
/* ============================================================================ */
const TEAL = "FF0E7490";
const HEAD = { font: { bold: true, color: { argb: "FFFFFFFF" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } } as any, alignment: { vertical: "middle" } as any };

function styleHeader(row: any) {
  row.eachCell((c: any) => {
    c.font = HEAD.font;
    c.fill = HEAD.fill;
    c.alignment = HEAD.alignment;
    c.border = { bottom: { style: "thin", color: { argb: "FF0B5563" } } };
  });
  row.height = 20;
}

function autoWidth(ws: any, min = 8, max = 60) {
  ws.columns.forEach((col: any) => {
    let w = min;
    col.eachCell({ includeEmpty: false }, (c: any) => {
      const v = c.value == null ? "" : typeof c.value === "object" && c.value.richText ? c.value.richText.map((t: any) => t.text).join("") : String(c.value);
      w = Math.max(w, Math.min(max, v.length + 2));
    });
    col.width = w;
  });
}

function addTable(ws: any, rows: Row[], columns: string[], opts: { money?: Set<string> } = {}) {
  ws.addRow(columns); // keep the original column names so the file drops straight into Excel / Power BI
  styleHeader(ws.lastRow);
  rows.forEach((r) => ws.addRow(columns.map((c) => (r[c] === undefined ? null : r[c]))));
  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (opts.money?.has(c)) col.numFmt = "#,##0.00";
  });
}

export async function buildWorkbook(r: ReportModel): Promise<Blob> {
  const ExcelJS: any = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = `${r.author} (DataOps)`;
  wb.created = new Date();
  const cleanCols = r.cleaned.rows.length ? Object.keys(r.cleaned.rows[0]) : [];
  const money = new Set(cleanCols.filter((c) => isMoney(c) && r.cleaned.profile.cols.find((x) => x.name === c)?.type === "number"));

  /* 1. Summary */
  const s = wb.addWorksheet("Summary", { properties: { tabColor: { argb: TEAL } } });
  s.getColumn(1).width = 34;
  s.getColumn(2).width = 70;
  s.addRow([`Data Analysis Report — ${r.datasetName}`]).font = { bold: true, size: 16, color: { argb: TEAL } };
  s.addRow([`Prepared by ${r.author}${r.role ? `, ${r.role}` : ""} · ${r.date} · Generated with DataOps`]).font = { italic: true, color: { argb: "FF64748B" } };
  s.addRow([]);
  const kv = (k: string, v: any) => {
    const row = s.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  };
  s.addRow(["Data overview"]).font = { bold: true, size: 13 };
  kv("Records (raw → cleaned)", `${r.raw.profile.rows.toLocaleString("en-IN")} → ${r.cleaned.profile.rows.toLocaleString("en-IN")}`);
  kv("Columns", r.raw.profile.columns);
  kv("Data quality score", `${r.raw.profile.qualityScore}/100 → ${r.cleaned.profile.qualityScore}/100`);
  kv("Duplicates removed", r.raw.profile.duplicates);
  kv("Empty cells (raw)", r.raw.profile.missingCells);
  s.addRow([]);
  s.addRow(["Key numbers"]).font = { bold: true, size: 13 };
  r.insights.kpis.forEach((k) => kv(k.label, `${k.value}${k.sub ? `  (${k.sub})` : ""}`));
  s.addRow([]);
  s.addRow(["Executive summary"]).font = { bold: true, size: 13 };
  r.summary.forEach((x) => s.addRow(["•", mdStrip(x)]).getCell(2).alignment = { wrapText: true });
  s.addRow([]);
  s.addRow(["Recommendations"]).font = { bold: true, size: 13 };
  r.recommendations.forEach((x, i) => s.addRow([`${i + 1}.`, mdStrip(x)]).getCell(2).alignment = { wrapText: true });
  s.addRow([]);
  s.addRow(["Sheets in this workbook"]).font = { bold: true, size: 13 };
  [["Cleaned Data", "The analysis-ready dataset"], ["Cleaning Log", "Every change made during cleaning"], ["Data Quality", "Issues found in the raw data and how they were fixed"], ["Column Profile", "Type, completeness and statistics for every column"], ["SQL Analysis", "Each query with its result"], ["Raw Data", "The original file, untouched"]].forEach(([a, b]) => kv(a, b));

  /* 2. Cleaned data */
  const cd = wb.addWorksheet("Cleaned Data", { views: [{ state: "frozen", ySplit: 1 }] });
  addTable(cd, r.cleaned.rows, cleanCols, { money });
  cd.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, cleanCols.length) } };
  autoWidth(cd, 8, 40);

  /* 3. Cleaning log */
  const cl = wb.addWorksheet("Cleaning Log");
  cl.addRow(["Step", "Action"]);
  styleHeader(cl.lastRow);
  (r.cleaned.log.length ? r.cleaned.log : ["No cleaning was required — the data was already clean."]).forEach((l, i) => cl.addRow([i + 1, l]));
  cl.addRow([]);
  cl.addRow(["", `Quality score: ${r.raw.profile.qualityScore}/100 before → ${r.cleaned.profile.qualityScore}/100 after`]).font = { bold: true };
  cl.getColumn(1).width = 8;
  cl.getColumn(2).width = 90;

  /* 4. Data quality */
  const dq = wb.addWorksheet("Data Quality");
  dq.addRow(["Severity", "Column", "Issue", "Detail", "Fix applied / recommended"]);
  styleHeader(dq.lastRow);
  const sevFill: Record<string, string> = { high: "FFFEE2E2", medium: "FFFEF3C7", low: "FFF1F5F9" };
  (r.issuesBefore.length ? r.issuesBefore : [{ severity: "low", column: "—", title: "No issues found", detail: "", fix: "" } as any]).forEach((i: any) => {
    const row = dq.addRow([i.severity.toUpperCase(), i.column ?? "All columns", i.title.replace(/[“”]/g, '"'), i.detail, i.fix]);
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: sevFill[i.severity] || sevFill.low } };
    row.alignment = { wrapText: true, vertical: "top" };
  });
  [10, 18, 40, 45, 60].forEach((w, i) => (dq.getColumn(i + 1).width = w));

  /* 5. Column profile */
  const cp = wb.addWorksheet("Column Profile", { views: [{ state: "frozen", ySplit: 1 }] });
  cp.addRow(["Column", "Type", "Non-empty", "Missing (raw)", "Missing % (raw)", "Unique", "Mean", "Median", "Std dev", "Min", "Max", "Most common"]);
  styleHeader(cp.lastRow);
  r.cleaned.profile.cols.forEach((c: ColumnProfile) => {
    const raw = r.raw.profile.cols.find((x) => x.name === c.name);
    const num = c.type === "number";
    const round = (v?: number) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
    cp.addRow([c.name, c.type, c.count - c.missing, raw?.missing ?? c.missing, raw ? Math.round(raw.missingPct * 1000) / 10 : null, c.unique, num ? round(c.mean) : null, num ? round(c.median) : null, num ? round(c.std) : null, num ? round(c.min) : c.minDate ?? null, num ? round(c.max) : c.maxDate ?? null, c.top?.[0] ? `${c.top[0].value} (${c.top[0].count})` : null]);
  });
  autoWidth(cp, 8, 34);

  /* 6. SQL analysis */
  const sq = wb.addWorksheet("SQL Analysis");
  sq.getColumn(1).width = 26;
  r.sql.forEach((sec, idx) => {
    const t = sq.addRow([`Q${idx + 1}. ${mdStrip(sec.title)}`]);
    t.font = { bold: true, size: 12, color: { argb: TEAL } };
    sq.addRow([sec.purpose]).font = { italic: true, color: { argb: "FF64748B" } };
    const sqlRow = sq.addRow([sec.sql.replace(/`/g, "")]);
    sqlRow.font = { name: "Consolas", size: 10, color: { argb: "FF334155" } };
    sqlRow.alignment = { wrapText: true, vertical: "top" };
    sqlRow.height = Math.min(200, 15 * (sec.sql.split("\n").length + 1));
    sq.mergeCells(sqlRow.number, 1, sqlRow.number, Math.max(4, sec.result.columns.length));
    if (sec.result.error) sq.addRow([`Error: ${sec.result.error}`]).font = { color: { argb: "FFB91C1C" } };
    else {
      sq.addRow(sec.result.columns);
      styleHeader(sq.lastRow);
      sec.result.rows.forEach((row) => sq.addRow(sec.result.columns.map((c) => row[c] ?? null)));
      if (sec.result.total > sec.result.rows.length) sq.addRow([`… ${sec.result.total - sec.result.rows.length} more rows (run the SQL file to see all)`]).font = { italic: true, color: { argb: "FF64748B" } };
    }
    sq.addRow([]);
  });
  for (let i = 2; i <= 12; i++) sq.getColumn(i).width = 18;

  /* 7. Raw data */
  if (r.raw.rows.length <= 100000) {
    const rd = wb.addWorksheet("Raw Data", { views: [{ state: "frozen", ySplit: 1 }] });
    const rawCols = r.raw.rows.length ? Object.keys(r.raw.rows[0]) : [];
    addTable(rd, r.raw.rows, rawCols);
    autoWidth(rd, 8, 40);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ============================================================================ */
/* SQL script                                                                    */
/* ============================================================================ */
const sanitize = (c: string) => {
  let s = c.trim().replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!s) s = "col";
  if (/^\d/.test(s)) s = "c_" + s;
  return s;
};
const quoteId = (id: string, d: Dialect) => (d === "mysql" ? "`" + id + "`" : d === "mssql" ? `[${id}]` : `"${id}"`);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function columnDefs(rows: Row[], d: Dialect) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const used = new Set<string>();
  return cols.map((orig) => {
    let name = sanitize(orig);
    while (used.has(name.toLowerCase())) name += "_2";
    used.add(name.toLowerCase());
    const vals = rows.map((r) => r[orig]).filter((v) => v !== null && v !== undefined && v !== "");
    let type: string;
    let kind: "int" | "dec" | "date" | "text";
    if (vals.length && vals.every((v) => typeof v === "number")) {
      if (vals.every((v) => Number.isInteger(v))) {
        const maxAbs = Math.max(...vals.map((v) => Math.abs(v as number)));
        kind = "int";
        type = maxAbs > 2147483647 ? "BIGINT" : "INT";
      } else {
        kind = "dec";
        const scale = Math.min(4, Math.max(...vals.map((v) => (String(v).split(".")[1] || "").length)));
        type = `DECIMAL(18, ${Math.max(2, scale)})`;
      }
    } else if (vals.length && vals.every((v) => typeof v === "string" && DATE_RE.test(v))) {
      kind = "date";
      type = "DATE";
    } else {
      kind = "text";
      const len = Math.max(1, ...vals.map((v) => String(v).length));
      const n = len <= 20 ? 50 : len <= 90 ? 100 : len <= 240 ? 255 : 0;
      type = n ? (d === "mssql" ? `NVARCHAR(${n})` : `VARCHAR(${n})`) : d === "mssql" ? "NVARCHAR(MAX)" : "TEXT";
    }
    return { orig, name, type, kind };
  });
}

function literal(v: any, kind: string, d: Dialect) {
  if (v === null || v === undefined || v === "") return "NULL";
  if (kind === "int" || kind === "dec") return Number.isFinite(Number(v)) ? String(v) : "NULL";
  const s = String(v).replace(/'/g, "''");
  return d === "mssql" && kind === "text" ? `N'${s}'` : `'${s}'`;
}

/** Translate DataOps/AlaSQL queries (table `data`, backtick columns) into the chosen dialect */
export function translateSQL(sql: string, table: string, cols: { orig: string; name: string; kind: string }[], d: Dialect) {
  let s = sql.trim().replace(/;+\s*$/, "");
  // month grouping on a date column
  s = s.replace(/SUBSTRING\(\s*`([^`]+)`\s*,\s*1\s*,\s*7\s*\)/gi, (m, c) => {
    const col = cols.find((x) => x.orig === c);
    if (!col || col.kind !== "date") return m;
    const id = quoteId(col.name, d);
    return d === "mysql" ? `DATE_FORMAT(${id}, '%Y-%m')` : d === "mssql" ? `FORMAT(${id}, 'yyyy-MM')` : `TO_CHAR(${id}, 'YYYY-MM')`;
  });
  // identifiers
  s = s.replace(/`([^`]+)`/g, (_, c) => quoteId(cols.find((x) => x.orig === c)?.name ?? sanitize(c), d));
  cols.forEach((c) => {
    if (c.orig !== c.name && /^[A-Za-z_]\w*$/.test(c.orig)) s = s.replace(new RegExp(`\\b${c.orig}\\b`, "g"), quoteId(c.name, d));
  });
  // table name
  s = s.replace(/\bFROM\s+data\b/gi, `FROM ${quoteId(table, d)}`);
  // dialect differences
  if (d === "mssql") {
    const lim = s.match(/\bLIMIT\s+(\d+)\s*$/i);
    if (lim) {
      s = s.replace(/\s*\bLIMIT\s+\d+\s*$/i, "");
      s = s.replace(/^SELECT\s+(DISTINCT\s+)?/i, (m, dist) => `SELECT ${dist ? "DISTINCT " : ""}TOP ${lim[1]} `);
    }
    s = s.replace(/\bAVG\(\s*([^()]+?)\s*\)/gi, "AVG(CAST($1 AS FLOAT))");
  }
  if (d === "postgres") s = s.replace(/ROUND\(\s*(AVG\([^()]*\))\s*,\s*(\d+)\s*\)/gi, "ROUND(($1)::numeric, $2)");
  return s + ";";
}

export function buildSQLScript(r: ReportModel, d: Dialect) {
  const table = `${sanitize(r.baseName)}_cleaned`;
  const rows = r.cleaned.rows;
  const cols = columnDefs(rows, d);
  const T = quoteId(table, d);
  const L: string[] = [];
  const meta = DIALECTS.find((x) => x.id === d)!;
  L.push(
    "-- =============================================================================",
    `-- DataOps SQL project: ${r.datasetName}`,
    `-- Prepared by ${r.author} · ${r.date}`,
    `-- Dialect: ${meta.label} (open in ${meta.tool} and run the whole file)`,
    `-- Contents: 1) table for the CLEANED data  2) ${rows.length.toLocaleString("en-IN")} rows of data  3) ${r.sql.length} analysis queries`,
    "-- =============================================================================",
    ""
  );
  if (d === "mysql") L.push("-- Optional: CREATE DATABASE IF NOT EXISTS dataops; USE dataops;", "");
  if (d === "mssql") L.push("-- Optional: CREATE DATABASE dataops; GO  USE dataops; GO", "SET NOCOUNT ON;", "");
  L.push("-- 1. Table ---------------------------------------------------------------------");
  L.push(d === "mssql" ? `IF OBJECT_ID('${table}', 'U') IS NOT NULL DROP TABLE ${T};` : `DROP TABLE IF EXISTS ${T};`);
  L.push(`CREATE TABLE ${T} (`);
  cols.forEach((c, i) => L.push(`    ${quoteId(c.name, d)} ${c.type}${i < cols.length - 1 ? "," : ""}${c.orig !== c.name ? `  -- original column: "${c.orig}"` : ""}`));
  L.push(");", "");
  L.push("-- 2. Cleaned data ---------------------------------------------------------------");
  const colList = cols.map((c) => quoteId(c.name, d)).join(", ");
  const BATCH = 500; // SQL Server allows at most 1000 rows per VALUES list
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    L.push(`INSERT INTO ${T} (${colList}) VALUES`);
    L.push(chunk.map((row) => `(${cols.map((c) => literal(row[c.orig], c.kind, d)).join(", ")})`).join(",\n") + ";");
  }
  L.push("");
  L.push("-- 3. Analysis queries -----------------------------------------------------------");
  r.sql.forEach((sec, i) => {
    L.push("", `-- Q${i + 1}. ${mdStrip(sec.title).replace(/[“”]/g, '"')}`, `--     ${sec.purpose}`);
    if (sec.question) L.push(`--     Asked as: "${sec.question}"`);
    if (!sec.result.error) L.push(`--     Returns ${sec.result.total} row(s) on the cleaned data.`);
    L.push(translateSQL(sec.sql, table, cols, d));
  });
  L.push("");
  return L.join("\n");
}

/* ============================================================================ */
/* ZIP package                                                                   */
/* ============================================================================ */
export async function buildZip(r: ReportModel, d: Dialect) {
  const JSZip: any = (await import("jszip")).default;
  const zip = new JSZip();
  const base = `${r.baseName}`;
  zip.file(`${base}_cleaned.xlsx`, await buildWorkbook(r));
  zip.file(`${base}_analysis_${d}.sql`, buildSQLScript(r, d));
  zip.file(`${base}_cleaned.csv`, toCSV(r.cleaned.rows));
  zip.file(`${base}_report.md`, reportMarkdown(r));
  zip.file(
    "README.txt",
    [
      `DataOps project package — ${r.datasetName}`,
      `Prepared by ${r.author} · ${r.date}`,
      "",
      `${base}_cleaned.xlsx      Excel workbook: cleaned data, cleaning log, data quality, column profile, SQL results, raw data`,
      `${base}_analysis_${d}.sql  SQL script: creates the table, loads the cleaned data and runs every analysis query`,
      `${base}_cleaned.csv       Cleaned data as CSV (for Power BI / Tableau / Python)`,
      `${base}_report.md         The written report (open in any Markdown viewer)`,
      "",
      "Save the PDF version of the report from the Reports page (Save as PDF).",
    ].join("\r\n")
  );
  return zip.generateAsync({ type: "blob" });
}
