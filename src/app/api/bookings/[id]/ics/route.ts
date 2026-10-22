import { getBooking } from "@/lib/booking";
import { icsFor } from "@/lib/ics";
import { getMentor } from "@/lib/mentors";
import { fail, studentOr401 } from "@/lib/http";
import { appUrl } from "@/lib/email";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const b = await getBooking((await ctx.params).id);
  if (!b || b.student_id !== s.id) return fail("Not found", 404);
  const m = await getMentor(b.mentor_id);
  const ics = icsFor({
    id: b.id, start: b.slot_start, minutes: b.duration_min, title: `Mentor call: ${m?.name ?? "Mentor"} (Mentor Connect)`,
    description: `Booking details: ${appUrl()}/bookings/${b.id}\n\n${b.brief ?? ""}`, url: b.meeting_url,
  });
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="mentor-call-${b.id}.ics"` } });
}
