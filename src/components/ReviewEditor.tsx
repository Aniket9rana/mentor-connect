"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SummaryContent } from "@/lib/summarise";
import { Icon } from "./Icon";

export function ReviewEditor({ token, initial }: { token: string; initial: SummaryContent }) {
  const router = useRouter();
  const [c, setC] = useState<SummaryContent>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const remove = <K extends "key_advice" | "action_items" | "resources">(k: K, i: number) => setC({ ...c, [k]: c[k].filter((_, j) => j !== i) });

  async function approve() {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/mentor/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve", edited: c }) });
    const j = await r.json();
    setBusy(false);
    if (!j.ok) return setErr(j.message || "Couldn't approve.");
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <label className="grid gap-1"><span className="field-label">Headline</span><input className="input" value={c.headline} onChange={(e) => setC({ ...c, headline: e.target.value })} /></label>
      <label className="grid gap-1"><span className="field-label">Summary (what the student will read)</span><textarea className="input min-h-28" value={c.summary} onChange={(e) => setC({ ...c, summary: e.target.value })} /></label>

      <fieldset className="grid gap-2">
        <legend className="field-label mb-1">Key advice - remove anything that is wrong</legend>
        {c.key_advice.map((a, i) => (
          <div key={i} className="card p-3 grid gap-1">
            <input className="input" value={a.point} onChange={(e) => setC({ ...c, key_advice: c.key_advice.map((x, j) => (j === i ? { ...x, point: e.target.value } : x)) })} />
            <p className="text-xs text-muted">From the call: “{a.evidence_quote}”</p>
            <button className="btn btn-danger w-fit" onClick={() => remove("key_advice", i)}>Remove</button>
          </div>
        ))}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="field-label mb-1">Action items for the student</legend>
        {c.action_items.map((a, i) => (
          <div key={i} className="card p-3 grid gap-1">
            <input className="input" value={a.task} onChange={(e) => setC({ ...c, action_items: c.action_items.map((x, j) => (j === i ? { ...x, task: e.target.value } : x)) })} />
            <div className="flex items-center gap-2 text-sm">
              Due in <input type="number" min={1} max={60} className="input w-20" value={a.due_in_days} onChange={(e) => setC({ ...c, action_items: c.action_items.map((x, j) => (j === i ? { ...x, due_in_days: Math.max(1, Math.min(60, Number(e.target.value) || 1)) } : x)) })} /> days
              <button className="btn btn-danger ml-auto" onClick={() => remove("action_items", i)}>Remove</button>
            </div>
            <p className="text-xs text-muted">From the call: “{a.evidence_quote}”</p>
          </div>
        ))}
      </fieldset>

      {c.resources.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="field-label mb-1">Resources</legend>
          {c.resources.map((r, i) => (
            <div key={i} className="card p-3 flex items-center gap-2 text-sm"><span><strong>{r.name}</strong> - {r.note}</span><button className="btn btn-danger ml-auto" onClick={() => remove("resources", i)}>Remove</button></div>
          ))}
        </fieldset>
      )}

      <label className="grid gap-1"><span className="field-label">Suggested next step</span><input className="input" value={c.next_step.text} onChange={(e) => setC({ ...c, next_step: { ...c.next_step, text: e.target.value } })} /></label>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <button className="btn btn-primary btn-lg w-fit" onClick={approve} disabled={busy}>{busy ? "Sending…" : <>Approve and send to student <Icon name="arrow-right" size={16} /></>}</button>
    </div>
  );
}
