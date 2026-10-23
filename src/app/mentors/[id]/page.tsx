import { notFound } from "next/navigation";
import { getMentor, headline, mentorFacts } from "@/lib/mentors";
import { openSlots } from "@/lib/slots";
import { currentStudent } from "@/lib/session";
import { getBooking } from "@/lib/booking";
import { track } from "@/lib/events";
import { shortlistIds } from "@/lib/shortlist";
import { ShortlistButton } from "@/components/ShortlistButton";
import { SlotPicker } from "@/components/SlotPicker";
import { StartForm } from "@/components/StartForm";
import { Avatar } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { BackLink, Callout } from "@/components/PageBits";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMentor((await params).id.toUpperCase());
  return { title: m ? m.name : "Mentor" };
}

export default async function MentorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string; reschedule?: string }> }) {
  const m = await getMentor((await params).id.toUpperCase());
  if (!m) notFound();
  const sp = await searchParams;
  const student = await currentStudent();
  const old = student && sp.reschedule ? await getBooking(sp.reschedule) : undefined;
  const rescheduleOf = old && old.student_id === student?.id && old.status === "confirmed" ? old.id : undefined;
  const saved = student ? (await shortlistIds(student.id)).includes(m.id) : false;
  if (student) await track("mentor_viewed", { studentId: student.id, conversationId: sp.c }, { mentor: m.id });

  return (
    <div className="relative isolate">
      <div className="aurora !opacity-50" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 grid gap-8">
        <BackLink href={sp.c ? `/chat?c=${sp.c}` : "/chat"}>Back to your matches</BackLink>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] items-start">
          <section className="grid gap-6">
            <div className="flex items-start gap-5">
              <Avatar name={m.name} seed={m.id} size={84} />
              <div className="grid gap-2 min-w-0 pt-1">
                <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">{m.name}</h1>
                <p className="text-muted leading-relaxed">{headline(m)}</p>
                <div className="flex gap-2 flex-wrap pt-1 items-center">
                  {student && <ShortlistButton mentorId={m.id} saved={saved} compact />}
                  {m.mentorshipQuality && <span className="badge badge-ok"><Icon name="star" size={11} /> Mentorship rated {m.mentorshipQuality}</span>}
                  {m.profile === "thin" && <span className="badge badge-warn"><Icon name="alert" size={11} /> Limited details on file</span>}
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-line bg-surface2/60 flex items-center gap-2"><Icon name="user" size={14} className="text-muted" /><span className="label">Profile on file</span></div>
              <dl className="divide-y divide-line">
                {mentorFacts(m).map((f) => (
                  <div key={f.label} className="grid sm:grid-cols-[10rem_1fr] gap-x-6 gap-y-0.5 px-5 py-3 text-sm">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="text-fg2 leading-relaxed">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {m.missing.length > 0 && (
              <Callout icon="shield-check">
                Not provided on this profile: {m.missing.join(", ")}. We don&apos;t guess at missing details; you can ask the mentor on the call.
              </Callout>
            )}
          </section>

          <section className="card-glow p-5 sm:p-6 grid gap-5 lg:sticky lg:top-24" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="grid gap-1">
              <span className="label">{rescheduleOf ? "Reschedule" : "Book a call"}</span>
              <h2 className="text-xl font-semibold tracking-tight">{rescheduleOf ? "Pick a new time" : `A 30-minute call with ${m.name}`}</h2>
            </div>
            {student ? (
              <SlotPicker mentorId={m.id} initialSlots={await openSlots(m)} conversationId={sp.c} rescheduleOf={rescheduleOf} />
            ) : (
              <>
                <p className="text-sm text-muted">Tell us who you are first, then you can pick a time.</p>
                <StartForm compact />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
