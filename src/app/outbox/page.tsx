import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { all } from "@/lib/db";
import { LocalTime } from "@/components/LocalTime";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageBits";

export const metadata = { title: "Notifications" };

export default async function Outbox() {
  const student = await currentStudent();
  if (!student) redirect("/");
  const mails = await all<{ id: string; ts: string; subject: string; body: string; link: string | null; delivered: number }>(
    "SELECT * FROM emails WHERE to_email = ? ORDER BY ts DESC LIMIT 50", [student.email]);
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10 grid gap-8">
      <PageHeader eyebrow="Inbox" title={<>Notifications</>} sub="Every email we send you is listed here too, so nothing gets lost in a spam folder." />
      {mails.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line2 p-10 text-center grid gap-2 justify-items-center">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-surface2 text-muted"><Icon name="mail" size={18} /></span>
          <p className="font-medium">Nothing yet</p>
          <p className="text-sm text-muted">Booking confirmations and write-ups will appear here.</p>
        </div>
      )}
      <div className="grid gap-3">
        {mails.map((m) => (
          <article key={m.id} className="card p-5 grid gap-2">
            <div className="flex gap-3 items-start">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-accentsoft text-accentink shrink-0"><Icon name="mail" size={15} /></span>
              <h2 className="font-semibold tracking-tight leading-snug pt-1">{m.subject}</h2>
              <span className="text-xs text-muted ml-auto whitespace-nowrap pt-1.5"><LocalTime iso={m.ts} /></span>
            </div>
            <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed pl-11">{m.body}</p>
            {m.link && <Link className="pl-11 inline-flex items-center gap-1 text-sm font-medium text-accentink hover:underline w-fit" href={m.link.replace(/^https?:\/\/[^/]+/, "")}>Open <Icon name="arrow-up-right" size={13} /></Link>}
          </article>
        ))}
      </div>
    </div>
  );
}
