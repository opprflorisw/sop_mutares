// Minimal CSV utilities — enough for our enforced templates
// (no embedded commas/newlines in fields). Keeps the bundle lean.

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

export function rowCount(text: string): number {
  return parseCsv(text).rows.length;
}

/** Distinct YYYY-MM periods present in a time-series file's date column. */
export function periodsIn(text: string, dateField: string): string[] {
  const { rows } = parseCsv(text);
  const set = new Set<string>();
  for (const r of rows) {
    const d = r[dateField];
    if (d && /^\d{4}-\d{2}/.test(d)) set.add(d.slice(0, 7));
  }
  return [...set].sort();
}

function monthIndex(p: string): number {
  const [y, m] = p.split("-").map(Number);
  return y * 12 + (m - 1);
}
function fromMonthIndex(i: number): string {
  const y = Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Cadence-aware gap detection. Infers the reporting cadence (monthly,
 * quarterly, …) from the modal gap between periods, then flags only
 * periods that are actually missing relative to that cadence. So a
 * consistent quarterly series is clean, while a monthly series with a
 * dropped month surfaces a "pocket".
 */
export function coverageGaps(
  text: string,
  dateField: string
): { start: string; end: string; missing: string[] } | null {
  const periods = periodsIn(text, dateField);
  if (periods.length === 0) return null;
  const start = periods[0];
  const end = periods[periods.length - 1];
  if (periods.length < 2) return { start, end, missing: [] };

  const idx = periods.map(monthIndex);
  const diffs: number[] = [];
  for (let i = 1; i < idx.length; i++) diffs.push(idx[i] - idx[i - 1]);

  // expected cadence = most common step between consecutive periods
  const counts = new Map<number, number>();
  let step = diffs[0];
  for (const d of diffs) {
    const c = (counts.get(d) ?? 0) + 1;
    counts.set(d, c);
    if (c > (counts.get(step) ?? 0)) step = d;
  }
  if (step <= 0) step = 1;

  const missing: string[] = [];
  for (let i = 1; i < idx.length; i++) {
    const gap = idx[i] - idx[i - 1];
    if (gap > step) {
      for (let k = step; k < gap; k += step) missing.push(fromMonthIndex(idx[i - 1] + k));
    }
  }
  return { start, end, missing };
}

export function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
