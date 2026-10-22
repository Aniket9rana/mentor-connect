"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, tz }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message);
      router.push("/chat");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message || "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 grid gap-3 max-w-md" id="start">
      <h2 className="font-display text-xl font-semibold">Start with your story</h2>
      <label className="grid gap-1 text-sm">
        <span className="label">Your name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="label">Email (for your call confirmation and write-up)</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Setting up…" : "Describe my problem →"}</button>
      <p className="text-xs text-muted">No password for this prototype. Using the same email brings back your history.</p>
    </form>
  );
}
