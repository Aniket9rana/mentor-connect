"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function WaitlistButton({ conversationId, joined: initial }: { conversationId: string; joined: boolean }) {
  const [joined, setJoined] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function join() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId }) });
    const j = await r.json().catch(() => ({ ok: false, message: "Something went wrong." }));
    setBusy(false);
    if (j.ok) setJoined(true);
    else setErr(j.message);
  }
  if (joined)
    return <p className="text-sm flex items-center gap-2 text-ok"><Icon name="check-circle" size={15} /> You&apos;re on the list. We&apos;ll email you when we add mentors for this.</p>;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button className="btn btn-sm" onClick={join} disabled={busy}><Icon name="bell" size={14} /> {busy ? "Adding…" : "Tell me when you have someone"}</button>
      {err && <span role="alert" className="text-xs text-bad">{err}</span>}
    </div>
  );
}
