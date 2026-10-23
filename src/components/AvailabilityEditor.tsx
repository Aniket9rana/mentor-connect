"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = [["1", "Mon"], ["2", "Tue"], ["3", "Wed"], ["4", "Thu"], ["5", "Fri"], ["6", "Sat"], ["0", "Sun"]] as const;
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 .. 22:00, mirrors OFFERABLE_HOURS
const label = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;

export function AvailabilityEditor({ token, initial }: { token: string; initial: { weekly: Record<string, number[]>; blackout: string[] } }) {
  const router = useRouter();
  const [weekly, setWeekly] = useState<Record<string, number[]>>(initial.weekly);
  const [blackout, setBlackout] = useState<string[]>(initial.blackout);
  const [day, setDay] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (d: string, h: number) =>
    setWeekly((w) => {
      const cur = new Set(w[d] ?? []);
      if (cur.has(h)) cur.delete(h);
      else cur.add(h);
      return { ...w, [d]: [...cur].sort((a, b) => a - b) };
    });

  async function save() {
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/mentor/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "availability", weekly, blackout }) });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? "Saved. Students now see these hours." : j.message || "Something went wrong.");
    if (j.ok) router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="text-xs border-separate border-spacing-1">
          <thead>
            <tr><th />{HOURS.map((h) => <th key={h} className="font-normal text-muted px-0.5">{label(h)}</th>)}</tr>
          </thead>
          <tbody>
            {DAYS.map(([d, name]) => (
              <tr key={d}>
                <th scope="row" className="text-left font-medium pr-2">{name}</th>
                {HOURS.map((h) => {
                  const on = (weekly[d] ?? []).includes(h);
                  return (
                    <td key={h}>
                      <button type="button" onClick={() => toggle(d, h)} aria-pressed={on} aria-label={`${name} ${label(h)}`}
                        className={`h-7 w-7 rounded-md border transition-colors cursor-pointer ${on ? "bg-brand border-transparent" : "bg-surface2 border-line hover:border-line2"}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2">
        <label className="field-label" htmlFor="bo">Days off (no bookings)</label>
        <div className="flex gap-2 flex-wrap items-center">
          <input id="bo" type="date" className="input !w-auto" value={day} onChange={(e) => setDay(e.target.value)} />
          <button type="button" className="btn btn-sm" disabled={!day || blackout.includes(day)} onClick={() => { setBlackout((b) => [...b, day].sort()); setDay(""); }}>Add day off</button>
        </div>
        {blackout.length > 0 && (
          <ul className="flex gap-1.5 flex-wrap">
            {blackout.map((d) => (
              <li key={d}><button type="button" className="chip cursor-pointer" onClick={() => setBlackout((b) => b.filter((x) => x !== d))} aria-label={`Remove ${d}`}>{d} ✕</button></li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save availability"}</button>
        <span className="text-xs text-muted">Each filled square is a 30-minute slot starting at that hour.</span>
      </div>
      {msg && <p role="status" className="text-sm text-fg2 rounded-lg bg-accentsoft px-3 py-2">{msg}</p>}
    </div>
  );
}
