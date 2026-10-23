import { z } from "zod";
import { createBooking } from "@/lib/booking";
import { body, fail, json, limited, studentOr401 } from "@/lib/http";

export const maxDuration = 60;
const In = z.object({ mentorId: z.string(), slotStart: z.string().datetime(), conversationId: z.string().nullish(), rescheduleOf: z.string().nullish() });

export async function POST(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "book", 15)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Please pick a time slot.");
  const r = await createBooking({ student: s, mentorId: p.data.mentorId.toUpperCase(), slotStart: p.data.slotStart, conversationId: p.data.conversationId, rescheduleOf: p.data.rescheduleOf });
  if (!r.ok) return fail(r.message, r.code === "conflict" || r.code === "student_busy" ? 409 : 400, { code: r.code, slots: r.slots });
  return json({ ok: true, bookingId: r.booking.id });
}
