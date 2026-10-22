import { z } from "zod";
import { cookies } from "next/headers";
import { one, run, uid, now } from "@/lib/db";
import { COOKIE_OPTS, sign } from "@/lib/session";
import { body, fail, json, limited } from "@/lib/http";

const In = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(200), tz: z.string().max(60).optional() });

export async function POST(req: Request) {
  if (limited(req, "session", 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Please enter your name and a valid email.");
  const { name, email, tz } = p.data;
  // *.test addresses are reserved for tests/demos: label them so analytics can exclude them and admins can remove them
  const demo = email.endsWith(".test") ? 1 : 0;
  let s = await one<{ id: string }>("SELECT id FROM students WHERE email = ?", [email]);
  if (s) await run("UPDATE students SET name = ?, tz = COALESCE(?, tz), is_demo = MAX(is_demo, ?) WHERE id = ?", [name, tz ?? null, demo, s.id]);
  else {
    s = { id: uid("stu") };
    await run("INSERT INTO students (id, name, email, tz, is_demo, created_at) VALUES (?,?,?,?,?,?)", [s.id, name, email, tz ?? null, demo, now()]);
  }
  (await cookies()).set("mc_student", sign(s.id), COOKIE_OPTS);
  return json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete("mc_student");
  return json({ ok: true });
}
