import Link from "next/link";
import { isAdmin } from "@/lib/session";
import { AdminLogin } from "@/components/AdminLogin";

export const metadata = { title: "Mesa team · Mentor Connect", robots: { index: false } };
const TABS = [["/admin", "Overview"], ["/admin/demand", "Demand & gaps"], ["/admin/mentors", "Mentors"], ["/admin/quality", "Quality & safety"], ["/admin/conversations", "Conversations"], ["/admin/outbox", "Emails"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return <AdminLogin />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid gap-6">
      <nav className="flex gap-1 flex-wrap border-b border-line pb-3" aria-label="Admin sections">
        {TABS.map(([href, label]) => <Link key={href} href={href} className="btn border-transparent bg-transparent">{label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
