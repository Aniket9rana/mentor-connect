"use client";
import { useSyncExternalStore } from "react";

type Mode = "full" | "date" | "time" | "day" | "mon" | "clock";

function format(iso: string, mode: Mode): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const parts: Record<string, string> = {
    day: String(d.getDate()),
    mon: d.toLocaleDateString(undefined, { month: "short" }),
    clock: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
  return parts[mode] ?? (mode === "date" ? date : mode === "time" ? time : `${date}, ${time}`);
}

const subscribe = () => () => {};

/** Renders a UTC instant in the viewer's own time zone (never the server's), with the zone shown. */
export function LocalTime({ iso, mode = "full" }: { iso: string; mode?: Mode }) {
  // the server snapshot is null, so the server never formats a time; the browser fills it in after hydration
  const text = useSyncExternalStore(subscribe, () => format(iso, mode), () => null);
  return <time dateTime={iso} suppressHydrationWarning>{text ?? (mode === "day" || mode === "mon" || mode === "clock" ? " " : iso.slice(0, 10))}</time>;
}
