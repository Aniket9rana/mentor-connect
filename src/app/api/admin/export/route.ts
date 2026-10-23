import { adminOr401, fail } from "@/lib/http";
import { all } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { funnel, mentorTable, parseRange, parseScope, sinceOf } from "@/lib/admin-stats";
import { headline } from "@/lib/mentors";

const file = (name: string, body: string) =>
  new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });

export async function GET(req: Request) {
  const a = await adminOr401();
  if (a instanceof Response) return a;
  const q = new URL(req.url).searchParams;
  const scope = parseScope(q.get("scope") ?? undefined);
  const range = parseRange(q.get("range") ?? undefined);
  const demoWhere = scope === "all" ? "" : `WHERE s.is_demo = ${scope === "demo" ? 1 : 0}`;

  switch (q.get("table")) {
    case "funnel": {
      const steps = await funnel(scope, sinceOf(range));
      return file("funnel", toCsv(steps.map((s, i) => ({ step: s.key, students: s.v, pct_of_previous: i && steps[i - 1].v ? Math.round((s.v / steps[i - 1].v) * 100) : "" }))));
    }
    case "mentors": {
      const t = await mentorTable(scope);
      return file("mentors", toCsv(t.rows.map((r) => ({ id: r.m.id, name: r.m.name, focus: headline(r.m), profile: r.m.profile, recommended: r.recs, booked: r.booked, completed: r.completed, mentor_no_shows: r.noShows, avg_rating: r.rating?.toFixed(2) ?? "", ratings: r.ratingN }))));
    }
    case "bookings":
      return file("bookings", toCsv(await all(`SELECT b.id, b.slot_start, b.status, b.mentor_id, s.name AS student, s.is_demo, sm.status AS writeup_status, b.created_at FROM bookings b JOIN students s ON s.id = b.student_id LEFT JOIN summaries sm ON sm.booking_id = b.id ${demoWhere} ORDER BY b.slot_start DESC`)));
    case "waitlist":
      return file("waitlist", toCsv(await all(`SELECT w.created_at, w.status, w.topic, w.unmet, s.name AS student, s.email, s.is_demo FROM waitlist w JOIN students s ON s.id = w.student_id ${demoWhere} ORDER BY w.created_at DESC`)));
    default:
      return fail("Unknown table.", 400);
  }
}
