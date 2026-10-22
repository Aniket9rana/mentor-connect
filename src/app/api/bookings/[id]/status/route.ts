import { z } from "zod";
import { getBooking, markStatus } from "@/lib/booking";
import { body, fail, json, studentOr401 } from "@/lib/http";

// A student can only report what they know: that the mentor didn't show up.
const In = z.object({ status: z.literal("no_show_mentor") });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const b = await getBooking((await ctx.params).id);
  if (!b || b.student_id !== s.id) return fail("Not found", 404);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Invalid status.");
  const r = await markStatus(b, p.data.status, "student");
  return r.ok ? json({ ok: true }) : fail(r.message ?? "Couldn't update", 409);
}
