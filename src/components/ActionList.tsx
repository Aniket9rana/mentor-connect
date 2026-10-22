"use client";
import { useState } from "react";
import { LocalTime } from "./LocalTime";

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
    <div className="grid gap-2">
      {items.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <div className="h-1.5 flex-1 rounded-full bg-surface2 overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemax={items.length}>
            <div className="h-full bg-accent transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          {done}/{items.length} done
        </div>
      )}
      <ul className="grid gap-2">
        {items.map((i) => (
          <li key={i.id}>
            <label className="flex items-start gap-3 card p-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={state[i.id]} onChange={() => toggle(i.id)} />
              <span className={`grid gap-0.5 ${state[i.id] ? "line-through text-muted" : ""}`}>
                <span className="text-[0.95rem]">{i.text}</span>
                <span className="text-xs text-muted no-underline">
                  {i.due_at && <>Aim for <LocalTime iso={i.due_at} mode="date" /></>}
                  {showCall && i.call && <> · from {i.call}</>}
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
