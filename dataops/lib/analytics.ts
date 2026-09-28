import type { Row } from "./sample-data";

export type ColType = "number" | "date" | "category" | "text" | "boolean" | "id";

export interface ColumnProfile {
  name: string;
  type: ColType;
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
  // numeric
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  sum?: number;
  outliers?: number;
  histogram?: { bin: string; count: number }[];
  // categorical
  top?: { value: string; count: number }[];
  inconsistentCase?: number;
  // date
  minDate?: string;
  maxDate?: string;
}

export interface DatasetProfile {
  rows: number;
  columns: number;
  duplicates: number;
  missingCells: number;
  missingPct: number;
  qualityScore: number;
  cols: ColumnProfile[];
  numeric: string[];
  categorical: string[];
  dates: string[];
  primaryMetric?: string;
  primaryDate?: string;
  primaryDim?: string;
  issues: Issue[];
}

export interface Issue {
  severity: "high" | "medium" | "low";
  column?: string;
  title: string;
  detail: string;
  fix: string;
}

const isMissing = (v: any) => v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

/** Coerce CSV strings into numbers where appropriate */
export function coerceRows(rows: Row[]): Row[] {
  if (!rows.length) return rows;
  const keys = Object.keys(rows[0]);
  const numericKeys = keys.filter((k) => {
    let n = 0,
      t = 0;
    for (let i = 0; i < Math.min(rows.length, 400); i++) {
      const v = rows[i][k];
      if (isMissing(v)) continue;
      t++;
      if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v.replace(/,/g, ""))))) n++;
    }
    return t > 0 && n / t > 0.95;
  });
  return rows.map((row) => {
    const out: Row = {};
    for (const k of keys) {
      let v = row[k];
      if (typeof v === "string") v = v.trim();
      if (v === "" || v === "NA" || v === "N/A" || v === "null" || v === "NULL" || v === "nan") v = null;
      if (numericKeys.includes(k) && v !== null && typeof v === "string") v = Number(v.replace(/,/g, ""));
      out[k] = v;
    }
    return out;
  });
}

function detectType(name: string, values: any[]): ColType {
  const present = values.filter((v) => !isMissing(v));
  if (!present.length) return "text";
  const lname = name.toLowerCase();
  if (present.every((v) => typeof v === "number")) {
    const uniq = new Set(present).size;
    if ((lname.endsWith("_id") || lname === "id") && uniq === present.length) return "id";
    if (lname === "year") return "category";
    return "number";
  }
  if (present.every((v) => typeof v === "boolean")) return "boolean";
  if (present.slice(0, 200).every((v) => typeof v === "string" && DATE_RE.test(v))) return "date";
  const uniq = new Set(present.map(String)).size;
  if (lname.endsWith("id") && uniq > present.length * 0.9) return "id";
  if (uniq <= Math.max(30, present.length * 0.05)) return "category";
  return "text";
}

export function profileDataset(rows: Row[]): DatasetProfile {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const cols: ColumnProfile[] = keys.map((k) => {
    const values = rows.map((r) => r[k]);
    const type = detectType(k, values);
    const present = values.filter((v) => !isMissing(v));
    const missing = values.length - present.length;
    const cp: ColumnProfile = {
      name: k,
      type,
      count: values.length,
      missing,
      missingPct: values.length ? missing / values.length : 0,
      unique: new Set(present.map(String)).size,
    };
    if (type === "number") {
      const nums = (present as number[]).slice().sort((a, b) => a - b);
      const sum = nums.reduce((s, v) => s + v, 0);
      const mean = sum / nums.length;
      const std = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, nums.length - 1));
      const q1 = quantile(nums, 0.25),
        q3 = quantile(nums, 0.75),
        iqr = q3 - q1;
      const lo = q1 - 3 * iqr,
        hi = q3 + 3 * iqr;
      cp.mean = mean;
      cp.median = quantile(nums, 0.5);
      cp.std = std;
      cp.min = nums[0];
      cp.max = nums[nums.length - 1];
      cp.sum = sum;
      // histogram (clip at p99 for readability)
      const p99 = quantile(nums, 0.99);
      // Outliers: beyond the 3×IQR fences AND well past the 99th percentile — robust to naturally skewed metrics
      const upper = Math.max(hi, p99 * 1.5);
      cp.outliers = iqr > 0 ? nums.filter((v) => v < lo || v > upper).length : 0;
      const bins = 12;
      const min = nums[0];
      const width = (p99 - min) / bins || 1;
      const h = Array.from({ length: bins }, (_, i) => ({ bin: fmtShort(min + i * width), count: 0 }));
      nums.forEach((v) => {
        const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width)));
        h[idx].count++;
      });
      cp.histogram = h;
    } else if (type === "date") {
      const s = (present as string[]).slice().sort();
      cp.minDate = s[0];
      cp.maxDate = s[s.length - 1];
    } else {
      const counts = new Map<string, number>();
      present.forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
      cp.top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({ value, count }));
      if (type === "category") {
        const lower = new Map<string, Set<string>>();
        counts.forEach((_, v) => {
          const key = v.toLowerCase().trim();
          if (!lower.has(key)) lower.set(key, new Set());
          lower.get(key)!.add(v);
        });
        let inc = 0;
        lower.forEach((set) => {
          if (set.size > 1) {
            const variants = [...set];
            variants.sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
            variants.slice(1).forEach((v) => (inc += counts.get(v) || 0));
          }
        });
        cp.inconsistentCase = inc;
      }
    }
    return cp;
  });

  // duplicates
  const seen = new Set<string>();
  let duplicates = 0;
  rows.forEach((r) => {
    const key = JSON.stringify(r);
    if (seen.has(key)) duplicates++;
    else seen.add(key);
  });

  const missingCells = cols.reduce((s, c) => s + c.missing, 0);
  const totalCells = Math.max(1, rows.length * cols.length);
  const numeric = cols.filter((c) => c.type === "number").map((c) => c.name);
  const categorical = cols.filter((c) => c.type === "category").map((c) => c.name);
  const dates = cols.filter((c) => c.type === "date").map((c) => c.name);

  const metricPriority = ["revenue", "sales", "gmv", "amount", "profit", "total", "value", "price", "spend"];
  let primaryMetric: string | undefined;
  for (const key of metricPriority) {
    primaryMetric = numeric.find((n) => n.toLowerCase().includes(key));
    if (primaryMetric) break;
  }
  primaryMetric = primaryMetric || numeric[numeric.length - 1];
  const dimPriority = ["city", "category", "region", "channel", "brand", "segment", "state", "country", "product"];
  const primaryDim =
    categorical.find((n) => dimPriority.some((p) => n.toLowerCase().includes(p))) ||
    cols
      .filter((c) => c.type === "category" && c.unique > 1 && c.unique <= 15)
      .map((c) => c.name)[0];

  const issues: Issue[] = [];
  cols.forEach((c) => {
    if (c.missing > 0) {
      const sev = c.missingPct > 0.1 ? "high" : c.missingPct > 0.02 ? "medium" : "low";
      issues.push({
        severity: sev,
        column: c.name,
        title: `${c.missing} missing values in “${c.name}”`,
        detail: `${(c.missingPct * 100).toFixed(1)}% of rows are empty.`,
        fix:
          c.type === "number"
            ? `Impute with the median (${fmtShort(c.median ?? 0)}) or drop rows if the metric is critical.`
            : `Fill with “Unknown” or the most frequent value (${c.top?.[0]?.value ?? "mode"}).`,
      });
    }
    if (c.outliers) {
      issues.push({
        severity: c.outliers / c.count > 0.01 ? "medium" : "low",
        column: c.name,
        title: `${c.outliers} extreme outliers in “${c.name}”`,
        detail: `Values far beyond the normal range (max ${fmtShort(c.max ?? 0)} vs median ${fmtShort(c.median ?? 0)}).`,
        fix: "Verify at source; cap at the 99th percentile (winsorize) or analyse separately.",
      });
    }
    if (c.inconsistentCase) {
      issues.push({
        severity: "medium",
        column: c.name,
        title: `${c.inconsistentCase} inconsistent labels in “${c.name}”`,
        detail: "Same category written differently (e.g. casing / extra spaces).",
        fix: "Standardise with TRIM + PROPER (Excel) or str.strip().str.title() (pandas).",
      });
    }
  });
  if (duplicates) {
    issues.push({
      severity: duplicates / rows.length > 0.02 ? "high" : "medium",
      title: `${duplicates} fully duplicated rows`,
      detail: "Exact copies inflate totals and counts.",
      fix: "Remove Duplicates (Excel) · SELECT DISTINCT (SQL) · df.drop_duplicates() (pandas).",
    });
  }
  issues.sort((a, b) => ["high", "medium", "low"].indexOf(a.severity) - ["high", "medium", "low"].indexOf(b.severity));

  // Score = 100 − weighted issue deductions − share of empty cells.
  // Every issue costs points (high 10 · medium 5 · low 2) so a dataset only scores 100 when it is truly clean.
  const WEIGHT = { high: 10, medium: 5, low: 2 } as const;
  const issuePenalty = issues.reduce((s, i) => s + WEIGHT[i.severity], 0);
  const cellPenalty = (missingCells / totalCells) * 100;
  const qualityScore = Math.max(0, Math.min(100, Math.round(100 - issuePenalty - cellPenalty)));

  return {
    rows: rows.length,
    columns: cols.length,
    duplicates,
    missingCells,
    missingPct: missingCells / totalCells,
    qualityScore,
    cols,
    numeric,
    categorical,
    dates,
    primaryMetric,
    primaryDate: dates[0],
    primaryDim,
    issues,
  };
}

export function fmtShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return (n / 1e7).toFixed(1) + "Cr";
  if (a >= 1e5) return (n / 1e5).toFixed(1) + "L";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
  if (a >= 10 || Number.isInteger(n)) return n.toFixed(0);
  return n.toFixed(2);
}

/** Auto-clean: drop duplicates, standardise labels, fill missing, cap outliers */
export function autoClean(rows: Row[], profile: DatasetProfile) {
  const log: string[] = [];
  const seen = new Set<string>();
  let out = rows.filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (rows.length !== out.length) log.push(`Removed ${rows.length - out.length} duplicate rows`);

  profile.cols.forEach((c) => {
    if (c.type === "category" && c.inconsistentCase) {
      const canonical = new Map<string, string>();
      (c.top || []).forEach((t) => {
        const key = t.value.toLowerCase().trim();
        if (!canonical.has(key)) canonical.set(key, t.value);
      });
      let changed = 0;
      out = out.map((r) => {
        const v = r[c.name];
        if (typeof v === "string") {
          const canon = canonical.get(v.toLowerCase().trim());
          if (canon && canon !== v) {
            changed++;
            return { ...r, [c.name]: canon };
          }
        }
        return r;
      });
      if (changed) log.push(`Standardised ${changed} labels in “${c.name}”`);
    }
    if (c.missing) {
      const fill = c.type === "number" ? Math.round((c.median ?? 0) * 100) / 100 : c.type === "category" ? c.top?.[0]?.value ?? "Unknown" : "Unknown";
      let filled = 0;
      out = out.map((r) => {
        if (isMissing(r[c.name])) {
          filled++;
          return { ...r, [c.name]: fill };
        }
        return r;
      });
      if (filled) log.push(`Filled ${filled} missing “${c.name}” with ${c.type === "number" ? "median" : "mode"} (${fill})`);
    }
    if (c.type === "number" && c.outliers && c.outliers > 0) {
      const nums = out.map((r) => r[c.name]).filter((v) => typeof v === "number").sort((a, b) => a - b);
      const p99 = quantile(nums, 0.99);
      const q1 = quantile(nums, 0.25), q3 = quantile(nums, 0.75);
      const upper = Math.max(q3 + 3 * (q3 - q1), p99 * 1.5);
      let capped = 0;
      out = out.map((r) => {
        if (typeof r[c.name] === "number" && r[c.name] > upper) {
          capped++;
          return { ...r, [c.name]: Math.round(p99 * 100) / 100 };
        }
        return r;
      });
      if (capped) log.push(`Capped ${capped} extreme values in “${c.name}” at P99 (${fmtShort(p99)})`);
    }
  });
  return { rows: out, log };
}

/** Group-by aggregation. Labels that differ only by case/spacing ("Pune", "PUNE ") are merged
 *  under their most common spelling, so summaries stay correct even before cleaning. */
export function groupBy(rows: Row[], dim: string, metric?: string, agg: "sum" | "avg" | "count" = "sum") {
  const spellings = new Map<string, Map<string, number>>();
  rows.forEach((r) => {
    const v = r[dim];
    if (v === null || v === undefined) return;
    const raw = String(v);
    const key = raw.trim().toLowerCase();
    if (!spellings.has(key)) spellings.set(key, new Map());
    const sp = spellings.get(key)!;
    sp.set(raw, (sp.get(raw) || 0) + 1);
  });
  const canon = new Map<string, string>();
  spellings.forEach((sp, key) => canon.set(key, [...sp.entries()].sort((a, b) => b[1] - a[1])[0][0].trim()));
  const m = new Map<string, { sum: number; n: number }>();
  rows.forEach((r) => {
    const k = r[dim] === null || r[dim] === undefined ? "Unknown" : canon.get(String(r[dim]).trim().toLowerCase())!;
    const v = metric ? Number(r[metric]) : 1;
    if (metric && Number.isNaN(v)) return;
    const cur = m.get(k) || { sum: 0, n: 0 };
    cur.sum += metric ? v : 1;
    cur.n += 1;
    m.set(k, cur);
  });
  return [...m.entries()]
    .map(([name, { sum, n }]) => ({ name, value: agg === "avg" ? sum / n : agg === "count" ? n : sum }))
    .sort((a, b) => b.value - a.value);
}

/** Time series by day / week / month */
export function timeSeries(rows: Row[], dateCol: string, metric?: string, grain: "day" | "week" | "month" = "day") {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const d = r[dateCol];
    if (!d || typeof d !== "string") return;
    let key = d.slice(0, 10);
    if (grain === "month") key = d.slice(0, 7);
    if (grain === "week") {
      const dt = new Date(d.slice(0, 10) + "T00:00:00Z");
      const day = dt.getUTCDay() || 7;
      dt.setUTCDate(dt.getUTCDate() - day + 1);
      key = dt.toISOString().slice(0, 10);
    }
    const v = metric ? Number(r[metric]) || 0 : 1;
    m.set(key, (m.get(key) || 0) + v);
  });
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, value]) => ({ date, value }));
}

export interface Anomaly {
  date: string;
  value: number;
  expected: number;
  z: number;
  direction: "spike" | "drop";
  severity: "critical" | "warning";
}

/** Rolling robust z-score (median / MAD, log-space) anomaly detection on a daily series */
export function detectAnomalies(series: { date: string; value: number }[], window = 14, threshold = 3): Anomaly[] {
  const out: Anomaly[] = [];
  // Business metrics are multiplicative (a 50% drop matters at any scale), so work in log space when possible
  const useLog = series.every((p) => p.value >= 0);
  const tf = (v: number) => (useLog ? Math.log1p(v) : v);
  const inv = (v: number) => (useLog ? Math.expm1(v) : v);
  for (let i = window; i < series.length; i++) {
    // Robust z-score: median + MAD are not dragged around by the outliers we're trying to find
    const win = series.slice(i - window, i).map((p) => tf(p.value)).sort((a, b) => a - b);
    const med = quantile(win, 0.5);
    const mad = quantile(win.map((v) => Math.abs(v - med)).sort((a, b) => a - b), 0.5);
    const std = mad * 1.4826 || 1e-9;
    const z = (tf(series[i].value) - med) / std;
    if (Math.abs(z) >= threshold) {
      out.push({
        date: series[i].date,
        value: series[i].value,
        expected: inv(med),
        z,
        direction: z > 0 ? "spike" : "drop",
        severity: Math.abs(z) >= 5 ? "critical" : "warning",
      });
    }
  }
  return out;
}

export function correlation(rows: Row[], a: string, b: string) {
  const pairs = rows.map((r) => [Number(r[a]), Number(r[b])]).filter(([x, y]) => !Number.isNaN(x) && !Number.isNaN(y) && r_ok(x) && r_ok(y));
  const n = pairs.length;
  if (n < 3) return 0;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0,
    dx = 0,
    dy = 0;
  pairs.forEach(([x, y]) => {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  });
  return num / Math.sqrt(dx * dy || 1);
}
const r_ok = (v: any) => v !== null && Number.isFinite(v);

export function correlationMatrix(rows: Row[], cols: string[]) {
  return cols.map((a) => ({ col: a, values: cols.map((b) => (a === b ? 1 : correlation(rows, a, b))) }));
}

export interface ChartSuggestion {
  type: "line" | "bar" | "donut" | "histogram" | "scatter";
  title: string;
  x: string;
  y?: string;
  why: string;
}

export function suggestCharts(p: DatasetProfile): ChartSuggestion[] {
  const s: ChartSuggestion[] = [];
  if (p.primaryDate && p.primaryMetric)
    s.push({ type: "line", title: `${label(p.primaryMetric)} over time`, x: p.primaryDate, y: p.primaryMetric, why: "A date column + a metric → a trend line reveals growth, seasonality and anomalies." });
  const cats = p.cols.filter((c) => c.type === "category" && c.unique > 1 && c.unique <= 20);
  if (cats[0] && p.primaryMetric)
    s.push({ type: "bar", title: `${label(p.primaryMetric)} by ${label(cats[0].name)}`, x: cats[0].name, y: p.primaryMetric, why: "Ranked bars make comparisons between categories instant." });
  const small = cats.find((c) => c.unique <= 6 && c.name !== cats[0]?.name);
  if (small)
    s.push({ type: "donut", title: `Share by ${label(small.name)}`, x: small.name, y: p.primaryMetric, why: `Only ${small.unique} groups — a part-to-whole donut stays readable.` });
  if (p.primaryMetric)
    s.push({ type: "histogram", title: `Distribution of ${label(p.primaryMetric)}`, x: p.primaryMetric, why: "Shows skew, typical values and outliers at a glance." });
  if (p.numeric.length >= 2) {
    const other = p.numeric.find((n) => n !== p.primaryMetric)!;
    s.push({ type: "scatter", title: `${label(other)} vs ${label(p.primaryMetric!)}`, x: other, y: p.primaryMetric, why: "Two numeric measures → scatter reveals relationships and clusters." });
  }
  return s;
}

export function label(col: string) {
  return col.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function toCSV(rows: Row[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
