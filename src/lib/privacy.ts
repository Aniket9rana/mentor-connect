import { all, db, one } from "./db";
import { appUrl, sendEmail } from "./email";
import { mentorEmail } from "./contacts";
import { formatWhen } from "./format";
import { getMentor } from "./mentors";

/**
 * "Delete my data": removes the student and everything hanging off them (chats, bookings, transcripts,
 * write-ups, action items, feedback, events, flags, emails sent to them, waitlist, shortlist).
 * Mentors with an upcoming call are told it is off. Aggregate funnel numbers shrink accordingly.
 */
export async function deleteStudentData(studentId: string): Promise<boolean> {
  const s = await one<{ email: string }>("SELECT email FROM students WHERE id = ?", [studentId]);
  if (!s) return false;

  const upcoming = await all<{ mentor_id: string; slot_start: string }>(
    "SELECT mentor_id, slot_start FROM bookings WHERE student_id = ? AND status = 'confirmed' AND slot_start > ?", [studentId, new Date().toISOString()],
  );
  for (const b of upcoming) {
    const m = await getMentor(b.mentor_id);
    await sendEmail({
      to: await mentorEmail(b.mentor_id), kind: "mentor_cancelled", link: appUrl(),
      subject: "Call cancelled: student left Mentor Connect",
      body: `The student who booked ${formatWhen(b.slot_start, { offsetMin: m?.utcOffsetMin ?? 0 })} deleted their account, so that call is off and the slot is open again.`,
    });
  }

  const me = "(SELECT id FROM students WHERE id = ?)";
  const convs = `(SELECT id FROM conversations WHERE student_id IN ${me})`;
  const books = `(SELECT id FROM bookings WHERE student_id IN ${me})`;
  const client = await db();
  const q = (sql: string) => ({ sql, args: Array(sql.split("?").length - 1).fill(studentId) as string[] });
  await client.batch(
    [
      q("DELETE FROM action_items WHERE student_id = ?"),
      q("DELETE FROM feedback WHERE student_id = ?"),
      q(`DELETE FROM summaries WHERE booking_id IN ${books}`),
      q(`DELETE FROM flags WHERE conversation_id IN ${convs} OR booking_id IN ${books}`),
      q("DELETE FROM events WHERE student_id = ?"),
      q(`DELETE FROM recommendations WHERE conversation_id IN ${convs}`),
      q(`DELETE FROM messages WHERE conversation_id IN ${convs}`),
      // mails to mentors about this student (name + brief) are found through the mentor link they carry
      q("DELETE FROM emails WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.student_id = ? AND emails.link LIKE '%/mentor/' || b.mentor_token)"),
      q("DELETE FROM waitlist WHERE student_id = ?"),
      q("DELETE FROM shortlist WHERE student_id = ?"),
      q("DELETE FROM bookings WHERE student_id = ?"),
      q("DELETE FROM conversations WHERE student_id = ?"),
      { sql: "DELETE FROM emails WHERE to_email = ?", args: [s.email] },
      { sql: "DELETE FROM login_tokens WHERE email = ?", args: [s.email] },
      { sql: "DELETE FROM students WHERE id = ?", args: [studentId] },
    ],
    "write",
  );
  return true;
}
