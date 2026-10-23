import { cookies } from "next/headers";
import { fail, json, limited, studentOr401 } from "@/lib/http";
import { deleteStudentData } from "@/lib/privacy";

export async function DELETE(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "delete-me", 5, 10 * 60_000)) return fail("Too many attempts. Please wait.", 429);
  await deleteStudentData(s.id);
  (await cookies()).delete("mc_student");
  return json({ ok: true });
}
