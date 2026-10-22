import { notFound } from "next/navigation";
import { bookingByToken } from "@/lib/booking";
import { getMentor } from "@/lib/mentors";
import { one } from "@/lib/db";
import { getSummary, REVIEW_WINDOW_MS } from "@/lib/summarise";
import { LocalTime } from "@/components/LocalTime";
import { MentorActions } from "@/components/MentorActions";
import { TranscriptForm } from "@/components/TranscriptForm";
import { ReviewEditor } from "@/components/ReviewEditor";

export const metadata = { title: "Mentor portal · Mentor Connect", robots: { index: false } };

export default async function MentorPortal({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const b = await bookingByToken(token);
  if (!b) notFound();
  const m = await getMentor(b.mentor_id);
  const student = await one<{ name: string }>("SELECT name FROM students WHERE id = ?", [b.student_id]);
  const s = await getSummary(b.id);
  const past = new Date(b.slot_start).getTime() <= Date.now();
  const active = b.status === "confirmed";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 grid gap-6">
      <header className="grid gap-1">
        <span className="badge badge-accent w-fit">Mentor portal · no login needed</span>
        <h1 className="font-display text-3xl font-semibold">Call with {student?.name}</h1>
        <p className="text-muted">You are {m?.name}. <LocalTime iso={b.slot_start} /> · {b.duration_min} min</p>
        {b.status === "cancelled" && <span className="badge badge-bad w-fit">Cancelled by the student</span>}
        {b.status === "no_show_mentor" && <span className="badge badge-warn w-fit">Student reported you didn&apos;t attend</span>}
      </header>

      <section className="card p-5 grid gap-1">
        <span className="label">What the student told us</span>
        <p className="text-sm whitespace-pre-wrap">{b.brief || "No brief was generated."}</p>
      </section>

      <section className="card p-5">
        <MentorActions token={token} meetingUrl={b.meeting_url} active={active} canMark={active && past} />
      </section>

      {b.status !== "cancelled" && past && !s && (
        <section className="card p-5 grid gap-3">
          <h2 className="font-display text-xl font-semibold">Send the student a write-up</h2>
          <p className="text-sm text-muted">Paste the transcript or your notes. We draft a summary, action items and next steps - you review it before the student sees it.</p>
          <TranscriptForm endpoint={`/api/mentor/${token}`} mentorMode />
        </section>
      )}

      {s?.status === "draft" && (
        <section className="card p-5 grid gap-3">
          <h2 className="font-display text-xl font-semibold">Review the draft</h2>
          <p className="text-sm text-muted">Fix or remove anything that doesn&apos;t reflect what you said. If you do nothing, it goes to the student automatically on <LocalTime iso={new Date(new Date(s.created_at).getTime() + REVIEW_WINDOW_MS).toISOString()} mode="date" />, marked as not reviewed.</p>
          <ReviewEditor token={token} initial={s.content} />
        </section>
      )}
      {s && s.status !== "draft" && <section className="card p-5"><p className="text-sm">✓ The write-up has been sent to the student ({s.status === "approved" ? "approved by you" : "released automatically"}). Thank you!</p></section>}
    </div>
  );
}
