/** Server-side time text for emails only. On screen, student-visible times always go through <LocalTime>. */
export function formatWhen(iso: string, where: { tz?: string | null; offsetMin?: number }): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true };
  if (where.tz) {
    try {
      return `${new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: where.tz, timeZoneName: "short" }).format(d)}`;
    } catch {
      /* unknown tz string: fall through to UTC */
    }
  }
  if (where.offsetMin !== undefined) {
    const local = new Date(d.getTime() + where.offsetMin * 60_000);
    const sign = where.offsetMin < 0 ? "-" : "+";
    const abs = Math.abs(where.offsetMin);
    return `${new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(local)} (UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")})`;
  }
  return `${new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(d)} UTC`;
}
