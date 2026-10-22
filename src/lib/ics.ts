const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function icsFor(o: { id: string; start: string; minutes: number; title: string; description: string; url?: string | null }) {
  const s = new Date(o.start);
  const e = new Date(s.getTime() + o.minutes * 60_000);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mentor Connect//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${o.id}@mentor-connect`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(s)}`, `DTEND:${fmt(e)}`,
    `SUMMARY:${esc(o.title)}`, `DESCRIPTION:${esc(o.description)}`, ...(o.url ? [`URL:${o.url}`, `LOCATION:${esc(o.url)}`] : []),
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Mentor call in 30 minutes", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(o: { start: string; minutes: number; title: string; description: string; url?: string | null }) {
  const s = new Date(o.start);
  const e = new Date(s.getTime() + o.minutes * 60_000);
  const p = new URLSearchParams({ action: "TEMPLATE", text: o.title, dates: `${fmt(s)}/${fmt(e)}`, details: o.description });
  if (o.url) p.set("location", o.url);
  return `https://calendar.google.com/calendar/render?${p}`;
}
