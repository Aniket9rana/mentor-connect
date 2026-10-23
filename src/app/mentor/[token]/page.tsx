import { notFound } from "next/navigation";
import { bookingByToken, mentorLinkExpired } from "@/lib/booking";
import { nowMs } from "@/lib/clock";
import { availabilityFor } from "@/lib/slots";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { getMentor } from "@/lib/mentors";
import { one } from "@/lib/db";
import { getSummary, REVIEW_WINDOW_MS } from "@/lib/summarise";
import { LocalTime } from "@/components/LocalTime";
import { MentorActions } from "@/components/MentorActions";
import { TranscriptForm } from "@/components/TranscriptForm";
import { ReviewEditor } from "@/components/ReviewEditor";
import { Avatar } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { Callout, SectionTitle } from "@/components/PageBits";

export const metadata = { title: "Mentor portal", robots: { index: false } };

export default async function MentorPortal({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const b = await bookingByToken(token);
  if (!b) notFound();
  if (mentorLinkExpired(b))
    return (
      <div className="mx-auto max-w-md px-4 py-16 grid gap-3 text-center">
        <h1 className="font-display text-4xl">This link has expired</h1>
        <p className="text-muted text-sm leading-relaxed">Mentor links work for 30 days after the call. Ask the Mesa team to send you a fresh one.</p>
      </div>
    );
  const m = await getMentor(b.mentor_id);
  const av = m ? await availabilityFor(m) : null;
  const student = await one<{ name: string }>("SELECT name FROM students WHERE id = ?", [b.student_id]);
  const s = await getSummary(b.id);
  const past = new Date(b.slot_start).getTime() <= nowMs();
  const active = b.status === "confirmed";

  return (
    <div className="relative isolate">
      <div className="aurora !opacity-40" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10 grid gap-6">
        <header className="grid gap-4">
          <span className="badge badge-accent w-fit"><Icon name="lock" size={11} /> Mentor portal · no login needed</span>
          <div className="flex items-start gap-4">
            <Avatar name={student?.name ?? "Student"} size={60} />
            <div className="grid gap-1.5 min-w-0">
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">Call with {student?.name}</h1>
              <p className="text-muted flex items-center gap-x-3 gap-y-1 flex-wrap text-sm">
                <span>You are {m?.name}</span>
                <span className="inline-flex items-center gap-1"><Icon name="calendar" size={13} /> <LocalTime iso={b.slot_start} /></span>
                <span className="inline-flex items-center gap-1"><Icon name="clock" size={13} /> {b.duration_min} min</span>
              </p>
              {b.status === "cancelled" && <span className="badge badge-bad w-fit">Cancelled by the student</span>}
              {b.status === "no_show_mentor" && <span className="badge badge-warn w-fit">Student reported you didn&apos;t attend</span>}
            </div>
          </div>
        </header>

        <section className="card p-5 sm:p-6 grid gap-2.5">
          <SectionTitle icon="file-text">What the student told us</SectionTitle>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-fg2 border-l-2 border-brand pl-4">{b.brief || "No brief was generated."}</p>
        </section>

        <section className="card p-5 sm:p-6">
          <MentorActions token={token} meetingUrl={b.meeting_url} active={active} canMark={active && past} />
        </section>

        {b.status !== "cancelled" && past && !s && (
          <section className="card p-5 sm:p-6 grid gap-4">
            <SectionTitle icon="sparkles">Send the student a write-up</SectionTitle>
            <p className="text-sm text-muted leading-relaxed">Paste the transcript or your notes. We draft a summary, action items and next steps. You review it before the student sees it.</p>
            <TranscriptForm endpoint={`/api/mentor/${token}`} mentorMode />
          </section>
        )}

        {s?.status === "draft" && (
          <section className="card p-5 sm:p-6 grid gap-4">
            <SectionTitle icon="shield-check">Review the draft</SectionTitle>
            <p className="text-sm text-muted leading-relaxed">Fix or remove anything that doesn&apos;t reflect what you said. If you do nothing, it goes to the student automatically on <LocalTime iso={new Date(new Date(s.created_at).getTime() + REVIEW_WINDOW_MS).toISOString()} mode="date" />, marked as not reviewed.</p>
            <ReviewEditor token={token} initial={s.content} />
          </section>
        )}
        {m && av && (
          <section className="card p-5 sm:p-6 grid gap-4">
            <SectionTitle icon="calendar">Your availability</SectionTitle>
            <p className="text-sm text-muted leading-relaxed">
              Pick the hours students can book you ({m.city ? `${m.city} time` : "your local time"}). {av.custom ? "These are your hours." : "Right now we show a placeholder pattern until you set yours."} Calls already booked stay as they are.
            </p>
            <AvailabilityEditor token={token} initial={{ weekly: av.weekly, blackout: av.blackout }} />
          </section>
        )}
        {s && s.status !== "draft" && <Callout tone="ok" icon="check-circle">The write-up has been sent to the student ({s.status === "approved" ? "approved by you" : "released automatically"}). Thank you!</Callout>}
      </div>
    </div>
  );
}
