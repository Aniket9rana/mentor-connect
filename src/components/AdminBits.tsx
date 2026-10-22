import Link from "next/link";
import type { Scope } from "@/lib/admin-stats";

export function ScopeToggle({ scope, path }: { scope: Scope; path: string }) {
  return (
    <div className="flex gap-1 text-sm" role="group" aria-label="Data scope">
      {(["all", "real", "demo"] as const).map((s) => (
        <Link key={s} href={`${path}?scope=${s}`} className={`btn ${scope === s ? "btn-primary" : ""}`} aria-current={scope === s}>
          {s === "all" ? "All data" : s === "real" ? "Real only" : "Demo only"}
        </Link>
      ))}
    </div>
  );
}

export function Bar({ label, value, max, suffix = "", sub }: { label: string; value: number; max: number; suffix?: string; sub?: string }) {
  const pct = max ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-sm gap-3"><span>{label}</span><span className="font-semibold tabular-nums">{value}{suffix}{sub && <span className="text-muted font-normal"> · {sub}</span>}</span></div>
      <div className="h-2.5 rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Stat({ k, v, hint }: { k: string; v: string | number; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="font-display text-2xl font-semibold tabular-nums">{v}</div>
      <div className="text-xs text-muted">{k}</div>
      {hint && <div className="text-[0.7rem] text-muted mt-1">{hint}</div>}
    </div>
  );
}

export const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
