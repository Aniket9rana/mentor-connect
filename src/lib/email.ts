import { run, uid, now } from "./db";

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/**
 * Every email is written to the in-app outbox first (source of truth for the demo and for audit).
 * It is also sent for real when RESEND_API_KEY is configured; a send failure never breaks the flow.
 */
export async function sendEmail(o: { to: string; subject: string; body: string; kind: string; link?: string }) {
  const id = uid("em");
  let delivered = 0;
  const key = process.env.RESEND_API_KEY;
  // *.test addresses (demo students, placeholder mentor mailboxes) are outbox-only, never sent
  if (key && !o.to.endsWith(".test")) {
    try {
      const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">${o.body.replace(/\n/g, "<br>")}${
        o.link ? `<p><a href="${o.link}">${o.link}</a></p>` : ""
      }</div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Mentor Connect <onboarding@resend.dev>", to: o.to, subject: o.subject, html }),
        signal: AbortSignal.timeout(10_000),
      });
      delivered = r.ok ? 1 : 0;
      if (!r.ok) console.error("[email] resend", r.status, (await r.text()).slice(0, 200));
    } catch (e) {
      console.error("[email] send failed", e);
    }
  }
  await run("INSERT INTO emails (id, ts, to_email, subject, body, kind, link, delivered) VALUES (?,?,?,?,?,?,?,?)", [
    id, now(), o.to, o.subject, o.body, o.kind, o.link ?? null, delivered,
  ]);
}
