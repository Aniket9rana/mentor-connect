import { isAdmin } from "@/lib/session";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminNav } from "@/components/AdminNav";

export const metadata = { title: "Mesa team", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return <AdminLogin />;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 grid gap-8">
      <AdminNav />
      {children}
    </div>
  );
}
