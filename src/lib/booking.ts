import { z } from "zod";
import { all, one, run, uid, now, token } from "./db";
import { completeJSON, FAST } from "./llm";
import { getMentor } from "./mentors";
import { candidateSlots, openSlots, SLOT_MIN } from "./slots";
import { loadMessages } from "./assistant";
import { appUrl, sendEmail } from "./email";
import { mentorEmail } from "./contacts";
import { formatWhen } from "./format";
import { flag, track } from "./events";
import type { Student } from "./session";

export type Booking = {
  id: string; student_id: string; mentor_id: string; conversation_id: string | null; slot_start: string; duration_min: number;
  status: "confirmed" | "completed" | "cancelled" | "no_show_student" | "no_show_mentor"; brief: string | null; meeting_url: string | null;
  mentor_token: string; transcript: string | null; transcript_source: string | null; rescheduled_from: string | null;
  created_at: string; updated_at: string;
};

export const CANCEL_CUTOFF_MS = 2 * 3600_000;

export const getBooking = (id: string) => one<Booking>("SELECT * FROM bookings WHERE id = ?", [id]);
export const bookingByToken = (t: string) => one<Booking>("SELECT * FROM bookings WHERE mentor_token = ?", [t]);

/** Mentor links stay valid for 30 days after the call, long enough to review a write-up, then stop working. */
export const MENTOR_LINK_GRACE_MS = 30 * 86400_000;
export const mentorLinkExpired = (b: Pick<Booking, "slot_start">, at = Date.now()) => new Date(b.slot_start).getTime() + MENTOR_LINK_GRACE_MS < at;

const Brief = z.object({
  problem: z.string().describe("What the student is stuck on, 1-2 sentences, third person"),
  goal: z.string().describe("What they want out of the call"),
  tried: z.string().optional().describe("What they already tried or their background, if stated"),
  questions: z.array(z.string()).max(3).optional().describe("Up to 3 questions they want answered"),
});

/** Pre-call brief so the mentor does not start cold. Built only from what the student actually said. */
export async function buildBrief(conversationId: string | null, studentName: string): Promise<string> {
  if (!conversationId) return "";
  const msgs = await loadMessages(conversationId);
  const userText = msgs.filter((m) => m.role === "user").map((m) => m.content);
  if (!userText.length) return "";
  const fallback = userText.join(" / ").slice(0, 500);
  try {
    const b = await completeJSON({
      model: FAST(), maxTokens: 500, timeoutMs: 20_000, schema: Brief, toolName: "write_brief",
      toolDescription: "Write a short pre-call brief for the mentor",
      messages: [
        { role: "system", content: "Write a brief for a mentor about to take a call with a student. Use ONLY facts the student stated. Do not add advice, assumptions or details. Be concise." },
        { role: "user", content: `Student: ${studentName}\n\nStudent messages:\n${userText.map((t) => "- " + t).join("\n")}` },
      ],
    });
    return [`Problem: ${b.problem}`, `Goal for the call: ${b.goal}`, b.tried ? `Background / tried so far: ${b.tried}` : "", b.questions?.length ? `Questions: ${b.questions.join(" | ")}` : ""].filter(Boolean).join("\n");
  } catch {
    return `Student's words: ${fallback}`;
  }
}

export type BookResult =
  | { ok: true; booking: Booking }
  | { ok: false; code: "conflict" | "invalid_slot" | "student_busy" | "no_mentor" | "bad_reschedule"; message: string; slots?: string[] };

export async function createBooking(o: { student: Student; mentorId: string; slotStart: string; conversationId?: string | null; rescheduleOf?: string | null }): Promise<BookResult> {
  const mentor = await getMentor(o.mentorId);
  if (!mentor) return { ok: false, code: "no_mentor", message: "That mentor isn't on our list." };

  let old: Booking | undefined;
  if (o.rescheduleOf) {
    old = await getBooking(o.rescheduleOf);
    if (!old || old.student_id !== o.student.id || old.status !== "confirmed") return { ok: false, code: "bad_reschedule", message: "That booking can't be rescheduled." };
    if (new Date(old.slot_start).getTime() - Date.now() < CANCEL_CUTOFF_MS) return { ok: false, code: "bad_reschedule", message: "It's too close to the call to reschedule - please contact the mentor via the meeting link." };
  }

  // only slots the system actually offers can be booked (guards against tampered requests too)
  const slotIso = new Date(o.slotStart).toISOString();
  if (!(await candidateSlots(mentor)).includes(slotIso)) return { ok: false, code: "invalid_slot", message: "That time isn't available any more.", slots: await openSlots(mentor) };

  const clash = await one(
    "SELECT id FROM bookings WHERE student_id = ? AND status = 'confirmed' AND slot_start = ? AND id != ?",
    [o.student.id, slotIso, o.rescheduleOf ?? ""],
  );
  if (clash) return { ok: false, code: "student_busy", message: "You already have a call booked at that time." };

  const brief = await buildBrief(o.conversationId ?? null, o.student.name);
  const id = uid("bk");
  const mtoken = token();
  try {
    // the partial unique index (mentor_id, slot_start) makes double-booking impossible, even under a race
    await run(
      "INSERT INTO bookings (id, student_id, mentor_id, conversation_id, slot_start, duration_min, status, brief, mentor_token, rescheduled_from, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, o.student.id, mentor.id, o.conversationId ?? null, slotIso, SLOT_MIN, "confirmed", brief, mtoken, o.rescheduleOf ?? null, now(), now()],
    );
  } catch (e) {
    if (String((e as Error).message).includes("UNIQUE")) {
      await track("booking_conflict", { studentId: o.student.id, conversationId: o.conversationId ?? undefined }, { mentor: mentor.id, slot: slotIso });
      return { ok: false, code: "conflict", message: "Someone just took that slot. Here are the times still open.", slots: await openSlots(mentor) };
    }
    throw e;
  }
  if (old) {
    await run("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?", [now(), old.id]);
    await track("booking_cancelled", { studentId: o.student.id, bookingId: old.id }, { reason: "rescheduled", to: id });
  }
  const booking = (await getBooking(id))!;
  await track("booking_created", { studentId: o.student.id, conversationId: o.conversationId ?? undefined, bookingId: id }, { mentor: mentor.id, reschedule: !!old });

  await sendEmail({
    to: o.student.email, kind: "booking_confirmation", link: `${appUrl()}/bookings/${id}`,
    subject: `Your call with ${mentor.name} is confirmed`,
    body: `Hi ${o.student.name},\n\nYour call with ${mentor.name} is booked for ${formatWhen(slotIso, { tz: o.student.tz })}. Add it to your calendar and keep your questions handy.\n\nAfter the call you'll get a written summary with next steps.`,
  });
  await sendEmail({
    to: await mentorEmail(mentor.id), kind: "mentor_new_booking", link: `${appUrl()}/mentor/${mtoken}`,
    subject: `New call booked with ${o.student.name}`,
    body: `A student booked a ${SLOT_MIN}-minute call with you for ${formatWhen(slotIso, { offsetMin: mentor.utcOffsetMin })}.\n\nBrief:\n${brief || "(none provided)"}\n\nUse the link to add your meeting link, mark the call done and review the write-up.`,
  });
  return { ok: true, booking };
}

export async function cancelBooking(b: Booking, student: Student): Promise<{ ok: boolean; message?: string }> {
  if (b.status !== "confirmed") return { ok: false, message: "This booking is not active." };
  if (new Date(b.slot_start).getTime() - Date.now() < CANCEL_CUTOFF_MS) return { ok: false, message: "It's too close to the call to cancel here - please let the mentor know via the meeting link." };
  await run("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?", [now(), b.id]);
  await track("booking_cancelled", { studentId: student.id, bookingId: b.id }, { reason: "student" });
  const m = await getMentor(b.mentor_id);
  await sendEmail({ to: await mentorEmail(b.mentor_id), kind: "mentor_cancelled", subject: `Call cancelled: ${student.name}`, body: `${student.name} cancelled the call scheduled for ${formatWhen(b.slot_start, { offsetMin: m?.utcOffsetMin ?? 0 })}. The slot is open again.` });
  await sendEmail({ to: student.email, kind: "booking_cancelled", subject: `Call with ${m?.name ?? "mentor"} cancelled`, body: `Your call on ${formatWhen(b.slot_start, { tz: student.tz })} is cancelled. You can pick another mentor or time any time.`, link: `${appUrl()}/chat` });
  return { ok: true };
}

/** Status changes that make sense only after the slot has started. */
export async function markStatus(b: Booking, status: "completed" | "no_show_student" | "no_show_mentor", by: "mentor" | "student") {
  if (b.status !== "confirmed" && !(status === "completed" && b.status === "completed")) return { ok: false, message: "This booking is not active." };
  if (new Date(b.slot_start).getTime() > Date.now()) return { ok: false, message: "The call hasn't happened yet." };
  await run("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?", [status, now(), b.id]);
  await track(status === "completed" ? "booking_completed" : "no_show", { studentId: b.student_id, bookingId: b.id }, { by, status });
  if (status === "no_show_mentor") await flag("mentor_no_show", { bookingId: b.id }, `Student reported mentor ${b.mentor_id} did not attend`);
  if (status === "no_show_student") await flag("student_no_show", { bookingId: b.id }, `Mentor ${b.mentor_id} reported the student did not attend`);
  if (status === "no_show_mentor" || status === "no_show_student") {
    const s = await one<{ name: string; email: string }>("SELECT name, email FROM students WHERE id = ?", [b.student_id]);
    if (s) await sendEmail({ to: s.email, kind: "rebook", link: `${appUrl()}/mentors/${b.mentor_id}`, subject: "Let's get your call rescheduled", body: `Hi ${s.name},\n\nWe're sorry the call didn't happen. You can pick a new time with the same mentor, or ask the assistant for other options.` });
  }
  return { ok: true };
}

export async function studentBookings(studentId: string) {
  return all<Booking>("SELECT * FROM bookings WHERE student_id = ? ORDER BY slot_start DESC", [studentId]);
}

/**
 * Reminder to both sides for calls starting within the next 30 hours that haven't been reminded yet.
 * The daily cron runs once a day, so this is a "tomorrow" reminder; run the cron hourly for a "1 hour before" one.
 */
export async function sendReminders(): Promise<number> {
  const until = new Date(Date.now() + 30 * 3600_000).toISOString();
  const due = await all<Booking & { name: string; email: string; tz: string | null }>(
    `SELECT b.*, s.name, s.email, s.tz FROM bookings b JOIN students s ON s.id = b.student_id
      WHERE b.status = 'confirmed' AND b.reminded = 0 AND b.slot_start > ? AND b.slot_start <= ?`,
    [now(), until],
  );
  for (const b of due) {
    const m = await getMentor(b.mentor_id);
    const link = b.meeting_url ? `Meeting link: ${b.meeting_url}` : "Your mentor hasn't added a meeting link yet - check your booking page before the call.";
    await sendEmail({
      to: b.email, kind: "reminder", link: `${appUrl()}/bookings/${b.id}`,
      subject: `Reminder: your call with ${m?.name ?? "your mentor"}`,
      body: `Hi ${b.name},\n\nYour call is coming up on ${formatWhen(b.slot_start, { tz: b.tz })}.\n${link}\n\nHave your questions ready.`,
    });
    await sendEmail({
      to: await mentorEmail(b.mentor_id), kind: "mentor_reminder", link: `${appUrl()}/mentor/${b.mentor_token}`,
      subject: `Reminder: call with ${b.name}`,
      body: `Your call with ${b.name} is on ${formatWhen(b.slot_start, { offsetMin: m?.utcOffsetMin ?? 0 })}.\n${b.meeting_url ? `Meeting link on file: ${b.meeting_url}` : "Please add a meeting link on your portal page."}`,
    });
    await run("UPDATE bookings SET reminded = 1 WHERE id = ?", [b.id]);
  }
  return due.length;
}
