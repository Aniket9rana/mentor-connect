import { all, run, now } from "./db";
import { getMentor } from "./mentors";

export const MAX_SHORTLIST = 12;

export const shortlistIds = async (studentId: string) =>
  (await all<{ mentor_id: string }>("SELECT mentor_id FROM shortlist WHERE student_id = ? ORDER BY created_at", [studentId])).map((r) => r.mentor_id);

export async function setSaved(studentId: string, mentorId: string, saved: boolean): Promise<string | null> {
  if (!(await getMentor(mentorId))) return "That mentor isn't on our list.";
  if (!saved) {
    await run("DELETE FROM shortlist WHERE student_id = ? AND mentor_id = ?", [studentId, mentorId]);
    return null;
  }
  if ((await shortlistIds(studentId)).length >= MAX_SHORTLIST) return `You can save up to ${MAX_SHORTLIST} mentors. Remove one first.`;
  await run("INSERT OR IGNORE INTO shortlist (student_id, mentor_id, created_at) VALUES (?,?,?)", [studentId, mentorId, now()]);
  return null;
}
