"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MentorActions({ token, meetingUrl, canMark, active }: { token: string; meetingUrl: string | null; canMark: boolean; active: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(meetingUrl ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function post(payload: unknown, ok?: string) {
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/mentor/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? (ok ?? "Saved.") : j.message || "Something went wrong.");
    if (j.ok) router.refresh();
  }
  return (
    <div className="grid gap-4">
      {active && (
        <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); post({ action: "meeting_url", url }, "Link saved - the student can see it now."); }}>
          <label className="field-label" htmlFor="mu">Meeting link (Google Meet, Zoom, …)</label>
          <div className="flex gap-2">
            <input id="mu" className="input" type="url" placeholder="https://meet.google.com/…" value={url} onChange={(e) => setUrl(e.target.value)} required />
            <button className="btn btn-primary shrink-0" disabled={busy}>Save</button>
          </div>
        </form>
      )}
      {canMark && (
        <div className="flex gap-2 flex-wrap">
          <button className="btn" disabled={busy} onClick={() => post({ action: "status", status: "completed" }, "Marked as completed.")}>Call happened</button>
          <button className="btn" disabled={busy} onClick={() => confirm("Mark the student as not attending?") && post({ action: "status", status: "no_show_student" })}>Student didn&apos;t attend</button>
        </div>
      )}
      {msg && <p role="status" className="text-sm text-fg2 rounded-lg bg-accentsoft px-3 py-2">{msg}</p>}
    </div>
  );
}
