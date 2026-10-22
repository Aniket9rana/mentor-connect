"use client";
import { useState } from "react";

export function FeedbackForm({ bookingId, existing }: { bookingId: string; existing?: number }) {
  const [rating, setRating] = useState(existing ?? 0);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(!!existing);
  const [err, setErr] = useState("");
  async function save() {
    const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId, rating, comment: comment || undefined }) });
    const j = await r.json();
    if (j.ok) setSaved(true);
    else setErr(j.message);
  }
  return (
    <div className="grid gap-2">
      <div className="flex gap-1" role="radiogroup" aria-label="Rate this call">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} out of 5`} className={`btn h-10 w-10 p-0 ${rating >= n ? "btn-primary" : ""}`} onClick={() => { setRating(n); setSaved(false); }}>{n}</button>
        ))}
      </div>
      {rating > 0 && !saved && (
        <>
          <input className="input" placeholder="Anything we should know? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          <button className="btn btn-primary w-fit" onClick={save}>Send feedback</button>
        </>
      )}
      {saved && <p className="text-sm text-ok">Thanks - this helps Mesa pick and improve mentors.</p>}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </div>
  );
}
