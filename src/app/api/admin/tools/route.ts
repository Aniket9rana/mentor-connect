import { z } from "zod";
import { cookies } from "next/headers";
import { adminOr401, body, fail, json } from "@/lib/http";
import { loadDemoData, removeDemoData, DEMO_LOGIN_EMAIL } from "@/lib/demo";
import { autoReleaseDue, sendNudges } from "@/lib/summarise";
import { one, run } from "@/lib/db";
import { COOKIE_OPTS, sign } from "@/lib/session";

export const maxDuration = 120;
const In = z.object({ action: z.enum(["load_demo", "remove_demo", "run_daily", "force_release", "sign_in_demo", "resolve_flag"]), id: z.string().optional() });

export async function POST(req: Request) {
  const a = await adminOr401();
  if (a instanceof Response) return a;
  const p = In.safeParse(await body(req));
  if (!p.success) return fail("Invalid action.");
  switch (p.data.action) {
    case "load_demo": return json({ ok: true, message: `Loaded ${await loadDemoData()} demo students.` });
    case "remove_demo": return json({ ok: true, message: `Removed ${await removeDemoData()} demo students.` });
    case "run_daily": {
      const released = await autoReleaseDue();
      const nudged = await sendNudges();
      return json({ ok: true, message: `Auto-released ${released} overdue draft(s); nudged on ${nudged} action item(s).` });
    }
    case "force_release": return json({ ok: true, message: `Released ${await autoReleaseDue(true)} draft(s) now (simulating the 48h timeout).` });
    case "sign_in_demo": {
      const s = await one<{ id: string }>("SELECT id FROM students WHERE email = ?", [DEMO_LOGIN_EMAIL]);
      if (!s) return fail("Load demo data first.");
      (await cookies()).set("mc_student", sign(s.id), COOKIE_OPTS);
      return json({ ok: true, message: "Signed in as the demo student. Open My journey." });
    }
    case "resolve_flag":
      if (p.data.id) await run("UPDATE flags SET resolved = 1 WHERE id = ?", [p.data.id]);
      return json({ ok: true });
  }
}
