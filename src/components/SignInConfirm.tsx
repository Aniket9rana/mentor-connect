"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function SignInConfirm({ token }: { token: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/session/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const j = await r.json().catch(() => ({ ok: false, message: "Something went wrong." }));
    if (!j.ok) {
      setErr(j.message);
      setBusy(false);
      return;
    }
    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="card-glow p-7 grid gap-4 text-center justify-items-center">
      <span className="grid place-items-center h-11 w-11 rounded-xl bg-accentsoft text-accentink"><Icon name="lock" size={20} /></span>
      <h1 className="text-xl font-semibold tracking-tight">Confirm it&apos;s you</h1>
      <p className="text-sm text-muted leading-relaxed">One tap and you&apos;re signed in on this device.</p>
      {err && <p role="alert" className="text-sm text-bad rounded-lg bg-badsoft px-3 py-2">{err}</p>}
      <button className="btn btn-primary btn-lg w-full" onClick={go} disabled={busy}>{busy ? "Signing you in…" : "Continue to Mentor Connect"}</button>
    </div>
  );
}
