import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { all } from "@/lib/db";
import { getMentor } from "@/lib/mentors";
import { autoReleaseDue } from "@/lib/summarise";
import { studentBookings } from "@/lib/booking";
import { ActionList, type ActionItem } from "@/components/ActionList";
import { LocalTime } from "@/components/LocalTime";

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 grid gap-8">
      <header className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your journey</h1>
          <p className="text-muted">Everything from your calls, in one place.</p>
        </div>
        <Link className="btn btn-primary ml-auto" href="/chat?new=1">Start a new topic</Link>
      </header>

      <section className="grid grid-cols-3 gap-3">
        {[
          { k: "Calls completed", v: callsDone },
          { k: "Action items done", v: `${items.filter((i) => i.done).length}/${items.length}` },
          { k: "Upcoming calls", v: upcoming.length },
        ].map((x) => (
          <div key={x.k} className="card p-4"><div className="font-display text-3xl font-semibold">{x.v}</div><div className="text-xs text-muted">{x.k}</div></div>
        ))}
      </section>

      {latestNext && (
        <section className="card p-5 grid gap-1 border-accent">
          <span className="label">Suggested next step</span>
          <p>{latestNext.text}</p>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-display text-xl font-semibold">Coming up</h2>
          {upcoming.map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="card p-4 flex items-center gap-3 hover:bg-surface2">
              <div><div className="font-semibold">{names.get(b.mentor_id)}</div><div className="text-sm text-muted"><LocalTime iso={b.slot_start} /></div></div>
              <span className="ml-auto text-sm underline">Details</span>
            </Link>
          ))}
        </section>
      )}

      {open.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-display text-xl font-semibold">Still to do</h2>
          <ActionList items={open.map((i) => ({ ...i, call: names.get(bookings.find((b) => b.id === i.booking_id)?.mentor_id ?? "") }))} showCall />
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold">Past calls</h2>
        {history.length === 0 && <p className="text-sm text-muted">Nothing yet. Once you&apos;ve had a call, its write-up and action items show up here, and the assistant uses them to suggest your next step.</p>}
        {history.map((b) => {
          const s = sum.get(b.id);
          return (
            <Link key={b.id} href={s && s.status !== "draft" ? `/summary/${b.id}` : `/bookings/${b.id}`} className="card p-4 grid gap-1 hover:bg-surface2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{names.get(b.mentor_id)}</span>
                <span className="text-sm text-muted"><LocalTime iso={b.slot_start} mode="date" /></span>
                {b.status === "no_show_mentor" && <span className="badge badge-warn">Mentor didn&apos;t attend</span>}
                {b.status === "no_show_student" && <span className="badge badge-warn">Missed</span>}
                {s?.status === "draft" && <span className="badge badge-warn">Write-up in review</span>}
                {!s && (b.status === "completed" || b.status === "confirmed") && <span className="badge">Add notes to get your write-up</span>}
              </div>
              {s && s.status !== "draft" && <p className="text-sm text-muted">{s.c.headline}</p>}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
