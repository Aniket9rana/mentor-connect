import { isAdmin } from "@/lib/session";
import { autoReleaseDue, sendNudges } from "@/lib/summarise";
import { sendReminders } from "@/lib/booking";
import { fail, json } from "@/lib/http";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Admins can also trigger it by hand.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const ok = (secret && req.headers.get("authorization") === `Bearer ${secret}`) || (await isAdmin());
  if (!ok) return fail("Unauthorized", 401);
  return json({ ok: true, released: await autoReleaseDue(), nudged: await sendNudges(), reminded: await sendReminders() });
}
