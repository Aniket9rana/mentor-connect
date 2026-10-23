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
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Brand";
import { BackLink, Callout, SectionTitle } from "@/components/PageBits";

const SOURCE = {
  mentor_transcript: "From the call transcript",
  student_transcript: "From the call transcript you added",
  student_debrief: "From your own recap (not a transcript)",
} as const;

export const metadata = { title: "Your write-up" };

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
    <div className="relative isolate">
      <div className="aurora !opacity-50" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10 grid gap-9">
        <BackLink href="/journey">My journey</BackLink>

        <header className="grid gap-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 py-1 text-sm shadow-[var(--shadow-sm)]">
              <Avatar name={m?.name ?? "Mentor"} seed={b.mentor_id} size={24} round />
              <span className="font-medium">{m?.name}</span>
              <span className="text-muted">· <LocalTime iso={b.slot_start} mode="date" /></span>
            </span>
            <span className="badge">{SOURCE[c.source]}</span>
            {s.status === "approved" && <span className="badge badge-ok"><Icon name="shield-check" size={11} /> Reviewed by your mentor</span>}
            {s.status === "auto_released" && <span className="badge badge-warn">Not yet reviewed by your mentor</span>}
          </div>
          <h1 className="font-display text-4xl sm:text-[3.25rem] leading-[1.05]">{c.headline}</h1>
          <p className="text-lg leading-relaxed text-fg2">{c.summary}</p>
          {s.status === "auto_released" && <Callout tone="warn" icon="alert">This was generated automatically from the transcript and wasn&apos;t checked by your mentor within 48 hours. Each point links to a quote from the call so you can verify it.</Callout>}
          {c.transcript_quality === "thin" && <Callout tone="warn" icon="alert">The transcript was short, so this write-up may be missing things. Treat it as a starting point.</Callout>}
        </header>

        <section className="grid gap-4">
          <SectionTitle icon="list-checks">What to work on</SectionTitle>
          {items.length ? <ActionList items={items} /> : <p className="text-sm text-muted">No concrete action items came out of this call.</p>}
        </section>

        {c.key_advice.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle icon="sparkles">Key advice</SectionTitle>
            <ul className="grid gap-3">
              {c.key_advice.map((a, i) => (
                <li key={i} className="card p-5 grid gap-3">
                  <p className="font-medium leading-snug">{a.point}</p>
                  <blockquote className="flex gap-2.5 text-sm text-muted leading-relaxed rounded-lg bg-surface2 px-3.5 py-3">
                    <Icon name="quote" size={14} className="mt-0.5 text-accent opacity-70" />
                    <span>{a.evidence_quote}</span>
                  </blockquote>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.resources.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle icon="layers">Resources mentioned</SectionTitle>
            <ul className="grid gap-2">{c.resources.map((r, i) => <li key={i} className="card p-4 text-sm leading-relaxed"><strong className="font-semibold">{r.name}</strong> <span className="text-muted">· {r.note}</span></li>)}</ul>
          </section>
        )}

        <section className="card-glow p-6 sm:p-7 grid gap-4" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="flex items-center gap-2.5"><span className="orb h-6 w-6" aria-hidden /><span className="label !text-accentink">What&apos;s next</span></div>
          <p className="text-lg leading-relaxed">{c.next_step.text}</p>
          <div className="flex gap-2 flex-wrap">
            {c.next_step.type === "follow_up_same_mentor" && <Link className="btn btn-primary" href={`/mentors/${b.mentor_id}`}>Book a follow-up with {m?.name} <Icon name="arrow-right" size={15} /></Link>}
            {c.next_step.type === "new_mentor" && <Link className="btn btn-primary" href={`/chat?new=1&q=${encodeURIComponent(`After my last call I'd like help with: ${c.next_step.topic ?? c.next_step.text}`)}`}>Find a mentor for this <Icon name="arrow-right" size={15} /></Link>}
            <Link className="btn" href="/journey">See my whole journey</Link>
          </div>
        </section>

        {(c.open_questions.length > 0 || c.not_discussed.length > 0) && (
          <section className="grid sm:grid-cols-2 gap-4">
            {c.open_questions.length > 0 && (
              <div className="card p-5 grid gap-2.5 content-start"><span className="label">Still open</span><ul className="text-sm grid gap-2 leading-relaxed">{c.open_questions.map((q, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 rounded-full bg-accent shrink-0" />{q}</li>)}</ul></div>
            )}
            {c.not_discussed.length > 0 && (
              <div className="card p-5 grid gap-2.5 content-start"><span className="label">Not covered on this call</span><ul className="text-sm text-muted grid gap-2 leading-relaxed">{c.not_discussed.map((q, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 rounded-full bg-line2 shrink-0" />{q}</li>)}</ul></div>
            )}
          </section>
        )}

        <section className="card p-5 sm:p-6 grid gap-3">
          <div className="grid gap-0.5"><h2 className="text-base font-semibold tracking-tight">How was this call?</h2><p className="text-sm text-muted">Your rating helps Mesa pick and improve mentors.</p></div>
          <FeedbackForm bookingId={b.id} existing={fb?.rating} />
        </section>
      </div>
    </div>
  );
}
