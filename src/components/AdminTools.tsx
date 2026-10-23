"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

const TOOLS = [
  { action: "load_demo", label: "Load demo data", icon: "users", hint: "Adds ~30 clearly-labelled demo students with histories so the dashboard has something to show." },
  { action: "sign_in_demo", label: "Sign in as demo student", icon: "user", hint: "Opens a student with calls, write-ups and action items." },
  { action: "run_daily", label: "Run daily job", icon: "refresh", hint: "Releases drafts older than 48h and sends action-item nudges (what the cron does)." },
  { action: "force_release", label: "Simulate 48h passing", icon: "clock", hint: "Releases every pending draft now, marked as not reviewed." },
  { action: "remove_demo", label: "Remove demo data", icon: "x", hint: "Deletes every demo student and their records." },
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map((t) => (
          <button key={t.action} className="rounded-xl border border-line bg-surface2/50 p-4 text-left hover:bg-surface2 hover:border-line2 transition-colors disabled:opacity-60 cursor-pointer grid gap-1.5" disabled={!!busy} onClick={() => go(t.action)}>
            <span className="font-semibold text-sm flex items-center gap-2"><Icon name={t.icon} size={15} className="text-accent" />{busy === t.action ? "Working…" : t.label}</span>
            <span className="text-xs text-muted leading-relaxed">{t.hint}</span>
          </button>
        ))}
      </div>
      {msg && <p role="status" className="text-sm text-fg2 rounded-lg bg-accentsoft px-3 py-2">{msg}</p>}
    </div>
  );
}
