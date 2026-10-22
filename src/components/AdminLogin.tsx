"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <form onSubmit={submit} className="card p-5 grid gap-3 max-w-sm mx-auto mt-16">
      <h1 className="font-display text-2xl font-semibold">Mesa team</h1>
      <label className="grid gap-1 text-sm"><span className="label">Admin password</span><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <button className="btn btn-primary">Sign in</button>
    </form>
  );
}
