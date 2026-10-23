"use client";
import { useEffect, useState } from "react";

/** Renders a UTC instant in the viewer's own time zone (never the server's), with the zone shown. */
export function LocalTime({ iso, mode = "full" }: { iso: string; mode?: "full" | "date" | "time" | "day" | "mon" | "clock" }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const parts: Record<string, string> = {
      day: String(d.getDate()),
      mon: d.toLocaleDateString(undefined, { month: "short" }),
      clock: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
    setText(parts[mode] ?? (mode === "date" ? date : mode === "time" ? time : `${date}, ${time}`));
  }, [iso, mode]);
  return <time dateTime={iso} suppressHydrationWarning>{text ?? (mode === "day" || mode === "mon" || mode === "clock" ? "\u00a0" : iso.slice(0, 10))}</time>;
}
