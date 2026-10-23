"use client";
import { useState } from "react";
import { LocalTime } from "./LocalTime";
import { Icon } from "./Icon";

export type ActionItem = { id: string; text: string; due_at: string | null; done: number };

export function ActionList({ items, showCall }: { items: (ActionItem & { call?: string })[]; showCall?: boolean }) {
  const [state, setState] = useState(() => Object.fromEntries(items.map((i) => [i.id, !!i.done])));
  const [err, setErr] = useState("");
  async function toggle(id: string) {
    const next = !state[id];
    setState((s) => ({ ...s, [id]: next }));
    const r = await fetch(`/api/action-items/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ done: next }) });
    if (!(await r.json()).ok) {
      setState((s) => ({ ...s, [id]: !next }));
      setErr("Couldn't save that. Try again.");
    }
  }
  const done = Object.values(state).filter(Boolean).length;
  return (
    <div className="grid gap-3">
      {items.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted font-mono" aria-live="polite">
          <div className="h-1.5 flex-1 rounded-full bg-surface3 overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemax={items.length}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(done / items.length) * 100}%`, background: "linear-gradient(90deg, var(--brand-1), var(--brand-3))" }} />
          </div>
          {done}/{items.length} done
        </div>
      )}
      <ul className="grid gap-2">
        {items.map((i) => (
          <li key={i.id}>
            <label className={`flex items-start gap-3.5 card p-3.5 cursor-pointer transition-colors hover:border-line2 ${state[i.id] ? "bg-surface2/60" : ""}`}>
              <input type="checkbox" className="peer sr-only" checked={state[i.id]} onChange={() => toggle(i.id)} />
              <span className="mt-0.5 grid place-items-center h-5 w-5 shrink-0 rounded-md border-2 border-line2 text-white transition-all peer-checked:border-transparent peer-checked:[background:linear-gradient(180deg,var(--brand-1),var(--brand-2))] peer-focus-visible:ring-4 peer-focus-visible:ring-[color-mix(in_srgb,var(--brand-1)_25%,transparent)] [&>svg]:scale-0 peer-checked:[&>svg]:scale-100 [&>svg]:transition-transform">
                <Icon name="check" size={13} strokeWidth={3} />
              </span>
              <span className="grid gap-0.5">
                <span className={`text-[0.93rem] leading-snug ${state[i.id] ? "line-through text-muted" : ""}`}>{i.text}</span>
                <span className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                  {i.due_at && <span className="inline-flex items-center gap-1"><Icon name="clock" size={11} /> Aim for <LocalTime iso={i.due_at} mode="date" /></span>}
                  {showCall && i.call && <span>· from {i.call}</span>}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </div>
  );
}
