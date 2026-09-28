import type { Row } from "./sample-data";

/** Runs SQL against the active dataset entirely in the browser (AlaSQL). The table is always called `data`. */
export async function runSQL(sql: string, rows: Row[]): Promise<{ columns: string[]; rows: Row[]; error?: string; ms: number }> {
  const t0 = performance.now();
  try {
    const alasql: any = (await import("alasql")).default;
    let q = sql.trim().replace(/;+\s*$/, "");
    if (!/^\s*(select|with)\b/i.test(q)) throw new Error("Only SELECT queries are allowed in SQL Studio.");
    let replaced = false;
    q = q.replace(/\bFROM\s+[`"\[]?([A-Za-z_][\w]*)[`"\]]?/i, () => {
      replaced = true;
      return "FROM ?";
    });
    if (!replaced) throw new Error("Query must select FROM data.");
    const out: Row[] = alasql(q, [rows]);
    const result = Array.isArray(out) ? out.slice(0, 1000) : [];
    return { columns: result.length ? Object.keys(result[0]) : [], rows: result, ms: Math.round((performance.now() - t0) * 10) / 10 };
  } catch (e: any) {
    return { columns: [], rows: [], error: String(e?.message || e), ms: Math.round(performance.now() - t0) };
  }
}

export function extractSQL(text: string): string | undefined {
  const m = text.match(/```sql\s*([\s\S]*?)```/i) || text.match(/```\s*(SELECT[\s\S]*?)```/i);
  return m?.[1]?.trim();
}
