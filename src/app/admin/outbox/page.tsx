import { all } from "@/lib/db";
import { LocalTime } from "@/components/LocalTime";

export default async function AdminOutbox() {
  const mails = await all<{ id: string; ts: string; to_email: string; subject: string; kind: string; delivered: number; link: string | null }>("SELECT id, ts, to_email, subject, kind, delivered, link FROM emails ORDER BY ts DESC LIMIT 100");
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight">Emails</h1>
      <p className="text-sm text-muted">All notifications the system has produced. “Sent” means delivered through the email provider; “outbox only” means the provider isn&apos;t configured, or the address is a demo/placeholder mailbox.</p>
      <div className="card overflow-x-auto"><table className="tbl">
        <thead><tr><th>When</th><th>To</th><th>Type</th><th>Subject</th><th>Status</th><th>Link</th></tr></thead>
        <tbody>{mails.map((m) => <tr key={m.id}><td className="whitespace-nowrap"><LocalTime iso={m.ts} /></td><td>{m.to_email}</td><td><span className="chip">{m.kind}</span></td><td>{m.subject}</td><td><span className={`badge ${m.delivered ? "badge-ok" : ""}`}>{m.delivered ? "sent" : "outbox only"}</span></td><td>{m.link && <a className="text-accentink font-medium hover:underline" href={m.link.replace(/^https?:\/\/[^/]+/, "")}>Open</a>}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
