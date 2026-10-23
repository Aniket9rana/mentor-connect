import { z } from "zod";
import { body, fail, json, limited, studentOr401 } from "@/lib/http";
import { setSaved } from "@/lib/shortlist";
import { track } from "@/lib/events";

const In = z.object({ mentorId: z.string(), saved: z.boolean() });

export async function POST(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "shortlist", 40)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Invalid request.");
  const err = await setSaved(s.id, p.data.mentorId.toUpperCase(), p.data.saved);
  if (err) return fail(err);
  if (p.data.saved) await track("shortlisted", { studentId: s.id }, { mentor: p.data.mentorId.toUpperCase() });
  return json({ ok: true });
}
