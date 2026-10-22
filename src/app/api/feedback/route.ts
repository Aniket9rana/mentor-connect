import { z } from "zod";
import { getBooking } from "@/lib/booking";
import { run, now } from "@/lib/db";
import { track } from "@/lib/events";
import { body, fail, json, studentOr401 } from "@/lib/http";

const In = z.object({ bookingId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() });

export async function POST(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Pick a rating from 1 to 5.");
  const b = await getBooking(p.data.bookingId);
  if (!b || b.student_id !== s.id) return fail("Not found", 404);
  await run(
    "INSERT INTO feedback (booking_id, student_id, rating, comment, created_at) VALUES (?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment",
    [b.id, s.id, p.data.rating, p.data.comment ?? null, now()],
  );
  await track("feedback", { studentId: s.id, bookingId: b.id }, { rating: p.data.rating });
  return json({ ok: true });
}
