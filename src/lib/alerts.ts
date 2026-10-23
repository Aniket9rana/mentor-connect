import { appUrl, sendEmail } from "./email";

/** Flag kinds the Mesa team should hear about now, not whenever someone opens the dashboard. */
export const URGENT = new Set(["sensitive", "mentor_no_show"]);

/**
 * Pushes an urgent flag to ADMIN_ALERT_EMAIL and/or ALERT_WEBHOOK_URL (Slack-compatible `{text}` body).
 * Carries a link, not the student's words. Never throws: an alert failure must not break the user flow.
 */
export async function alertTeam(kind: string, link: string) {
  const text = `Mentor Connect: "${kind}" flag needs a look. ${link}`;
  try {
    const to = process.env.ADMIN_ALERT_EMAIL;
    if (to) await sendEmail({ to, kind: "team_alert", subject: `[Mentor Connect] ${kind} flag`, body: text, link });
    const hook = process.env.ALERT_WEBHOOK_URL;
    if (hook && hook.startsWith("https://"))
      await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(8000) });
  } catch (e) {
    console.error("[alerts] failed", e);
  }
}

export const adminLink = (o: { conversationId?: string; bookingId?: string }) =>
  o.conversationId ? `${appUrl()}/admin/conversations/${o.conversationId}` : `${appUrl()}/admin/quality`;
