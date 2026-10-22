import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { loadMessages } from "@/lib/assistant";
import { LocalTime } from "@/components/LocalTime";

export default async function ConversationTrail({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const c = await one<{ id: string; student_id: string; topic: string | null; outcome: string | null }>("SELECT * FROM conversations WHERE id = ?", [id]);
  if (!c) notFound();
  const student = await one<{ name: string; email: string; is_demo: number }>("SELECT name, email, is_demo FROM students WHERE id = ?", [c.student_id]);
  const msgs = await loadMessages(id);
  const bookings = await all<{ id: string; mentor_id: string; slot_start: string; status: string; sstatus: string | null }>(
    "SELECT b.id, b.mentor_id, b.slot_start, b.status, s.status AS sstatus FROM bookings b LEFT JOIN summaries s ON s.booking_id = b.id WHERE b.conversation_id = ?", [id]);
  const events = await all<{ ts: string; type: string; meta: string }>("SELECT ts, type, meta FROM events WHERE conversation_id = ? ORDER BY ts", [id]);
  return (
    <div className="grid gap-6 max-w-3xl">
      <Link href="/admin/conversations" className="text-sm text-muted underline w-fit">← All conversations</Link>
      <header>
        <h1 className="font-display text-2xl font-semibold">{c.topic ?? "Conversation"}</h1>
        <p className="text-sm text-muted">{student?.name}{student?.is_demo ? " (demo)" : ""} · outcome: {(c.outcome ?? "in progress").replace("_", " ")}</p>
      </header>
      <section className="grid gap-2">
        <h2 className="label">Transcript</h2>
        {msgs.map((m) => (
          <div key={m.id} className={`card p-3 text-sm ${m.role === "user" ? "bg-surface2" : ""}`}>
            <div className="text-xs text-muted mb-1">{m.role === "user" ? "Student" : `Assistant · ${m.kind}${m.matchQuality ? " · " + m.matchQuality + " match" : ""}`}</div>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.cards?.map((k) => <p key={k.mentorId} className="text-xs text-muted mt-1">→ {k.mentorId}: {k.reason}{k.grounded ? "" : " (templated: model text failed grounding)"}</p>)}
          </div>
        ))}
      </section>
      {bookings.length > 0 && (
        <section className="grid gap-2"><h2 className="label">Bookings</h2>{bookings.map((b) => <p key={b.id} className="card p-3 text-sm">{b.mentor_id} · <LocalTime iso={b.slot_start} /> · {b.status}{b.sstatus ? ` · write-up ${b.sstatus}` : ""}</p>)}</section>
      )}
      <section className="grid gap-1"><h2 className="label">Events</h2><ul className="text-xs text-muted grid gap-0.5">{events.map((e, i) => <li key={i}><LocalTime iso={e.ts} mode="time" /> · {e.type} {e.meta !== "{}" && <code>{e.meta.slice(0, 140)}</code>}</li>)}</ul></section>
    </div>
  );
}
