import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { COOKIE_OPTS, sign } from "@/lib/session";
import { body, fail, json, limited } from "@/lib/http";

export async function POST(req: Request) {
  if (limited(req, "admin-login", 8, 5 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);
  const { password } = await body<{ password?: string }>(req);
  const expected = process.env.ADMIN_PASSWORD;
  const a = Buffer.from(password ?? "");
  const b = Buffer.from(expected ?? "");
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return fail("Wrong password.", 401);
  (await cookies()).set("mc_admin", sign("admin"), { ...COOKIE_OPTS, maxAge: 60 * 60 * 12 });
  return json({ ok: true });
}
export async function DELETE() {
  (await cookies()).delete("mc_admin");
  return json({ ok: true });
}
