/** Categorical chart palette — validated for the dark surface (#0A0D18):
 *  OKLCH lightness band, chroma floor, CVD separation and contrast all pass.
 *  Always assign in this fixed order; never cycle past 6 — fold extras into “Other”. */
export const SERIES = ["#1B9FC0", "#74A313", "#8B7CFF", "#E0487A", "#C47E17", "#1F8F6A"];
export const PRIMARY = "#3DE0FF"; // single-series marks
export const GRID = "rgba(255,255,255,0.06)";
export const AXIS = "#6B7488";
export const STATUS = { good: "#3ECF8E", warning: "#FFB547", critical: "#FF5C5C" };
