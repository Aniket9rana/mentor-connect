"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const j = await r.json();
    if (j.ok) router.refresh();
    else setErr(j.message);
  }
  return (
    <div className="relative isolate min-h-[70vh] grid place-items-center px-4">
      <div className="aurora !opacity-60" />
      <form onSubmit={submit} className="card-glow p-7 grid gap-4 w-full max-w-sm">
        <span className="grid place-items-center h-10 w-10 rounded-xl text-white" style={{ background: "linear-gradient(145deg, var(--brand-1), var(--brand-2))" }}><Icon name="lock" size={18} /></span>
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Mesa team</h1>
          <p className="text-sm text-muted">Sign in to see funnel, demand and quality.</p>
        </div>
        <label className="grid gap-1.5"><span className="field-label">Admin password</span><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
        {err && <p role="alert" className="text-sm text-bad rounded-lg bg-badsoft px-3 py-2">{err}</p>}
        <button className="btn btn-primary">Sign in</button>
      </form>
    </div>
  );
}
