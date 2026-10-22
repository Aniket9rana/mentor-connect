import { all } from "@/lib/db";
import { LocalTime } from "@/components/LocalTime";

export default async function AdminOutbox() {
  const mails = await all<{ id: string; ts: string; to_email: string; subject: string; kind: string; delivered: number; link: string | null }>("SELECT id, ts, to_email, subject, kind, delivered, link FROM emails ORDER BY ts DESC LIMIT 100");
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold">Emails</h1>
      <p className="text-sm text-muted">All notifications the system has produced. “Sent” means delivered through the email provider; “outbox only” means the provider isn&apos;t configured, or the address is a demo/placeholder mailbox.</p>
      <div className="card overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-muted border-b border-line"><th className="p-2.5 font-medium">When</th><th className="font-medium">To</th><th className="font-medium">Type</th><th className="font-medium">Subject</th><th className="font-medium pr-3">Status</th><th className="font-medium">Link</th></tr></thead>
        <tbody>{mails.map((m) => <tr key={m.id} className="border-b border-line last:border-0"><td className="p-2.5 whitespace-nowrap"><LocalTime iso={m.ts} /></td><td className="pr-3">{m.to_email}</td><td className="pr-3">{m.kind}</td><td className="pr-3">{m.subject}</td><td><span className={`badge ${m.delivered ? "badge-ok" : ""}`}>{m.delivered ? "sent" : "outbox only"}</span></td><td className="pr-3">{m.link && <a className="underline" href={m.link.replace(/^https?:\/\/[^/]+/, "")}>Open</a>}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
