import { run, uid, now } from "./db";

export type EventType =
  | "chat_started" | "message_sent" | "clarified" | "recommended" | "no_match" | "refused" | "sensitive"
  | "injection_attempt" | "mentor_viewed" | "booking_created" | "booking_conflict" | "booking_cancelled"
  | "booking_completed" | "no_show" | "transcript_submitted" | "summary_drafted" | "summary_released"
  | "action_item_done" | "feedback" | "validation_dropped" | "llm_error";

export async function track(
  type: EventType,
  ids: { studentId?: string; conversationId?: string; bookingId?: string } = {},
  meta: Record<string, unknown> = {},
) {
  try {
    await run("INSERT INTO events (id, ts, type, student_id, conversation_id, booking_id, meta) VALUES (?,?,?,?,?,?,?)", [
      uid("ev"), now(), type, ids.studentId ?? null, ids.conversationId ?? null, ids.bookingId ?? null, JSON.stringify(meta),
    ]);
  } catch (e) {
    console.error("[events] failed", type, e); // analytics must never break the user flow
  }
}

export async function flag(kind: string, ids: { conversationId?: string; bookingId?: string }, detail: string) {
  await run("INSERT INTO flags (id, ts, kind, conversation_id, booking_id, detail) VALUES (?,?,?,?,?,?)", [
    uid("fl"), now(), kind, ids.conversationId ?? null, ids.bookingId ?? null, detail.slice(0, 1000),
  ]);
}
