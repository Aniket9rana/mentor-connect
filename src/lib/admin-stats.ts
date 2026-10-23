import { all, one } from "./db";
import { allMentors } from "./mentors";

export type Scope = "all" | "real" | "demo";
export const parseScope = (v?: string): Scope => (v === "real" || v === "demo" ? v : "all");
/** SQL predicate limiting a student_id column to the chosen scope. */
const sf = (scope: Scope, col = "student_id") => (scope === "all" ? "1=1" : `${col} IN (SELECT id FROM students WHERE is_demo = ${scope === "demo" ? 1 : 0})`);

export type Range = "all" | "7d" | "30d";
export const parseRange = (v?: string): Range => (v === "7d" || v === "30d" ? v : "all");
/** ISO lower bound for the chosen window, or null for all time. */
export const sinceOf = (r: Range, at = Date.now()): string | null => (r === "all" ? null : new Date(at - (r === "7d" ? 7 : 30) * 86400_000).toISOString());
/** `AND col >= ?` when a window is set. Returns [sql, args]. */
const win = (col: string, since: string | null): [string, string[]] => (since ? [` AND ${col} >= ?`, [since]] : ["", []]);

const n = async (sql: string, args: (string | number)[] = []) => Number((await one<{ n: number }>(sql, args))?.n ?? 0);

export async function funnel(scope: Scope, since: string | null = null) {
  const [we, ae] = win("ts", since);
  const [wb, ab] = win("created_at", since);
  const [ws, as_] = win("s.created_at", since);
  const ev = (t: string) => n(`SELECT COUNT(DISTINCT student_id) AS n FROM events WHERE type = ? AND ${sf(scope)}${we}`, [t, ...ae]);
  const steps = [
    { key: "Started a chat", v: await ev("chat_started") },
    { key: "Got mentor recommendations", v: await ev("recommended") },
    { key: "Viewed a mentor", v: await ev("mentor_viewed") },
    { key: "Booked a call", v: await n(`SELECT COUNT(DISTINCT student_id) AS n FROM bookings WHERE ${sf(scope)}${wb}`, ab) },
    { key: "Call took place", v: await n(`SELECT COUNT(DISTINCT student_id) AS n FROM bookings WHERE status = 'completed' AND ${sf(scope)}${wb}`, ab) },
    { key: "Received a write-up", v: await n(`SELECT COUNT(DISTINCT b.student_id) AS n FROM summaries s JOIN bookings b ON b.id = s.booking_id WHERE s.status != 'draft' AND ${sf(scope, "b.student_id")}${ws}`, as_) },
    { key: "Completed an action item", v: await ev("action_item_done") },
  ];
  return steps;
}

export async function kpis(scope: Scope, since: string | null = null) {
  const [wb, ab] = win("created_at", since);
  const [wf, af] = win("created_at", since);
  const [ws, as_] = win("s.created_at", since);
  const [wsa, asa] = win("sm.created_at", since);
  const bookings = await n(`SELECT COUNT(*) AS n FROM bookings WHERE ${sf(scope)}${wb}`, ab);
  const held = await n(`SELECT COUNT(*) AS n FROM bookings WHERE status = 'completed' AND ${sf(scope)}${wb}`, ab);
  const noShows = await n(`SELECT COUNT(*) AS n FROM bookings WHERE status IN ('no_show_student','no_show_mentor') AND ${sf(scope)}${wb}`, ab);
  const cancelled = await n(`SELECT COUNT(*) AS n FROM bookings WHERE status = 'cancelled' AND ${sf(scope)}${wb}`, ab);
  const rating = await one<{ r: number | null; c: number }>(`SELECT AVG(rating) AS r, COUNT(*) AS c FROM feedback WHERE ${sf(scope)}${wf}`, af);
  const items = await one<{ done: number; total: number }>(`SELECT COALESCE(SUM(a.done),0) AS done, COUNT(*) AS total FROM action_items a JOIN summaries sm ON sm.id = a.summary_id WHERE ${sf(scope, "a.student_id")}${wsa}`, asa);
  const lag = await one<{ h: number | null }>(
    `SELECT AVG((julianday(s.released_at) - julianday(s.created_at)) * 24) AS h FROM summaries s JOIN bookings b ON b.id = s.booking_id WHERE s.released_at IS NOT NULL AND ${sf(scope, "b.student_id")}${ws}`, as_);
  const released = await n(`SELECT COUNT(*) AS n FROM summaries s JOIN bookings b ON b.id = s.booking_id WHERE s.status != 'draft' AND ${sf(scope, "b.student_id")}${ws}`, as_);
  const unreviewed = await n(`SELECT COUNT(*) AS n FROM summaries s JOIN bookings b ON b.id = s.booking_id WHERE s.status = 'auto_released' AND ${sf(scope, "b.student_id")}${ws}`, as_);
  const students = await n(`SELECT COUNT(*) AS n FROM students WHERE ${scope === "all" ? "1=1" : `is_demo = ${scope === "demo" ? 1 : 0}`}${wb}`, ab);
  const demoStudents = await n("SELECT COUNT(*) AS n FROM students WHERE is_demo = 1");
  const totalStudents = await n("SELECT COUNT(*) AS n FROM students");
  return {
    students, demoStudents, totalStudents, bookings, held, noShows, cancelled,
    noShowRate: held + noShows ? noShows / (held + noShows) : null,
    avgRating: rating?.r ?? null, ratings: Number(rating?.c ?? 0),
    actionRate: Number(items?.total) ? Number(items?.done) / Number(items?.total) : null,
    avgReviewHours: lag?.h ?? null, unreviewedShare: released ? unreviewed / released : null,
  };
}

type EvRow = { ts: string; type: string; conversation_id: string | null; student_id: string | null; meta: string };
export async function demand(scope: Scope, since: string | null = null) {
  const [w, wa] = win("ts", since);
  const rows = await all<EvRow>(`SELECT ts, type, conversation_id, student_id, meta FROM events WHERE type IN ('no_match','recommended') AND ${sf(scope)}${w} ORDER BY ts DESC`, wa);
  const parsed = rows.map((r) => ({ ...r, meta: JSON.parse(r.meta || "{}") as { quality?: string; topic?: string; tags?: string[]; unmet?: string | null; mentors?: string[] } }));
  const gaps = parsed.filter((r) => r.type === "no_match" || r.meta.quality === "partial");
  const tagCount = new Map<string, number>();
  for (const r of parsed) for (const t of r.meta.tags ?? []) tagCount.set(t.toLowerCase(), (tagCount.get(t.toLowerCase()) ?? 0) + 1);
  const unmetCount = new Map<string, number>();
  for (const g of gaps) { const k = (g.meta.unmet ?? g.meta.topic ?? "unspecified").toLowerCase(); unmetCount.set(k, (unmetCount.get(k) ?? 0) + 1); }

  // supply vs demand by mentor domain
  const mentors = await allMentors();
  const byDomain = new Map<string, { mentors: number; recs: number }>();
  const dom = new Map(mentors.map((m) => [m.id, m.domains[0] ?? "Unspecified"]));
  for (const m of mentors) { const d = m.domains[0] ?? "Unspecified"; byDomain.set(d, { mentors: (byDomain.get(d)?.mentors ?? 0) + 1, recs: byDomain.get(d)?.recs ?? 0 }); }
  for (const r of parsed) for (const id of r.meta.mentors ?? []) { const d = dom.get(id); if (d) byDomain.get(d)!.recs++; }
  return {
    total: parsed.length,
    noMatch: parsed.filter((r) => r.type === "no_match").length,
    partial: parsed.filter((r) => r.meta.quality === "partial").length,
    gaps: gaps.slice(0, 25),
    topTags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    topUnmet: [...unmetCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    byDomain: [...byDomain.entries()].map(([domain, v]) => ({ domain, ...v })).sort((a, b) => b.recs - a.recs),
  };
}

export async function mentorTable(scope: Scope) {
  const mentors = await allMentors();
  const recs = await all<{ mentor_id: string; c: number }>(`SELECT mentor_id, COUNT(*) AS c FROM recommendations r WHERE conversation_id IN (SELECT id FROM conversations WHERE ${sf(scope)}) GROUP BY mentor_id`);
  const bk = await all<{ mentor_id: string; status: string; c: number }>(`SELECT mentor_id, status, COUNT(*) AS c FROM bookings WHERE ${sf(scope)} GROUP BY mentor_id, status`);
  const rt = await all<{ mentor_id: string; r: number; c: number }>(`SELECT b.mentor_id, AVG(f.rating) AS r, COUNT(*) AS c FROM feedback f JOIN bookings b ON b.id = f.booking_id WHERE ${sf(scope, "b.student_id")} GROUP BY b.mentor_id`);
  const rec = new Map(recs.map((r) => [r.mentor_id, Number(r.c)]));
  const rows = mentors.map((m) => {
    const b = bk.filter((x) => x.mentor_id === m.id);
    const cnt = (s: string[]) => b.filter((x) => s.includes(x.status)).reduce((a, x) => a + Number(x.c), 0);
    const r = rt.find((x) => x.mentor_id === m.id);
    return { m, recs: rec.get(m.id) ?? 0, booked: cnt(["confirmed", "completed", "no_show_student", "no_show_mentor"]), completed: cnt(["completed"]), noShows: cnt(["no_show_mentor"]), rating: r ? Number(r.r) : null, ratingN: r ? Number(r.c) : 0 };
  });
  const totalRecs = rows.reduce((a, r) => a + r.recs, 0);
  const top5 = [...rows].sort((a, b) => b.recs - a.recs).slice(0, 5).reduce((a, r) => a + r.recs, 0);
  return { rows: rows.sort((a, b) => b.recs - a.recs), totalRecs, top5Share: totalRecs ? top5 / totalRecs : null, neverRecommended: rows.filter((r) => r.recs === 0).length };
}

export async function quality(scope: Scope) {
  const flags = await all<{ id: string; ts: string; kind: string; conversation_id: string | null; booking_id: string | null; detail: string; resolved: number }>(
    `SELECT * FROM flags WHERE resolved = 0 AND (conversation_id IS NULL OR conversation_id IN (SELECT id FROM conversations WHERE ${sf(scope)})) ORDER BY ts DESC LIMIT 60`);
  const evc = async (t: string) => n(`SELECT COUNT(*) AS n FROM events WHERE type = ? AND ${sf(scope)}`, [t]);
  const drafts = await all<{ booking_id: string; created_at: string; student: string; mentor_id: string }>(
    `SELECT s.booking_id, s.created_at, st.name AS student, b.mentor_id FROM summaries s JOIN bookings b ON b.id = s.booking_id JOIN students st ON st.id = b.student_id WHERE s.status = 'draft' AND ${sf(scope, "b.student_id")} ORDER BY s.created_at`);
  const dropped = await n(`SELECT COALESCE(SUM(dropped_items),0) AS n FROM summaries s JOIN bookings b ON b.id = s.booking_id WHERE ${sf(scope, "b.student_id")}`);
  const dist = await all<{ rating: number; c: number }>(`SELECT rating, COUNT(*) AS c FROM feedback WHERE ${sf(scope)} GROUP BY rating ORDER BY rating`);
  return {
    flags, drafts, dropped, dist,
    counts: {
      sensitive: await evc("sensitive"), injection: await evc("injection_attempt"), offTopic: await evc("refused"),
      validationDropped: await evc("validation_dropped"), llmErrors: await evc("llm_error"), conflicts: await evc("booking_conflict"),
      messages: await evc("message_sent"),
    },
  };
}
