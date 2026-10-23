import { all, one, run, uid, now } from "./db";
import { appUrl, sendEmail } from "./email";
import { track } from "./events";

export type WaitlistRow = { id: string; student_id: string; conversation_id: string; topic: string | null; unmet: string | null; status: string; created_at: string; notified_at: string | null; name: string; email: string; is_demo: number };

/** A student asks to be told when Mesa adds a mentor for a need the list couldn't serve. One entry per conversation. */
export async function joinWaitlist(studentId: string, conversationId: string): Promise<{ ok: true; already: boolean } | { ok: false; message: string }> {
  const c = await one<{ id: string; topic: string | null }>("SELECT id, topic FROM conversations WHERE id = ? AND student_id = ?", [conversationId, studentId]);
  if (!c) return { ok: false, message: "Conversation not found." };
  // only a recommendation round that came back partial/none can be waitlisted; read the unmet need from it
  const rows = await all<{ payload: string | null }>("SELECT payload FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC, rowid DESC", [conversationId]);
  const last = rows.map((r) => (r.payload ? JSON.parse(r.payload) : {})).find((p) => p.kind === "recommend") as { matchQuality?: string; unmet?: string } | undefined;
  if (!last || last.matchQuality === "strong" || !last.matchQuality) return { ok: false, message: "There's nothing to wait for here: we found a strong match." };
  const r = await run("INSERT OR IGNORE INTO waitlist (id, student_id, conversation_id, topic, unmet, created_at) VALUES (?,?,?,?,?,?)", [
    uid("wl"), studentId, conversationId, c.topic, last.unmet ?? null, now(),
  ]);
  if (r.rowsAffected) await track("waitlisted", { studentId, conversationId }, { unmet: last.unmet ?? null });
  return { ok: true, already: !r.rowsAffected };
}

export const waitlistFor = (studentId: string, conversationId: string) =>
  one("SELECT id FROM waitlist WHERE student_id = ? AND conversation_id = ?", [studentId, conversationId]).then(Boolean);

export const listWaitlist = (scope: "all" | "real" | "demo") =>
  all<WaitlistRow>(
    `SELECT w.*, s.name, s.email, s.is_demo FROM waitlist w JOIN students s ON s.id = w.student_id
      ${scope === "all" ? "" : `WHERE s.is_demo = ${scope === "demo" ? 1 : 0}`} ORDER BY (w.status = 'waiting') DESC, w.created_at DESC LIMIT 100`,
  );

/** Admin hit "notify": tell the student the list has grown and send them back to the assistant. */
export async function notifyWaitlist(id: string): Promise<boolean> {
  const w = await one<WaitlistRow>("SELECT w.*, s.name, s.email, s.is_demo FROM waitlist w JOIN students s ON s.id = w.student_id WHERE w.id = ?", [id]);
  if (!w || w.status !== "waiting") return false;
  await run("UPDATE waitlist SET status = 'notified', notified_at = ? WHERE id = ?", [now(), id]);
  await sendEmail({
    to: w.email, kind: "waitlist_ready", link: `${appUrl()}/chat?c=${w.conversation_id}`,
    subject: "We've added mentors you asked about",
    body: `Hi ${w.name},\n\nYou asked us to let you know when we could help with: ${w.unmet || w.topic || "your earlier request"}.\n\nWe've added to our mentor list since then. Pick the conversation back up and ask the assistant again.`,
  });
  return true;
}
