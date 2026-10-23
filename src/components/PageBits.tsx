import Link from "next/link";
import { Icon } from "./Icon";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors w-fit group">
      <Icon name="arrow-left" size={15} className="group-hover:-translate-x-0.5 transition-transform" /> {children}
    </Link>
  );
}

/** Page title block. `serif` is for student-facing pages; admin pages use the quieter sans title. */
export function PageHeader({ eyebrow, title, sub, actions, serif = true }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; serif?: boolean }) {
  return (
    <header className="flex items-end gap-4 flex-wrap">
      <div className="grid gap-2 min-w-0">
        {eyebrow && <span className="label">{eyebrow}</span>}
        <h1 className={serif ? "font-display text-4xl sm:text-5xl leading-[1.05]" : "text-2xl sm:text-[1.7rem] font-semibold tracking-tight"}>{title}</h1>
        {sub && <p className="text-muted max-w-2xl leading-relaxed">{sub}</p>}
      </div>
      {actions && <div className="ml-auto flex gap-2 items-center flex-wrap">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ icon, children, aside }: { icon?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon && <span className="grid place-items-center h-7 w-7 rounded-lg bg-accentsoft text-accentink"><Icon name={icon} size={15} /></span>}
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {aside && <div className="ml-auto text-sm text-muted">{aside}</div>}
    </div>
  );
}

export function Callout({ tone = "info", icon, children }: { tone?: "info" | "warn" | "bad" | "ok"; icon?: string; children: React.ReactNode }) {
  const cls = { info: "bg-surface2 text-fg2 border-line", warn: "bg-warnsoft text-warn border-warn/20", bad: "bg-badsoft text-bad border-bad/20", ok: "bg-oksoft text-ok border-ok/20" }[tone];
  return (
    <p className={`flex gap-2.5 items-start rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${cls}`}>
      {icon && <Icon name={icon} size={16} className="mt-0.5" />}
      <span>{children}</span>
    </p>
  );
}
