import { createHash, randomBytes } from "node:crypto";
import { one, run, uid, now } from "./db";
import { appUrl, sendEmail } from "./email";
import { allow } from "./ratelimit";

export const LINK_TTL_MS = 20 * 60_000;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Email confirmation is enforced whenever real email can be delivered (RESEND_API_KEY set), or when
 * REQUIRE_EMAIL_VERIFY=on. Without a mail provider a link could never reach anyone, so the prototype
 * falls back to name + email sign-in (documented gap). REQUIRE_EMAIL_VERIFY=off forces that fallback.
 */
export function verifyRequired(): boolean {
  const f = process.env.REQUIRE_EMAIL_VERIFY;
  if (f === "on") return true;
  if (f === "off") return false;
  return !!process.env.RESEND_API_KEY;
}

/** *.test addresses are reserved for demos and are outbox-only, so a link to them can't be delivered. */
export const isDemoEmail = (email: string) => email.endsWith(".test");

export async function upsertStudent(o: { name: string; email: string; tz?: string | null }): Promise<string> {
  const demo = isDemoEmail(o.email) ? 1 : 0;
  const s = await one<{ id: string }>("SELECT id FROM students WHERE email = ?", [o.email]);
  if (s) {
    await run("UPDATE students SET name = ?, tz = COALESCE(?, tz), is_demo = MAX(is_demo, ?) WHERE id = ?", [o.name, o.tz ?? null, demo, s.id]);
    return s.id;
  }
  const id = uid("stu");
  await run("INSERT INTO students (id, name, email, tz, is_demo, created_at) VALUES (?,?,?,?,?,?)", [id, o.name, o.email, o.tz ?? null, demo, now()]);
  return id;
}

export type SignInStart = { mode: "instant"; studentId: string } | { mode: "email" } | { mode: "limited" };

export async function startSignIn(o: { name: string; email: string; tz?: string | null }): Promise<SignInStart> {
  if (!verifyRequired() || isDemoEmail(o.email)) return { mode: "instant", studentId: await upsertStudent(o) };
  // stop someone using us to spam an address
  if (!(await allow(`signin-mail:${o.email}`, 3, 10 * 60_000))) return { mode: "limited" };
  const token = randomBytes(24).toString("base64url");
  await run("INSERT INTO login_tokens (token_hash, email, name, tz, expires_at) VALUES (?,?,?,?,?)", [
    hashToken(token), o.email, o.name, o.tz ?? null, new Date(Date.now() + LINK_TTL_MS).toISOString(),
  ]);
  await sendEmail({
    to: o.email, kind: "signin", link: `${appUrl()}/signin/${token}`,
    subject: "Your Mentor Connect sign-in link",
    body: `Hi ${o.name},\n\nUse this link to sign in. It works once and expires in 20 minutes. If you didn't ask for it, ignore this email - nothing happens unless the link is opened.`,
  });
  return { mode: "email" };
}

/** Single use: the UPDATE only matches an unused, unexpired token, so two clicks can't both win. */
export async function consumeSignIn(token: string): Promise<string | null> {
  const h = hashToken(token);
  const r = await run("UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?", [now(), h, now()]);
  if (!r.rowsAffected) return null;
  const t = await one<{ email: string; name: string; tz: string | null }>("SELECT email, name, tz FROM login_tokens WHERE token_hash = ?", [h]);
  return t ? upsertStudent(t) : null;
}
