import { cancelBooking, getBooking } from "@/lib/booking";
import { fail, json, studentOr401 } from "@/lib/http";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const b = await getBooking((await ctx.params).id);
  if (!b || b.student_id !== s.id) return fail("Not found", 404);
  const r = await cancelBooking(b, s);
  return r.ok ? json({ ok: true }) : fail(r.message ?? "Couldn't cancel", 409);
}
