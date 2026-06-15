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

/** All YYYY-MM between two periods inclusive. */
export function monthRange(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** Gaps (missing months) within the covered span of a time-series file. */
export function coverageGaps(
  text: string,
  dateField: string
): { start: string; end: string; missing: string[] } | null {
  const periods = periodsIn(text, dateField);
  if (periods.length === 0) return null;
  const start = periods[0];
  const end = periods[periods.length - 1];
  const expected = monthRange(start, end);
  const have = new Set(periods);
  const missing = expected.filter((p) => !have.has(p));
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
