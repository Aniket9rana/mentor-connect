"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function SlotPicker({ mentorId, initialSlots, conversationId, rescheduleOf }: { mentorId: string; initialSlots: string[]; conversationId?: string; rescheduleOf?: string }) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [picked, setPicked] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // Slot labels depend on the viewer's time zone, so they render after mount only (never server-formatted).
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const byDay = useMemo(() => {
    const m = new Map<string, { date: Date; times: string[] }>();
    for (const s of slots) {
      const d = new Date(s);
      const k = d.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
      const cur = m.get(k) ?? { date: d, times: [] };
      cur.times.push(s);
      m.set(k, cur);
    }
    return [...m.values()];
  }, [slots]);
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const day = byDay[Math.min(dayIdx, byDay.length - 1)];

  async function book() {
    if (!picked) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mentorId, slotStart: picked, conversationId, rescheduleOf }) });
    const j = await r.json();
    if (j.ok) return router.push(`/bookings/${j.bookingId}`);
    setBusy(false);
    setMsg(j.message || "Couldn't book that slot.");
    if (j.slots) {
      setSlots(j.slots);
      setPicked(null);
      setDayIdx(0);
    }
    if (r.status === 401) setMsg("Please start from the home page first so we know who you are.");
  }

  if (!slots.length)
    return (
      <div className="rounded-xl border border-dashed border-line2 p-5 text-center grid gap-1.5 justify-items-center">
        <Icon name="calendar" size={20} className="text-muted" />
        <p className="text-sm font-medium">No open slots in the next two weeks</p>
        <p className="text-sm text-muted">Check back soon, or ask the assistant for another mentor.</p>
      </div>
    );
  if (!mounted)
    return (
      <div className="grid gap-4" aria-busy>
        <div className="skeleton h-14" />
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-10" />)}</div>
      </div>
    );

  return (
    <div className="grid gap-5">
      <p className="flex items-center gap-1.5 text-xs text-muted"><Icon name="clock" size={13} /> 30-minute call · times in your time zone ({tz})</p>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" role="tablist" aria-label="Choose a day">
        {byDay.map((d, i) => {
          const on = i === dayIdx;
          return (
            <button
              key={i}
              role="tab"
              aria-selected={on}
              onClick={() => setDayIdx(i)}
              className={`snap-start shrink-0 w-[3.9rem] rounded-xl border py-2 grid gap-0.5 text-center cursor-pointer transition-all ${on ? "border-transparent text-white shadow-[0_8px_18px_-8px_rgb(80_64_230/0.7)]" : "border-line bg-surface hover:border-line2 hover:bg-surface2"}`}
              style={on ? { background: "linear-gradient(180deg, var(--brand-1), var(--brand-2))" } : undefined}
            >
              <span className={`text-[0.65rem] font-mono uppercase tracking-wider ${on ? "text-white/75" : "text-muted"}`}>{d.date.toLocaleDateString(undefined, { weekday: "short" })}</span>
              <span className="text-lg font-semibold leading-none tabular-nums">{d.date.getDate()}</span>
              <span className={`text-[0.65rem] ${on ? "text-white/75" : "text-muted"}`}>{d.date.toLocaleDateString(undefined, { month: "short" })}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="grid grid-cols-3 gap-2">
        {day.times.map((s) => (
          <button
            key={s}
            onClick={() => setPicked(s)}
            aria-pressed={picked === s}
            className={`rounded-xl border py-2.5 text-sm font-medium tabular-nums cursor-pointer transition-all ${picked === s ? "border-brand bg-accentsoft text-accentink ring-4 ring-[color-mix(in_srgb,var(--brand-1)_18%,transparent)]" : "border-line bg-surface hover:border-line2 hover:bg-surface2"}`}
          >
            {new Date(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </button>
        ))}
      </div>

      {msg && <p role="alert" className="text-sm text-bad rounded-lg bg-badsoft px-3 py-2">{msg}</p>}
      <button className="btn btn-primary btn-lg w-full" disabled={!picked || busy} onClick={book}>
        {busy ? "Booking…" : picked ? <>Confirm {new Date(picked).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} <Icon name="arrow-right" size={16} /></> : "Pick a time"}
      </button>
    </div>
  );
}
