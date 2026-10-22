import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { CANCEL_CUTOFF_MS, getBooking } from "@/lib/booking";
import { getMentor, headline } from "@/lib/mentors";
import { getSummary, REVIEW_WINDOW_MS } from "@/lib/summarise";
import { googleCalendarUrl } from "@/lib/ics";
import { appUrl } from "@/lib/email";
import { LocalTime } from "@/components/LocalTime";
import { BookingActions } from "@/components/BookingActions";
import { TranscriptForm } from "@/components/TranscriptForm";

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "badge-ok" }, completed: { label: "Completed", cls: "badge-accent" },
  cancelled: { label: "Cancelled", cls: "badge-bad" }, no_show_student: { label: "Marked: you didn't attend", cls: "badge-warn" },
  no_show_mentor: { label: "Mentor didn't attend", cls: "badge-warn" },
};

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await currentStudent();
  if (!student) redirect("/");
  const b = await getBooking((await params).id);
  if (!b || b.student_id !== student.id) notFound();
  const m = await getMentor(b.mentor_id);
  const summary = await getSummary(b.id);
  const start = new Date(b.slot_start).getTime();
  const past = start <= Date.now();
  const canChange = b.status === "confirmed" && start - Date.now() > CANCEL_CUTOFF_MS;
  const st = STATUS[b.status];
  const gcal = googleCalendarUrl({ start: b.slot_start, minutes: b.duration_min, title: `Mentor call: ${m?.name} (Mentor Connect)`, description: `Details: ${appUrl()}/bookings/${b.id}`, url: b.meeting_url });
  const reviewBy = summary ? new Date(new Date(summary.created_at).getTime() + REVIEW_WINDOW_MS).toISOString() : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 grid gap-6">
      <Link href="/journey" className="text-sm text-muted underline w-fit">← My journey</Link>
      <div className="grid gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-3xl font-semibold">Call with {m?.name}</h1>
          <span className={`badge ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-muted">{m ? headline(m) : ""}</p>
      </div>

      <section className="card p-5 grid gap-3">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><span className="label">When</span><p className="text-lg font-semibold"><LocalTime iso={b.slot_start} /></p><p className="text-sm text-muted">{b.duration_min} minutes</p></div>
          <div>
            <span className="label">Meeting link</span>
            {b.meeting_url ? <p><a className="underline break-all" href={b.meeting_url} target="_blank" rel="noopener noreferrer">{b.meeting_url}</a></p> : <p className="text-sm text-muted">Your mentor will add the link here, and we&apos;ll email it to you. The call itself happens on their video tool.</p>}
          </div>
        </div>
        {b.status === "confirmed" && (
          <div className="flex gap-2 flex-wrap pt-2 border-t border-line">
            <a className="btn" href={gcal} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
            <a className="btn" href={`/api/bookings/${b.id}/ics`}>Download .ics (Apple / Outlook)</a>
            {canChange && <Link className="btn" href={`/mentors/${b.mentor_id}?reschedule=${b.id}`}>Reschedule</Link>}
          </div>
        )}
        <BookingActions id={b.id} canChange={canChange} canReport={past && b.status === "confirmed"} demoAdvance={!past && b.status === "confirmed" && process.env.DEMO_TOOLS !== "off"} />
        {b.status === "confirmed" && !canChange && !past && <p className="text-xs text-muted">Changes close 2 hours before the call. If something comes up, message your mentor via the meeting link.</p>}
      </section>

      {b.brief && (
        <section className="card p-5 grid gap-1">
          <span className="label">What your mentor will see (pre-call brief)</span>
          <p className="text-sm whitespace-pre-wrap">{b.brief}</p>
          <p className="text-xs text-muted">Generated from your chat, using only what you said.</p>
        </section>
      )}

      {b.status === "no_show_mentor" && (
        <section className="card p-5 grid gap-2"><p>Sorry the call didn&apos;t happen. We&apos;ve let the Mesa team know and sent you a link to rebook.</p><Link className="btn btn-primary w-fit" href={`/mentors/${b.mentor_id}`}>Pick a new time</Link></section>
      )}

      {(b.status === "confirmed" || b.status === "completed") && past && (
        <section className="card p-5 grid gap-3">
          <h2 className="font-display text-xl font-semibold">After your call</h2>
          {!summary && (
            <>
              <p className="text-sm text-muted">Add the transcript or notes from the call (or your own recap) and we&apos;ll turn it into a clear plan. Your mentor can also add it from their side.</p>
              <TranscriptForm endpoint={`/api/bookings/${b.id}/transcript`} />
            </>
          )}
          {summary?.status === "draft" && (
            <p className="text-sm">Your write-up is drafted and with your mentor for a quick review. It will reach you when they approve it, or automatically by <strong><LocalTime iso={reviewBy!} mode="date" /></strong> (marked as not reviewed).</p>
          )}
          {summary && summary.status !== "draft" && (
            <div className="flex gap-2 items-center"><Link className="btn btn-primary" href={`/summary/${b.id}`}>Open your write-up →</Link></div>
          )}
        </section>
      )}
    </div>
  );
}
