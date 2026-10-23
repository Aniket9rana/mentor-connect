/** RFC-4180 CSV. Cells that start with = + - @ (or tab/CR) get a leading ' so a spreadsheet never runs student-typed text as a formula. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  return [cols.map(csvCell).join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
}
