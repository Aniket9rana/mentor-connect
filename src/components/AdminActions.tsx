"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function act(payload: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  const r = await fetch("/api/admin/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, message: "Something went wrong." }));
}

export function NotifyButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="grid gap-1 justify-items-end">
      <button className="btn btn-sm" disabled={busy} onClick={async () => { setBusy(true); const j = await act({ action: "notify_waitlist", id }); setBusy(false); if (j.ok) router.refresh(); else setErr(j.message ?? "Failed."); }}>
        {busy ? "Sending…" : "Notify student"}
      </button>
      {err && <span role="alert" className="text-xs text-bad">{err}</span>}
    </div>
  );
}

export function ContactEditor({ mentorId, initial }: { mentorId: string; initial: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | string>("idle");
  async function save() {
    setState("busy");
    const j = await act({ action: "set_contact", id: mentorId, email });
    if (j.ok) {
      setState("saved");
      router.refresh();
    } else setState(j.message ?? "Failed.");
  }
  const dirty = email.trim().toLowerCase() !== initial;
  return (
    <div className="flex items-center gap-1.5">
      <input className="input !py-1 !text-xs !w-52" type="email" value={email} placeholder="not set (outbox only)" onChange={(e) => { setEmail(e.target.value); setState("idle"); }} aria-label={`Contact email for ${mentorId}`} />
      <button className="btn btn-sm" disabled={!dirty || state === "busy"} onClick={save}>{state === "busy" ? "…" : "Save"}</button>
      {state === "saved" && !dirty && <span className="text-xs text-ok">Saved</span>}
      {state !== "idle" && state !== "busy" && state !== "saved" && <span role="alert" className="text-xs text-bad">{state}</span>}
    </div>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-sm" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setDone(true); setTimeout(() => setDone(false), 1800); }}>
      {done ? "Copied" : "Copy mentor link"}
    </button>
  );
}
