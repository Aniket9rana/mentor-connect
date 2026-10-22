"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TOOLS = [
  { action: "load_demo", label: "Load demo data", hint: "Adds ~30 clearly-labelled demo students with histories so the dashboard has something to show." },
  { action: "sign_in_demo", label: "Sign in as demo student", hint: "Opens a student with calls, write-ups and action items." },
  { action: "run_daily", label: "Run daily job", hint: "Releases drafts older than 48h and sends action-item nudges (what the cron does)." },
  { action: "force_release", label: "Simulate 48h passing", hint: "Releases every pending draft now, marked as not reviewed." },
  { action: "remove_demo", label: "Remove demo data", hint: "Deletes every demo student and their records." },
] as const;

export function AdminTools() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  async function go(action: string) {
    setBusy(action);
    setMsg("");
    const r = await fetch("/api/admin/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const j = await r.json();
    setBusy("");
    setMsg(j.message ?? "Done.");
    router.refresh();
  }
  return (
    <div className="grid gap-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {TOOLS.map((t) => (
          <button key={t.action} className="card p-3 text-left hover:bg-surface2 disabled:opacity-60" disabled={!!busy} onClick={() => go(t.action)}>
            <span className="font-semibold text-sm block">{busy === t.action ? "Working…" : t.label}</span>
            <span className="text-xs text-muted">{t.hint}</span>
          </button>
        ))}
      </div>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  );
}
