import { z } from "zod";
import { one, run, now } from "@/lib/db";
import { track } from "@/lib/events";
import { body, fail, json, studentOr401 } from "@/lib/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const p = z.object({ done: z.boolean() }).safeParse(await body(req));
  if (!p.success) return fail("Invalid request.");
  const id = (await ctx.params).id;
  const item = await one<{ booking_id: string }>("SELECT booking_id FROM action_items WHERE id = ? AND student_id = ?", [id, s.id]);
  if (!item) return fail("Not found", 404);
  await run("UPDATE action_items SET done = ?, done_at = ? WHERE id = ?", [p.data.done ? 1 : 0, p.data.done ? now() : null, id]);
  if (p.data.done) await track("action_item_done", { studentId: s.id, bookingId: item.booking_id });
  return json({ ok: true });
}
