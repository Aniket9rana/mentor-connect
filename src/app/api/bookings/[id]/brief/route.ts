import { z } from "zod";
import { getBooking } from "@/lib/booking";
import { run, now } from "@/lib/db";
import { body, fail, json, limited, studentOr401 } from "@/lib/http";

const In = z.object({ brief: z.string().trim().min(1, "The brief can't be empty.").max(1500, "Keep it under 1,500 characters.") });

/** The student can correct what their mentor will read, up to the start of the call. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "brief", 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const b = await getBooking((await ctx.params).id);
  if (!b || b.student_id !== s.id) return fail("Not found.", 404);
  if (b.status !== "confirmed" || new Date(b.slot_start).getTime() <= Date.now()) return fail("This brief can no longer be changed.", 409);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid brief.");
  await run("UPDATE bookings SET brief = ?, updated_at = ? WHERE id = ?", [p.data.brief, now(), b.id]);
  return json({ ok: true });
}
