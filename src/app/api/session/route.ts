import { z } from "zod";
import { cookies } from "next/headers";
import { COOKIE_OPTS, sign } from "@/lib/session";
import { body, fail, json, limited } from "@/lib/http";
import { startSignIn } from "@/lib/signin";

const In = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(200), tz: z.string().max(60).optional() });

export async function POST(req: Request) {
  if (await limited(req, "session", 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Please enter your name and a valid email.");
  const r = await startSignIn(p.data);
  if (r.mode === "limited") return fail("We've already sent you a link a few times. Check your inbox (and spam), or try again in 10 minutes.", 429);
  if (r.mode === "email") return json({ ok: true, mode: "email" });
  (await cookies()).set("mc_student", sign(r.studentId), COOKIE_OPTS);
  return json({ ok: true, mode: "instant" });
}

export async function DELETE() {
  (await cookies()).delete("mc_student");
  return json({ ok: true });
}
