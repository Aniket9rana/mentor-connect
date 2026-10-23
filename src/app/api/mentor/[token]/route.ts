import { z } from "zod";
import { bookingByToken, markStatus, mentorLinkExpired } from "@/lib/booking";
import { getMentor } from "@/lib/mentors";
import { saveAvailability } from "@/lib/slots";
import { run, now } from "@/lib/db";
import { body, fail, json, limited } from "@/lib/http";
import { getSummary, groundSummary, releaseSummary, submitTranscript, SummarySchema, TRANSCRIPT_MAX } from "@/lib/summarise";

export const maxDuration = 120;
const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("meeting_url"), url: z.string().url().max(300).refine((u) => u.startsWith("https://"), "Use an https:// link") }),
  z.object({ action: z.literal("status"), status: z.enum(["completed", "no_show_student"]) }),
  z.object({ action: z.literal("transcript"), text: z.string().min(1) }),
  z.object({ action: z.literal("approve"), edited: SummarySchema.optional() }),
  z.object({ action: z.literal("availability"), weekly: z.record(z.string(), z.array(z.number())), blackout: z.array(z.string()).max(60) }),
]);

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (await limited(req, "mentor", 30)) return fail("Too many attempts. Please wait a minute.", 429);
  const b = await bookingByToken((await ctx.params).token);
  if (!b) return fail("This link isn't valid.", 404);
  if (mentorLinkExpired(b)) return fail("This link has expired. Ask the Mesa team for a new one.", 410);
  const p = Action.safeParse(await body(req));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid request.");
  const a = p.data;

  if (a.action === "availability") {
    const m = await getMentor(b.mentor_id);
    if (!m) return fail("Mentor not found.", 404);
    const err = await saveAvailability(m.id, { weekly: a.weekly, blackout: a.blackout });
    return err ? fail(err) : json({ ok: true });
  }
  if (a.action === "meeting_url") {
    if (b.status !== "confirmed") return fail("This booking is no longer active.", 409);
    await run("UPDATE bookings SET meeting_url = ?, updated_at = ? WHERE id = ?", [a.url, now(), b.id]);
    return json({ ok: true });
  }
  if (a.action === "status") {
    const r = await markStatus(b, a.status, "mentor");
    return r.ok ? json({ ok: true }) : fail(r.message ?? "Couldn't update", 409);
  }
  if (a.action === "transcript") {
    if (a.text.length > TRANSCRIPT_MAX * 2) return fail("That's too long.", 413);
    const r = await submitTranscript({ booking: b, text: a.text, by: "mentor", kind: "transcript" });
    return r.ok ? json({ ok: true, status: r.status }) : fail(r.message, r.code === "llm" ? 502 : 422, { code: r.code });
  }
  // approve (optionally with the mentor's edits; quotes are re-verified against the stored transcript)
  const s = await getSummary(b.id);
  if (!s || s.status !== "draft") return fail("There's no draft waiting for review.", 409);
  let edited;
  if (a.edited) {
    const g = groundSummary(a.edited, b.transcript ?? "");
    edited = { ...g.content, source: s.content.source };
  }
  await releaseSummary(b.id, { by: "mentor", status: "approved", edited });
  return json({ ok: true });
}
