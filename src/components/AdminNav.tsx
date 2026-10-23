"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  ["/admin", "Overview", "bar-chart"], ["/admin/demand", "Demand & gaps", "trending-up"], ["/admin/mentors", "Mentors", "users"],
  ["/admin/quality", "Quality & safety", "shield-check"], ["/admin/conversations", "Conversations", "message"], ["/admin/outbox", "Emails", "mail"],
] as const;

export function AdminNav() {
  const path = usePathname();
  const active = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-sm)] w-fit max-w-full" aria-label="Admin sections">
      {TABS.map(([href, label, icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${active(href) ? "bg-accentsoft text-accentink" : "text-muted hover:text-fg hover:bg-surface2"}`}
        >
          <Icon name={icon} size={15} /> {label}
        </Link>
      ))}
    </nav>
  );
}
