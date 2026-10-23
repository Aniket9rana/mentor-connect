"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const LINKS = [
  { href: "/chat", label: "Find a mentor", short: "Find", icon: "sparkles" },
  { href: "/journey", label: "My journey", short: "Journey", icon: "compass" },
  { href: "/outbox", label: "Notifications", short: "Inbox", icon: "bell" },
] as const;

export function NavLinks() {
  const path = usePathname();
  const active = (h: string) => path === h || path.startsWith(h + "/") || (h === "/chat" && path.startsWith("/mentors")) || (h === "/journey" && (path.startsWith("/bookings") || path.startsWith("/summary")));
  return (
    <nav className="flex items-center gap-0.5 text-sm" aria-label="Main">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
          className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${active(l.href) ? "text-fg bg-surface2" : "text-muted hover:text-fg hover:bg-surface2/70"} ${l.href === "/outbox" ? "hidden sm:inline-flex" : ""}`}
        >
          <Icon name={l.icon} size={15} className="hidden sm:block" />
          <span className="sm:hidden">{l.short}</span>
          <span className="hidden sm:inline">{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
