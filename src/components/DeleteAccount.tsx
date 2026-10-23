"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function DeleteAccount() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/me", { method: "DELETE" });
    const j = await r.json().catch(() => ({ ok: false, message: "Something went wrong." }));
    if (!j.ok) {
      setErr(j.message);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <section className="card p-5 sm:p-6 grid gap-3">
      <h2 className="text-base font-semibold tracking-tight">Your data</h2>
      <p className="text-sm text-muted leading-relaxed">Delete your account and everything attached to it: chats, bookings, call transcripts, write-ups and action items. Mentors with an upcoming call are told it&apos;s off. This can&apos;t be undone.</p>
      {step === "idle" ? (
        <button className="btn btn-sm w-fit" onClick={() => setStep("confirm")}><Icon name="trash" size={14} /> Delete my data</button>
      ) : (
        <div className="flex gap-2 flex-wrap items-center">
          <button className="btn btn-danger btn-sm" onClick={go} disabled={busy}>{busy ? "Deleting…" : "Yes, delete everything"}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep("idle")} disabled={busy}>Keep my account</button>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </section>
  );
}
