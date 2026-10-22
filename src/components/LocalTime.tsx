"use client";
import { useEffect, useState } from "react";

/** Renders a UTC instant in the viewer's own time zone (never the server's), with the zone shown. */
export function LocalTime({ iso, mode = "full" }: { iso: string; mode?: "full" | "date" | "time" }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    setText(mode === "date" ? date : mode === "time" ? time : `${date}, ${time}`);
  }, [iso, mode]);
  return <time dateTime={iso} suppressHydrationWarning>{text ?? iso.slice(0, 10)}</time>;
}
