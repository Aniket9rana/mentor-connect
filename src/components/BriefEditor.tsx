"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BriefEditor({ bookingId, initial }: { bookingId: string; initial: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/bookings/${bookingId}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ brief: text }) });
    const j = await r.json().catch(() => ({ ok: false, message: "Something went wrong." }));
    setBusy(false);
    if (!j.ok) return setErr(j.message);
    setEditing(false);
    router.refresh();
  }

  if (!editing) return <button className="btn btn-sm w-fit" onClick={() => setEditing(true)}>Edit what your mentor sees</button>;
  return (
    <div className="grid gap-2">
      <label className="field-label" htmlFor="brief">Pre-call brief</label>
      <textarea id="brief" className="input min-h-32" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} />
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !text.trim()}>{busy ? "Saving…" : "Save"}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setText(initial); setEditing(false); }} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}
