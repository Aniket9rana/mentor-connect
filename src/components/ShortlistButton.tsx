"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function ShortlistButton({ mentorId, saved: initial, signedIn = true, compact = false }: { mentorId: string; saved: boolean; signedIn?: boolean; compact?: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!signedIn) return null;

  async function toggle() {
    setBusy(true);
    setErr("");
    const next = !saved;
    setSaved(next); // optimistic
    const r = await fetch("/api/shortlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mentorId, saved: next }) });
    const j = await r.json().catch(() => ({ ok: false, message: "Something went wrong." }));
    setBusy(false);
    if (!j.ok) {
      setSaved(!next);
      setErr(j.message);
    }
  }
  return (
    <span className="inline-grid">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} className={`btn ${compact ? "btn-sm" : ""} ${saved ? "!border-accent !text-accentink" : ""}`}>
        <Icon name="bookmark" size={14} className={saved ? "fill-current" : ""} /> {saved ? "Saved" : "Save"}
      </button>
      {err && <span role="alert" className="text-xs text-bad mt-1">{err}</span>}
    </span>
  );
}
