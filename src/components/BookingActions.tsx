"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function BookingActions({ id, canChange, canReport, demoAdvance }: { id: string; canChange: boolean; canReport: boolean; demoAdvance?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function post(path: string, payload?: unknown) {
    setBusy(true);
    setErr("");
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload ?? {}) });
    const j = await r.json();
    setBusy(false);
    if (!j.ok) return setErr(j.message || "Something went wrong.");
    router.refresh();
  }
  if (!canChange && !canReport && !demoAdvance && !err) return null;
  return (
    <div className="grid gap-3">
      {(canChange || canReport) && (
        <div className="flex gap-2 flex-wrap">
          {canChange && <button className="btn btn-danger" disabled={busy} onClick={() => confirm("Cancel this call?") && post(`/api/bookings/${id}/cancel`)}>Cancel call</button>}
          {canReport && <button className="btn" disabled={busy} onClick={() => confirm("Report that your mentor did not join?") && post(`/api/bookings/${id}/status`, { status: "no_show_mentor" })}>My mentor didn&apos;t show up</button>}
        </div>
      )}
      {demoAdvance && (
        <div className="rounded-xl border border-dashed border-line2 bg-surface2/50 p-3.5 flex flex-wrap items-center gap-3">
          <div className="grid gap-0.5 flex-1 min-w-[14rem]">
            <span className="label flex items-center gap-1.5"><Icon name="zap" size={11} /> Demo only</span>
            <p className="text-xs text-muted leading-relaxed">A real call can&apos;t be waited for in a review. This moves the call 30 minutes into the past so you can try the after-call flow.</p>
          </div>
          <button className="btn btn-sm" disabled={busy} onClick={() => post(`/api/bookings/${id}/demo-advance`)}>Pretend the call has happened</button>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </div>
  );
}
