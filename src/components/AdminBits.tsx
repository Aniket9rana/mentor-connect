import Link from "next/link";
import type { Range, Scope } from "@/lib/admin-stats";
import { Icon } from "./Icon";

export function ScopeToggle({ scope, path, range }: { scope: Scope; path: string; range?: Range }) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl border border-line bg-surface2 p-0.5 text-sm" role="group" aria-label="Data scope">
      {(["all", "real", "demo"] as const).map((s) => (
        <Link
          key={s}
          href={`${path}?scope=${s}${range && range !== "all" ? `&range=${range}` : ""}`}
          aria-current={scope === s}
          className={`rounded-[10px] px-3 py-1.5 font-medium transition-all ${scope === s ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-muted hover:text-fg"}`}
        >
          {s === "all" ? "All data" : s === "real" ? "Real only" : "Demo only"}
        </Link>
      ))}
    </div>
  );
}

export function RangeToggle({ range, scope, path }: { range: Range; scope: Scope; path: string }) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl border border-line bg-surface2 p-0.5 text-sm" role="group" aria-label="Date range">
      {([["7d", "Last 7 days"], ["30d", "Last 30 days"], ["all", "All time"]] as const).map(([r, label]) => (
        <Link
          key={r}
          href={`${path}?scope=${scope}${r === "all" ? "" : `&range=${r}`}`}
          aria-current={range === r}
          className={`rounded-[10px] px-3 py-1.5 font-medium transition-all ${range === r ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-muted hover:text-fg"}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function CsvLink({ table, scope, range }: { table: string; scope?: Scope; range?: Range }) {
  const q = new URLSearchParams({ table, ...(scope ? { scope } : {}), ...(range && range !== "all" ? { range } : {}) });
  return <a className="btn btn-sm" href={`/api/admin/export?${q}`}><Icon name="download" size={14} /> CSV</a>;
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
