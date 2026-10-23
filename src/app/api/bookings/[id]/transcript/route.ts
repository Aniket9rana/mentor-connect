import { z } from "zod";
import { getBooking } from "@/lib/booking";
import { submitTranscript, TRANSCRIPT_MAX } from "@/lib/summarise";
import { body, fail, json, limited, studentOr401 } from "@/lib/http";

export const maxDuration = 120;
const In = z.object({ text: z.string().min(1), kind: z.enum(["transcript", "debrief"]) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "transcript", 6)) return fail("Too many attempts. Please wait a minute.", 429);
  const b = await getBooking((await ctx.params).id);
  if (!b || b.student_id !== s.id) return fail("Not found", 404);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Paste the transcript or your notes first.");
  if (p.data.text.length > TRANSCRIPT_MAX * 2) return fail(`That's too long. Please keep it under ${TRANSCRIPT_MAX.toLocaleString()} characters.`, 413);
  const r = await submitTranscript({ booking: b, text: p.data.text, by: "student", kind: p.data.kind });
  return r.ok ? json({ ok: true, status: r.status, lowConfidence: r.lowConfidence }) : fail(r.message, r.code === "llm" ? 502 : 422, { code: r.code });
}
