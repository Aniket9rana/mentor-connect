"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function FeedbackForm({ bookingId, existing }: { bookingId: string; existing?: number }) {
  const [rating, setRating] = useState(existing ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(!!existing);
  const [err, setErr] = useState("");
  async function save() {
    const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookingId, rating, comment: comment || undefined }) });
    const j = await r.json();
    if (j.ok) setSaved(true);
    else setErr(j.message);
  }
  const shown = hover || rating;
  return (
    <div className="grid gap-3">
      <div className="flex gap-1" role="radiogroup" aria-label="Rate this call" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} out of 5`}
            className={`p-1 rounded-lg cursor-pointer transition-transform hover:scale-110 ${shown >= n ? "text-[#f5a524]" : "text-line2"}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => { setRating(n); setSaved(false); }}
          >
            <Icon name="star" size={28} className={shown >= n ? "fill-current" : ""} />
          </button>
        ))}
      </div>
      {rating > 0 && !saved && (
        <div className="grid gap-2 sm:flex sm:items-center">
          <input className="input" placeholder="Anything we should know? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          <button className="btn btn-primary shrink-0" onClick={save}>Send feedback</button>
        </div>
      )}
      {saved && <p className="text-sm text-ok flex items-center gap-1.5"><Icon name="check-circle" size={15} /> Thanks, this helps Mesa pick and improve mentors.</p>}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </div>
  );
}
