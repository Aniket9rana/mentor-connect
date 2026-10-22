import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { getBooking } from "@/lib/booking";
import { getMentor } from "@/lib/mentors";
import { all, one } from "@/lib/db";
import { autoReleaseDue, getSummary } from "@/lib/summarise";
import { ActionList, type ActionItem } from "@/components/ActionList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { LocalTime } from "@/components/LocalTime";

const SOURCE = {
  mentor_transcript: "From the call transcript",
  student_transcript: "From the call transcript you added",
  student_debrief: "From your own recap (not a transcript)",
} as const;

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await currentStudent();
  if (!student) redirect("/");
  await autoReleaseDue();
  const b = await getBooking((await params).id);
  if (!b || b.student_id !== student.id) notFound();
  const s = await getSummary(b.id);
  if (!s || s.status === "draft") redirect(`/bookings/${b.id}`);
  const m = await getMentor(b.mentor_id);
  const c = s.content;
  const items = await all<ActionItem>("SELECT id, text, due_at, done FROM action_items WHERE summary_id = ? ORDER BY due_at", [s.id]);
  const fb = await one<{ rating: number }>("SELECT rating FROM feedback WHERE booking_id = ?", [b.id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 grid gap-6">
      <Link href="/journey" className="text-sm text-muted underline w-fit">← My journey</Link>
      <header className="grid gap-2">
        <div className="flex gap-2 flex-wrap">
          <span className="badge">Call with {m?.name} · <LocalTime iso={b.slot_start} mode="date" /></span>
          <span className="badge">{SOURCE[c.source]}</span>
          {s.status === "approved" && <span className="badge badge-ok">Reviewed by your mentor</span>}
          {s.status === "auto_released" && <span className="badge badge-warn">Not yet reviewed by your mentor</span>}
        </div>
        <h1 className="font-display text-3xl font-semibold leading-tight">{c.headline}</h1>
        <p className="leading-relaxed">{c.summary}</p>
        {s.status === "auto_released" && <p className="text-xs text-muted">This was generated automatically from the transcript and wasn&apos;t checked by your mentor within 48 hours. Each point links to a quote from the call so you can verify it.</p>}
        {c.transcript_quality === "thin" && <p className="text-sm rounded-xl bg-warnsoft text-warn px-3 py-2">The transcript was short, so this write-up may be missing things. Treat it as a starting point.</p>}
      </header>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold">What to work on</h2>
        {items.length ? <ActionList items={items} /> : <p className="text-sm text-muted">No concrete action items came out of this call.</p>}
      </section>

      {c.key_advice.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-display text-xl font-semibold">Key advice</h2>
          <ul className="grid gap-3">
            {c.key_advice.map((a, i) => (
              <li key={i} className="card p-4 grid gap-1.5">
                <p className="font-medium">{a.point}</p>
                <blockquote className="text-sm text-muted border-l-2 border-line pl-3">“{a.evidence_quote}”</blockquote>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.resources.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-display text-xl font-semibold">Resources mentioned</h2>
          <ul className="grid gap-2">{c.resources.map((r, i) => <li key={i} className="card p-3 text-sm"><strong>{r.name}</strong> - {r.note}</li>)}</ul>
        </section>
      )}

      <section className="card p-5 grid gap-3">
        <h2 className="font-display text-xl font-semibold">What&apos;s next</h2>
        <p>{c.next_step.text}</p>
        <div className="flex gap-2 flex-wrap">
          {c.next_step.type === "follow_up_same_mentor" && <Link className="btn btn-primary" href={`/mentors/${b.mentor_id}`}>Book a follow-up with {m?.name}</Link>}
          {c.next_step.type === "new_mentor" && <Link className="btn btn-primary" href={`/chat?new=1&q=${encodeURIComponent(`After my last call I'd like help with: ${c.next_step.topic ?? c.next_step.text}`)}`}>Find a mentor for this</Link>}
          <Link className="btn" href="/journey">See my whole journey</Link>
        </div>
      </section>

      {(c.open_questions.length > 0 || c.not_discussed.length > 0) && (
        <section className="grid sm:grid-cols-2 gap-4">
          {c.open_questions.length > 0 && (
            <div className="card p-4 grid gap-1"><span className="label">Still open</span><ul className="text-sm list-disc pl-4 grid gap-1">{c.open_questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
          )}
          {c.not_discussed.length > 0 && (
            <div className="card p-4 grid gap-1"><span className="label">Not covered on this call</span><ul className="text-sm list-disc pl-4 grid gap-1">{c.not_discussed.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
          )}
        </section>
      )}

      <section className="card p-5 grid gap-2">
        <h2 className="font-display text-lg font-semibold">How was this call?</h2>
        <FeedbackForm bookingId={b.id} existing={fb?.rating} />
      </section>
    </div>
  );
}
