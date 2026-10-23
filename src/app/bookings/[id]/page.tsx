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
import { Avatar } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { BackLink, Callout, SectionTitle } from "@/components/PageBits";

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
    <div className="relative isolate">
      <div className="aurora !opacity-40" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10 grid gap-6">
        <BackLink href="/journey">My journey</BackLink>

        <header className="flex items-start gap-4">
          <Avatar name={m?.name ?? "Mentor"} seed={b.mentor_id} size={64} />
          <div className="grid gap-1.5 min-w-0">
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">Call with {m?.name}</h1>
              <span className={`badge ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-muted">{m ? headline(m) : ""}</p>
          </div>
        </header>

        <section className="card-glow overflow-hidden" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="grid sm:grid-cols-[auto_1fr]">
            <div className="p-6 sm:p-7 sm:border-r border-b sm:border-b-0 border-line bg-accentsoft/50 grid content-center justify-items-start sm:justify-items-center gap-0.5 sm:min-w-[9.5rem]">
              <span className="label !text-accentink"><LocalTime iso={b.slot_start} mode="mon" /></span>
              <span className="font-display text-6xl leading-none"><LocalTime iso={b.slot_start} mode="day" /></span>
              <span className="text-sm font-semibold mt-1"><LocalTime iso={b.slot_start} mode="clock" /></span>
              <span className="text-xs text-muted">{b.duration_min} minutes</span>
            </div>
            <div className="p-6 sm:p-7 grid gap-4 content-center">
              <div className="grid gap-1">
                <span className="label">When</span>
                <p className="font-semibold tracking-tight"><LocalTime iso={b.slot_start} /></p>
              </div>
              <div className="grid gap-1">
                <span className="label">Meeting link</span>
                {b.meeting_url ? (
                  <a className="inline-flex items-center gap-1.5 text-accentink font-medium break-all hover:underline" href={b.meeting_url} target="_blank" rel="noopener noreferrer"><Icon name="video" size={15} /> {b.meeting_url}</a>
                ) : (
                  <p className="text-sm text-muted leading-relaxed">Your mentor will add the link here, and we&apos;ll email it to you. The call itself happens on their video tool.</p>
                )}
              </div>
            </div>
          </div>
          {b.status === "confirmed" && (
            <div className="px-6 sm:px-7 py-4 border-t border-line bg-surface2/40 grid gap-3">
              <div className="flex gap-2 flex-wrap">
                <a className="btn btn-sm" href={gcal} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={14} /> Add to Google Calendar</a>
                <a className="btn btn-sm" href={`/api/bookings/${b.id}/ics`}><Icon name="download" size={14} /> Download .ics (Apple / Outlook)</a>
                {canChange && <Link className="btn btn-sm" href={`/mentors/${b.mentor_id}?reschedule=${b.id}`}><Icon name="refresh" size={14} /> Reschedule</Link>}
              </div>
              <BookingActions id={b.id} canChange={canChange} canReport={past} demoAdvance={!past && process.env.DEMO_TOOLS !== "off"} />
              {!canChange && !past && <p className="text-xs text-muted">Changes close 2 hours before the call. If something comes up, message your mentor via the meeting link.</p>}
            </div>
          )}
        </section>

        {b.brief && (
          <section className="card p-5 sm:p-6 grid gap-2.5">
            <SectionTitle icon="file-text">What your mentor will see</SectionTitle>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-fg2 border-l-2 border-brand pl-4">{b.brief}</p>
            <p className="text-xs text-muted">A pre-call brief, generated from your chat using only what you said.</p>
          </section>
        )}

        {b.status === "no_show_mentor" && (
          <section className="card p-5 sm:p-6 grid gap-3 justify-items-start">
            <Callout tone="warn" icon="alert">Sorry the call didn&apos;t happen. We&apos;ve let the Mesa team know and sent you a link to rebook.</Callout>
            <Link className="btn btn-primary" href={`/mentors/${b.mentor_id}`}>Pick a new time <Icon name="arrow-right" size={15} /></Link>
          </section>
        )}

        {(b.status === "confirmed" || b.status === "completed") && past && (
          <section className="card p-5 sm:p-6 grid gap-4">
            <SectionTitle icon="sparkles">After your call</SectionTitle>
            {!summary && (
              <>
                <p className="text-sm text-muted leading-relaxed">Add the transcript or notes from the call (or your own recap) and we&apos;ll turn it into a clear plan. Your mentor can also add it from their side.</p>
                <TranscriptForm endpoint={`/api/bookings/${b.id}/transcript`} />
              </>
            )}
            {summary?.status === "draft" && (
              <Callout tone="info" icon="clock">Your write-up is drafted and with your mentor for a quick review. It will reach you when they approve it, or automatically by <strong><LocalTime iso={reviewBy!} mode="date" /></strong> (marked as not reviewed).</Callout>
            )}
            {summary && summary.status !== "draft" && (
              <div><Link className="btn btn-primary" href={`/summary/${b.id}`}>Open your write-up <Icon name="arrow-right" size={15} /></Link></div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
