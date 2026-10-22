import Link from "next/link";
import { all } from "@/lib/db";
import { LocalTime } from "@/components/LocalTime";

export default async function Conversations() {
  const rows = await all<{ id: string; topic: string | null; outcome: string | null; updated_at: string; name: string; is_demo: number; n: number }>(
    `SELECT c.id, c.topic, c.outcome, c.updated_at, s.name, s.is_demo, (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS n
       FROM conversations c JOIN students s ON s.id = c.student_id WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id) ORDER BY c.updated_at DESC LIMIT 100`);
  const badge: Record<string, string> = { recommended: "badge-ok", no_match: "badge-bad", sensitive: "badge-warn" };
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold">Conversations</h1>
      <div className="grid gap-2">
        {rows.map((r) => (
          <Link key={r.id} href={`/admin/conversations/${r.id}`} className="card p-3 flex gap-3 items-center hover:bg-surface2">
            <div className="min-w-0"><div className="text-sm font-medium truncate">{r.topic ?? "(no topic yet - student hasn't been matched)"}</div><div className="text-xs text-muted">{r.name}{r.is_demo ? " · demo" : ""} · {r.n} messages · <LocalTime iso={r.updated_at} mode="date" /></div></div>
            <span className={`badge ml-auto ${badge[r.outcome ?? ""] ?? ""}`}>{(r.outcome ?? "in progress").replace("_", " ")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
