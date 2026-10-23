import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { all } from "@/lib/db";
import { getMentor } from "@/lib/mentors";
import { autoReleaseDue } from "@/lib/summarise";
import { studentBookings } from "@/lib/booking";
import { ActionList, type ActionItem } from "@/components/ActionList";
import { LocalTime } from "@/components/LocalTime";
import { Avatar } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { PageHeader, SectionTitle } from "@/components/PageBits";

export const metadata = { title: "My journey" };

export default async function Journey() {
  const student = await currentStudent();
  if (!student) redirect("/");
  await autoReleaseDue();
  const bookings = await studentBookings(student.id);
  const summaries = await all<{ booking_id: string; content: string; status: string }>(
    "SELECT s.booking_id, s.content, s.status FROM summaries s JOIN bookings b ON b.id = s.booking_id WHERE b.student_id = ?", [student.id]);
  const sum = new Map(summaries.map((s) => [s.booking_id, { ...s, c: JSON.parse(s.content) }]));
  const items = await all<ActionItem & { booking_id: string }>("SELECT id, text, due_at, done, booking_id FROM action_items WHERE student_id = ? ORDER BY done, due_at", [student.id]);
  const names = new Map<string, string>();
  for (const b of bookings) names.set(b.mentor_id, (await getMentor(b.mentor_id))?.name ?? b.mentor_id);

  const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.slot_start).getTime() > Date.now()).reverse();
  const history = bookings.filter((b) => !upcoming.includes(b) && b.status !== "cancelled");
  const open = items.filter((i) => !i.done);
  const callsDone = history.filter((b) => b.status === "completed").length;
  const latestNext = history.map((b) => sum.get(b.id)).find((s) => s && s.status !== "draft")?.c.next_step as { text: string } | undefined;
  const doneItems = items.filter((i) => i.done).length;

  const stats = [
    { k: "Calls completed", v: callsDone, icon: "check-circle" },
    { k: "Action items done", v: `${doneItems}/${items.length}`, icon: "list-checks" },
    { k: "Upcoming calls", v: upcoming.length, icon: "calendar" },
  ];

  return (
    <div className="relative isolate">
      <div className="aurora !opacity-50" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10 grid gap-10">
        <PageHeader
          eyebrow={`Hi ${student.name.split(" ")[0]}`}
          title={<>Your <span className="it text-gradient pr-1">journey</span></>}
          sub="Everything from your calls, in one place."
          actions={<Link className="btn btn-primary" href="/chat?new=1"><Icon name="plus" size={15} /> Start a new topic</Link>}
        />

        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map((x) => (
            <div key={x.k} className="card p-4 sm:p-5 grid gap-3">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-accentsoft text-accentink"><Icon name={x.icon} size={16} /></span>
              <div>
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums leading-none">{x.v}</div>
                <div className="text-xs sm:text-[0.8rem] text-muted mt-1.5">{x.k}</div>
              </div>
            </div>
          ))}
        </section>

        {latestNext && (
          <section className="card-glow p-5 sm:p-6 flex gap-4 items-start">
            <span className="orb h-9 w-9 shrink-0" aria-hidden />
            <div className="grid gap-1">
              <span className="label !text-accentink">Suggested next step</span>
              <p className="leading-relaxed">{latestNext.text}</p>
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle icon="calendar">Coming up</SectionTitle>
            <div className="grid gap-3">
              {upcoming.map((b) => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="card card-lift p-4 flex items-center gap-4 group">
                  <div className="grid place-items-center w-14 h-14 rounded-xl bg-accentsoft text-accentink shrink-0 leading-none">
                    <span className="label !text-accentink !text-[0.6rem]"><LocalTime iso={b.slot_start} mode="mon" /></span>
                    <span className="text-xl font-semibold tabular-nums"><LocalTime iso={b.slot_start} mode="day" /></span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold tracking-tight truncate">{names.get(b.mentor_id)}</div>
                    <div className="text-sm text-muted"><LocalTime iso={b.slot_start} /></div>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 text-sm text-muted group-hover:text-fg transition-colors">Details <Icon name="chevron-right" size={15} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {open.length > 0 && (
          <section className="grid gap-4">
            <SectionTitle icon="list-checks" aside={`${open.length} open`}>Still to do</SectionTitle>
            <ActionList items={open.map((i) => ({ ...i, call: names.get(bookings.find((b) => b.id === i.booking_id)?.mentor_id ?? "") }))} showCall />
          </section>
        )}

        <section className="grid gap-4">
          <SectionTitle icon="file-text">Past calls</SectionTitle>
          {history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line2 p-8 text-center grid gap-2 justify-items-center">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-surface2 text-muted"><Icon name="inbox" size={18} /></span>
              <p className="font-medium">Nothing here yet</p>
              <p className="text-sm text-muted max-w-sm leading-relaxed">Once you&apos;ve had a call, its write-up and action items show up here, and the assistant uses them to suggest your next step.</p>
              <Link className="btn btn-sm mt-1" href="/chat">Find a mentor</Link>
            </div>
          )}
          <div className="grid gap-3">
            {history.map((b) => {
              const s = sum.get(b.id);
              return (
                <Link key={b.id} href={s && s.status !== "draft" ? `/summary/${b.id}` : `/bookings/${b.id}`} className="card card-lift p-4 flex items-start gap-4 group">
                  <Avatar name={names.get(b.mentor_id) ?? "Mentor"} seed={b.mentor_id} size={42} />
                  <div className="grid gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold tracking-tight">{names.get(b.mentor_id)}</span>
                      <span className="text-sm text-muted"><LocalTime iso={b.slot_start} mode="date" /></span>
                      {b.status === "no_show_mentor" && <span className="badge badge-warn">Mentor didn&apos;t attend</span>}
                      {b.status === "no_show_student" && <span className="badge badge-warn">Missed</span>}
                      {s?.status === "draft" && <span className="badge badge-warn"><Icon name="clock" size={11} /> Write-up in review</span>}
                      {!s && (b.status === "completed" || b.status === "confirmed") && <span className="badge">Add notes to get your write-up</span>}
                    </div>
                    {s && s.status !== "draft" && <p className="text-sm text-muted leading-relaxed">{s.c.headline}</p>}
                  </div>
                  <Icon name="chevron-right" size={16} className="ml-auto mt-3 text-muted group-hover:text-fg transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
