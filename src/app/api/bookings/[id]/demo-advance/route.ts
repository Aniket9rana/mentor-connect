import { getBooking } from "@/lib/booking";
import { run, now } from "@/lib/db";
import { fail, json, studentOr401 } from "@/lib/http";

// Prototype-only: lets a reviewer skip waiting for a real call. Disable with DEMO_TOOLS=off.
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (process.env.DEMO_TOOLS === "off") return fail("Not available.", 404);
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const b = await getBooking((await ctx.params).id);
  if (!b || b.student_id !== s.id || b.status !== "confirmed") return fail("Not found", 404);
  await run("UPDATE bookings SET slot_start = ?, updated_at = ? WHERE id = ?", [new Date(Date.now() - 30 * 60_000).toISOString(), now(), b.id]);
  return json({ ok: true });
}
