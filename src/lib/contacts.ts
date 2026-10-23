import { one, run, now } from "./db";

/**
 * Real mentor mailboxes. Kept in their own table and read only by the email sender and the admin screen:
 * they must never reach prompts, mentor cards or any student-facing page.
 */
export const placeholderMailbox = (id: string) => `${id.toLowerCase()}@mentors.demo.mentorconnect.test`;

export async function mentorEmail(id: string): Promise<string> {
  const r = await one<{ email: string }>("SELECT email FROM mentor_contacts WHERE mentor_id = ?", [id]);
  return r?.email ?? placeholderMailbox(id);
}

export async function setMentorContact(id: string, email: string | null) {
  if (!email) await run("DELETE FROM mentor_contacts WHERE mentor_id = ?", [id]);
  else
    await run(
      "INSERT INTO mentor_contacts (mentor_id, email, updated_at) VALUES (?,?,?) ON CONFLICT(mentor_id) DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at",
      [id, email.toLowerCase(), now()],
    );
}
