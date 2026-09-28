/**
 * Column semantics + question understanding shared by every agent, the report
 * and the dashboard. This is what makes answers dataset-aware:
 *  • additive measures (revenue, quantity…) are SUMmed, intensive ones (price, rating…) are AVERAGEd
 *  • questions in English / Hinglish are parsed into metrics, dimensions and intent
 */
import type { DatasetProfile, ColumnProfile } from "./analytics";

export const words = (s: string) => s.toLowerCase().replace(/[_\-./]/g, " ").replace(/\s+/g, " ").trim();

const INTENSIVE = /(price|rate|rating|score|avg|average|mean|percent|pct|ratio|mileage|kmpl|mpg|efficiency|age|year|minutes|mins|hours|days|duration|time|speed|temperature|weight|height|size|cc|engine|capacity|seats|seating|discount|margin|salary|lat|lon)/i;
const ADDITIVE = /(revenue|sales|amount|total|gmv|profit|spend|cost|quantity|qty|units|orders|count|clicks|impressions|conversions|visits|customers|volume|income|expense|km_driven|kms|distance)/i;
const MONEY = /(price|revenue|sales|amount|gmv|profit|spend|cost|income|expense|salary|inr|rs|rupee|usd|value|fare|fee|₹|lakh)/i;

/** How a numeric column should be aggregated when grouped */
export function aggFor(col?: string): "sum" | "avg" {
  if (!col) return "sum";
  if (ADDITIVE.test(col) && !/price|rate|avg|per/i.test(col)) return "sum";
  if (INTENSIVE.test(col)) return "avg";
  return "sum";
}

export const isMoney = (col?: string) => !!col && MONEY.test(col);

export function aggLabel(col?: string) {
  return aggFor(col) === "avg" ? "Average" : "Total";
}

/** A column that behaves like a year (e.g. model year) — usable as a time axis when there is no date */
export function yearColumn(p: DatasetProfile): string | undefined {
  return p.cols.find((c) => /year|yr/i.test(c.name) && (c.type === "category" || c.type === "number") && c.unique > 2 && c.unique < 80 && (c.top?.every((t) => /^(19|20)\d\d$/.test(t.value)) ?? (c.min! >= 1900 && c.max! <= 2100)))?.name;
}

export function categoricalCols(p: DatasetProfile, max = 40): ColumnProfile[] {
  return p.cols.filter((c) => c.type === "category" && c.unique >= 2 && c.unique <= max && !/year|yr/i.test(c.name));
}

export function numericCols(p: DatasetProfile): ColumnProfile[] {
  return p.cols.filter((c) => c.type === "number" && !/(^id$|_id$|\bid\b)/i.test(c.name));
}

/* ----------------------------------------------------------------------------- */
/* Question parsing                                                               */
/* ----------------------------------------------------------------------------- */
const SYNONYMS: [RegExp, RegExp][] = [
  // question words → column-name patterns
  [/(expensive|costly|mehng|mahang|mehang|price|pricing|cost|daam|keemat|kimat|rate)/, /(price|cost|amount|value|fare|mrp)/],
  [/(cheap|sasta|sasti|budget|affordable)/, /(price|cost|amount|value|fare|mrp)/],
  [/(revenue|sales|kamai|income|turnover|gmv|business)/, /(revenue|sales|amount|gmv|income|price|value)/],
  [/(mileage|efficiency|kmpl|fuel economy)/, /(mileage|kmpl|mpg|efficiency|economy)/],
  [/(rating|review|stars|satisfaction)/, /(rating|score|stars|review)/],
  [/(delivery|delay|late|time)/, /(deliver|minutes|time|duration|days)/],
  [/(engine|cc|power)/, /(engine|cc|power|hp|bhp)/],
  [/(old|age|purana|new|naya|year|saal)/, /(year|age|yr)/],
  [/(km|driven|kilometer|kilometre|odometer)/, /(km|driven|kilomet|odometer)/],
  [/(profit|margin|munafa)/, /(profit|margin)/],
  [/(quantity|units|qty)/, /(quantity|qty|units)/],
];

export interface ParsedQuestion {
  raw: string;
  metrics: string[]; // numeric columns referenced
  dims: string[]; // categorical columns referenced
  topN?: number;
  direction: "desc" | "asc";
  agg?: "sum" | "avg" | "count" | "max" | "min";
  wantsTrend: boolean;
  wantsRelation: boolean;
  explicitRelation: boolean;
  wantsDistribution: boolean;
  wantsShare: boolean;
  wantsCount: boolean;
  wantsRows: boolean; // "which cars" → list rows, not groups
  filters: { col: string; value: string }[];
  askedFor: string[]; // concepts asked for that have no matching column (e.g. "revenue")
}

function colMentioned(qs: string, col: string) {
  const cw = words(col);
  if (qs.includes(cw)) return true;
  const parts = cw.split(" ").filter((p) => p.length > 2 && !["the", "and", "per", "inr", "usd"].includes(p));
  return parts.some((p) => new RegExp(`\\b${p.endsWith("y") ? p.slice(0, -1) + "(?:y|ies)" : p + "(?:s|es)?"}\\b`).test(qs));
}

export function parseQuestion(question: string, p: DatasetProfile, rows: Record<string, any>[]): ParsedQuestion {
  const qs = words(question);
  const nums = numericCols(p).map((c) => c.name);
  const cats = p.cols.filter((c) => c.type === "category" || c.type === "text").map((c) => c.name);
  const metrics: string[] = [];
  const dims: string[] = [];
  const askedFor: string[] = [];

  // explicit column names first, in the order they appear in the question
  const byPos = (arr: string[]) => arr.map((c) => ({ c, i: qs.indexOf(words(c).split(" ")[0]) })).sort((a, b) => (a.i < 0 ? 999 : a.i) - (b.i < 0 ? 999 : b.i)).map((x) => x.c);
  byPos(nums).forEach((c) => colMentioned(qs, c) && metrics.push(c));
  byPos(cats).forEach((c) => colMentioned(qs, c) && dims.push(c));

  // then synonyms ("mehengi" → price, "kamai" → revenue …)
  SYNONYMS.forEach(([qre, cre]) => {
    if (!qre.test(qs)) return;
    // match whole words of the column name ("age" must not match "mileage")
    const colRe = new RegExp("\\b(?:" + cre.source.replace(/^\(|\)$/g, "") + ")");
    const hit = nums.find((c) => colRe.test(words(c)));
    if (hit && !metrics.includes(hit) && !dims.includes(hit)) metrics.push(hit);
    if (!hit) {
      const concept = qs.match(qre)?.[0];
      if (concept) askedFor.push(concept);
    }
  });

  // "by X" / "per X" / "har X" → dimension
  const by = qs.match(/\b(?:by|per|for each|across|wise|har|each|according to)\s+([a-z0-9 ]+)/);
  if (by) {
    const d = cats.find((c) => colMentioned(by[1], c)) || (yearColumn(p) && /year|saal/.test(by[1]) ? yearColumn(p) : undefined);
    if (d && !dims.includes(d)) dims.unshift(d);
  }

  const hiMost = /(sabse (zyada|jyada|jada|adhik|mehng|mahang|best|upar)|most|highest|maximum|max\b|top|best|largest|biggest|expensive|costliest|mehngi|mehnga)/.test(qs);
  const hiLeast = /(sabse (kam|sasta|sasti|neeche)|least|lowest|minimum|min\b|bottom|worst|cheapest|cheap|sasta|sasti|smallest)/.test(qs);
  const nMatch = qs.match(/\b(?:top|bottom|best|worst|first|pehle|highest|lowest)\s*(\d+)|(\d+)\s*(?:most|top|best|cars|products|items|rows|records|sabse|mehngi|sasti|expensive|cheapest|brands|cities)/) || qs.match(/\b(paanch|panch|five|das|ten|teen|three)\b/);
  const wordNum: Record<string, number> = { paanch: 5, panch: 5, five: 5, das: 10, ten: 10, teen: 3, three: 3 };
  let topN = nMatch ? Number(nMatch[1] || nMatch[2]) || wordNum[nMatch[1] || nMatch[0]] : undefined;
  if (!topN && (hiMost || hiLeast)) topN = /(which|konsa|konsi|konse|kaunsa|kaunsi|kaunse|kaun|kon sa|kon si)/.test(qs) && !/\b(brands|cities|categories|models)\b/.test(qs) ? 1 : 5;

  let agg: ParsedQuestion["agg"];
  if (/(average|avg|mean|ausat|typical)/.test(qs)) agg = "avg";
  else if (/(total|sum|overall|kul|poora)/.test(qs)) agg = "sum";
  else if (/(how many|count|number of|kitne|kitni|popular|frequency|most common|zyada bik|listings)/.test(qs)) agg = "count";

  const wantsTrend = /(trend|over time|monthly|month|daily|weekly|growth|year wise|yearwise|yearly|by year|per year|over the years|saal|timeline)/.test(qs);
  const explicitRelation = /(relation|relationship|correlat|vs\b|versus|impact|affect|depend|rishta|sambandh|link between|compare .* with)/.test(qs);
  const wantsRelation = explicitRelation || (metrics.length >= 2 && !wantsTrend && !dims.length);
  const wantsDistribution = /(distribution|spread|range|histogram|bucket|spread of|kaise faila)/.test(qs);
  const wantsShare = /(share|percentage|percent|proportion|split|mix|contribution|hissa|pie)/.test(qs);
  const wantsCount = agg === "count";
  const wantsRows = !dims.length && !!topN && /(which|konsa|konsi|kaunsa|kaunsi|cars|products|items|rows|records|orders|listings|kon)/.test(qs) && !wantsCount;

  // filters: a category value named in the question ("in Mumbai", "petrol cars")
  const filters: { col: string; value: string }[] = [];
  const colWords = new Set(p.cols.flatMap((x) => words(x.name).split(" ")));
  p.cols
    .filter((c) => c.type === "category" && c.unique <= 200)
    .forEach((c) => {
      if (dims[0] === c.name) return;
      const vals = new Set(rows.map((r) => r[c.name]).filter((v) => typeof v === "string" || typeof v === "number"));
      for (const v of vals) {
        const s = String(v);
        if (s.length < 3 || colWords.has(s.toLowerCase())) continue;
        if (new RegExp(`\\b${s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(qs)) {
          filters.push({ col: c.name, value: s });
          break;
        }
      }
    });

  return { raw: question, metrics, dims, topN, direction: hiLeast && !hiMost ? "asc" : "desc", agg, wantsTrend, wantsRelation, explicitRelation, wantsDistribution, wantsShare, wantsCount, wantsRows, filters, askedFor: [...new Set(askedFor)] };
}
