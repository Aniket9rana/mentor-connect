"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function SlotPicker({ mentorId, initialSlots, conversationId, rescheduleOf }: { mentorId: string; initialSlots: string[]; conversationId?: string; rescheduleOf?: string }) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots) {
      const k = new Date(s).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [slots]);
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

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
    }
    if (r.status === 401) setMsg("Please start from the home page first so we know who you are.");
  }

  if (!slots.length) return <p className="text-sm text-muted">No open slots in the next two weeks. Check back soon, or ask the assistant for another mentor.</p>;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">Times shown in your time zone ({tz}). Calls are 30 minutes.</p>
      {byDay.map(([day, list]) => (
        <div key={day} className="grid gap-2">
          <h3 className="text-sm font-semibold font-sans">{day}</h3>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => (
              <button key={s} onClick={() => setPicked(s)} aria-pressed={picked === s} className={`btn ${picked === s ? "btn-primary" : ""}`}>
                {new Date(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </button>
            ))}
          </div>
        </div>
      ))}
      {msg && <p role="alert" className="text-sm text-bad">{msg}</p>}
      <div className="sticky bottom-3">
        <button className="btn btn-primary w-full sm:w-auto" disabled={!picked || busy} onClick={book}>
          {busy ? "Booking…" : picked ? `Confirm ${new Date(picked).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "Pick a time"}
        </button>
      </div>
    </div>
  );
}
