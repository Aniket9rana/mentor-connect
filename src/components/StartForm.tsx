"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function StartForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, tz }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message);
      if (j.mode === "email") {
        setSent(true);
        setBusy(false);
        return;
      }
      router.push("/chat");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message || "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className={`grid gap-3 w-full scroll-mt-24 ${compact ? "" : "card-glow p-6 sm:p-7"}`} id="start" role="status">
        <span className="grid place-items-center h-10 w-10 rounded-xl bg-accentsoft text-accentink"><Icon name="mail" size={18} /></span>
        <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
        <p className="text-sm text-muted leading-relaxed">We sent a sign-in link to <strong className="text-fg">{email}</strong>. It works once and expires in 20 minutes. Check spam if it doesn&apos;t show up.</p>
        <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => setSent(false)}>Use a different email</button>
      </div>
    );

  return (
    <form onSubmit={submit} className={`grid gap-4 w-full scroll-mt-24 ${compact ? "" : "card-glow p-6 sm:p-7"}`} id="start">
      {!compact && (
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Start in 30 seconds</h2>
          <p className="text-sm text-muted">No password. We may email you a one-time link to confirm it&apos;s you; use the same email later to pick up where you left off.</p>
        </div>
      )}
      <label className="grid gap-1.5">
        <span className="field-label">Your name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" placeholder="Aarav Sharma" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Email <span className="text-muted font-normal">· for your call confirmation and write-up</span></span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@college.edu" />
      </label>
      {err && <p role="alert" className="text-sm text-bad rounded-lg bg-badsoft px-3 py-2">{err}</p>}
      <button className="btn btn-primary btn-lg" disabled={busy}>
        {busy ? "Setting things up…" : <>Describe my problem <Icon name="arrow-right" size={16} /></>}
      </button>
      <p className="flex items-center gap-1.5 text-xs text-muted"><Icon name="lock" size={12} /> Your details are only used to book calls and send your write-up.</p>
    </form>
  );
}
