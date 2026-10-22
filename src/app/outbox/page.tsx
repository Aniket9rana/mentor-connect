import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { all } from "@/lib/db";
import { LocalTime } from "@/components/LocalTime";

export default async function Outbox() {
  const student = await currentStudent();
  if (!student) redirect("/");
  const mails = await all<{ id: string; ts: string; subject: string; body: string; link: string | null; delivered: number }>(
    "SELECT * FROM emails WHERE to_email = ? ORDER BY ts DESC LIMIT 50", [student.email]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 grid gap-4">
      <h1 className="font-display text-3xl font-semibold">Notifications</h1>
      <p className="text-sm text-muted">Every email we send you is listed here too, so nothing gets lost in a spam folder.</p>
      {mails.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
      {mails.map((m) => (
        <article key={m.id} className="card p-4 grid gap-1">
          <div className="flex gap-2 items-center"><h2 className="font-semibold font-sans">{m.subject}</h2><span className="text-xs text-muted ml-auto"><LocalTime iso={m.ts} /></span></div>
          <p className="text-sm text-muted whitespace-pre-wrap">{m.body}</p>
          {m.link && <Link className="text-sm underline w-fit" href={m.link.replace(/^https?:\/\/[^/]+/, "")}>Open</Link>}
        </article>
      ))}
    </div>
  );
}
