import { z } from "zod";
import { body, fail, json, limited, studentOr401 } from "@/lib/http";
import { joinWaitlist } from "@/lib/waitlist";

const In = z.object({ conversationId: z.string().min(1) });

export async function POST(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "waitlist", 10)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Missing conversation.");
  const r = await joinWaitlist(s.id, p.data.conversationId);
  return r.ok ? json({ ok: true, already: r.already }) : fail(r.message, 400);
}
