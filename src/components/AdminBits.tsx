import Link from "next/link";
import type { Scope } from "@/lib/admin-stats";

export function ScopeToggle({ scope, path }: { scope: Scope; path: string }) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl border border-line bg-surface2 p-0.5 text-sm" role="group" aria-label="Data scope">
      {(["all", "real", "demo"] as const).map((s) => (
        <Link
          key={s}
          href={`${path}?scope=${s}`}
          aria-current={scope === s}
          className={`rounded-[10px] px-3 py-1.5 font-medium transition-all ${scope === s ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-muted hover:text-fg"}`}
        >
          {s === "all" ? "All data" : s === "real" ? "Real only" : "Demo only"}
        </Link>
      ))}
    </div>
  );
}

export function Bar({ label, value, max, suffix = "", sub }: { label: string; value: number; max: number; suffix?: string; sub?: string }) {
  const pct = max ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-sm gap-3"><span className="text-fg2">{label}</span><span className="font-semibold tabular-nums">{value}{suffix}{sub && <span className="text-muted font-normal"> · {sub}</span>}</span></div>
      <div className="h-2 rounded-full bg-surface3 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--brand-1), var(--brand-3))" }} /></div>
    </div>
  );
}

export function Stat({ k, v, hint }: { k: string; v: string | number; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5 grid gap-2 content-start">
      <div className="label">{k}</div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums leading-none">{v}</div>
      {hint && <div className="text-xs text-muted leading-snug">{hint}</div>}
    </div>
  );
}

export const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
