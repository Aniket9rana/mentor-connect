import Link from "next/link";
import { notFound } from "next/navigation";
import { getMentor, headline, mentorFacts } from "@/lib/mentors";
import { openSlots } from "@/lib/slots";
import { currentStudent } from "@/lib/session";
import { getBooking } from "@/lib/booking";
import { track } from "@/lib/events";
import { SlotPicker } from "@/components/SlotPicker";
import { StartForm } from "@/components/StartForm";

export default async function MentorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string; reschedule?: string }> }) {
  const m = await getMentor((await params).id.toUpperCase());
  if (!m) notFound();
  const sp = await searchParams;
  const student = await currentStudent();
  const old = student && sp.reschedule ? await getBooking(sp.reschedule) : undefined;
  const rescheduleOf = old && old.student_id === student?.id && old.status === "confirmed" ? old.id : undefined;
  if (student) await track("mentor_viewed", { studentId: student.id, conversationId: sp.c }, { mentor: m.id });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 md:grid-cols-[1fr_1fr] items-start">
      <section className="grid gap-4">
        <Link href={sp.c ? `/chat?c=${sp.c}` : "/chat"} className="text-sm text-muted underline w-fit">← Back to chat</Link>
        <div>
          <h1 className="font-display text-3xl font-semibold">{m.name}</h1>
          <p className="text-muted">{headline(m)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {m.mentorshipQuality && <span className="badge badge-ok">Mentorship rated {m.mentorshipQuality}</span>}
          {m.profile === "thin" && <span className="badge badge-warn">Limited details on file</span>}
        </div>
        <dl className="card p-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {mentorFacts(m).map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-muted">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        {m.missing.length > 0 && (
          <p className="text-xs text-muted">Not provided on this profile: {m.missing.join(", ")}. We don&apos;t guess at missing details; you can ask the mentor on the call.</p>
        )}
      </section>

      <section className="card p-5 grid gap-4">
        <h2 className="font-display text-xl font-semibold">{rescheduleOf ? "Pick a new time" : "Book a 30-minute call"}</h2>
        {student ? (
          <SlotPicker mentorId={m.id} initialSlots={await openSlots(m)} conversationId={sp.c} rescheduleOf={rescheduleOf} />
        ) : (
          <>
            <p className="text-sm text-muted">Tell us who you are first, then you can pick a time.</p>
            <StartForm />
          </>
        )}
      </section>
    </div>
  );
}
