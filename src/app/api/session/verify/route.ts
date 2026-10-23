import { cookies } from "next/headers";
import { COOKIE_OPTS, sign } from "@/lib/session";
import { body, fail, json, limited } from "@/lib/http";
import { consumeSignIn } from "@/lib/signin";

// POST (from the confirm page), not GET: mail scanners that pre-open links must not burn the one-time token.
export async function POST(req: Request) {
  if (await limited(req, "verify", 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const { token } = await body<{ token?: string }>(req);
  const id = token ? await consumeSignIn(token) : null;
  if (!id) return fail("This sign-in link has expired or was already used. Request a new one from the home page.", 410);
  (await cookies()).set("mc_student", sign(id), COOKIE_OPTS);
  return json({ ok: true });
}
