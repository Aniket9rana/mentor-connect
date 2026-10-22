import { json, fail } from "@/lib/http";
import { getMentor } from "@/lib/mentors";
import { openSlots } from "@/lib/slots";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await getMentor((await ctx.params).id.toUpperCase());
  if (!m) return fail("Mentor not found", 404);
  return json({ ok: true, slots: await openSlots(m) });
}
