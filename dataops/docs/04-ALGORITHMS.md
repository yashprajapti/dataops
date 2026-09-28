# 04 · Algorithms

All code lives in `lib/analytics.ts` and `lib/local-engine.ts`.

## 1. Type detection & coercion
- CSV values arrive as strings. A column becomes **numeric** if > 95% of non-empty values parse as numbers (commas stripped).
- `""`, `NA`, `N/A`, `null`, `nan` → `null`.
- Type rules: all numbers → `number` (or `id` if name ends in `_id` and all unique); `YYYY-MM-DD…` strings → `date`; ≤ max(30, 5% of rows) distinct values → `category`; otherwise `text`.

## 2. Column profiling
For numbers: count, missing, unique, mean, median, std, min, max, sum, 12-bin histogram (clipped at P99 for readability).
For categories: top 8 values and **inconsistent labels** — values that collide after `trim().toLowerCase()`; every variant except the most frequent counts as messy.

## 3. Outliers
A value is an outlier if it is beyond the **3×IQR fence** *and* above **1.5 × P99**:
```
upper = max(Q3 + 3·IQR, 1.5·P99)      lower = Q1 − 3·IQR
```
Using both keeps naturally right-skewed metrics (revenue, price) from being over-flagged.

## 4. Quality score (0–100)
```
score = 100 − Σ issue_weight − (empty_cells / total_cells) × 100
issue_weight: high = 10, medium = 5, low = 2
```
Missing-value severity: > 10% high, > 2% medium, else low. Duplicates: > 2% of rows high, else medium.
Quick-Commerce sample: **79** raw → **100** after auto-clean.

## 5. Auto-clean (non-destructive — creates a copy)
1. Drop exact duplicate rows.
2. Standardise label variants to the most common spelling.
3. Fill missing numbers with the **median**, categories with the **mode**.
4. Cap values above the outlier fence at **P99** (winsorising).
Every step is logged and shown to the user.

## 6. Anomaly detection — robust rolling z-score
For each day *t* with a baseline window *W* (default 14):
```
x   = log(1 + value)                  # multiplicative behaviour: −50% matters at any scale
med = median(x[t−W … t−1])
MAD = median(|x − med|)
z   = (x_t − med) / (1.4826 · MAD)
flag if |z| ≥ threshold (default 3) · critical if |z| ≥ 5
expected = exp(med) − 1
```
**Why not mean ± std?** The mean and std are pulled by the very spikes we want to catch; median/MAD are robust. The log transform stops high-volume days from dominating.
**Root cause:** for each flagged day, rows are grouped by the primary dimension (e.g. city) and the top contributor is reported.

## 7. Text-to-SQL (offline engine)
Heuristic parser used when no LLM key is set (and as a fallback):
| Signal | Detection |
|---|---|
| Aggregation | "average/avg/mean/ausat" → AVG · "max/min" · "how many/count/kitne" → COUNT(*) · default SUM |
| Metric | numeric column whose name (or its words) appears in the question, else the primary metric |
| Dimension | column after "by / per / across", or any categorical column mentioned (plural-aware: city ↔ cities) |
| Top-N | "top/bottom/best/worst N" · Hinglish "sabse zyada / sabse kam" → LIMIT 1 |
| Time | "monthly / trend" → `SUBSTRING(date,1,7)`, "daily" → date |
| Filters | a category **value** mentioned in the question (e.g. "Mumbai") → `WHERE col = 'Mumbai'` |

Example: *"total revenue by payment method in Mumbai"* →
```sql
SELECT `payment_method`, SUM(`revenue`) AS sum_revenue
FROM data
WHERE `city` = 'Mumbai'
GROUP BY `payment_method`
ORDER BY sum_revenue DESC
```

## 8. Primary metric / dimension detection
- Metric priority by name: revenue › sales › gmv › amount › profit › total › value › price › spend.
- Dimension priority: city › category › region › channel › brand › segment › state › country › product.
- Group-by merges case/spacing variants so summaries are correct even before cleaning.

## 9. Correlation
Pearson r over paired non-null numeric values. The Advisor surfaces |r| > 0.15 for rating ↔ delivery-time style pairs and |r| > 0.3 for metric drivers.
