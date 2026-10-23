import { all, one, run, now } from "./db";
import type { Mentor } from "./mentor-types";

export const SLOT_MIN = 30;
const LEAD_MS = 12 * 3600_000;
const DAYS = 14;

/** Local hours a mentor can be offered, per weekday (0 = Sunday). */
export type Weekly = Record<string, number[]>;
export type Availability = { weekly: Weekly; blackout: string[] };

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Until a mentor sets their own hours we SEED a stable weekly pattern per mentor (documented
 * assumption): 3 weekdays with evening slots, plus one weekend morning, in the mentor's own time zone.
 */
export function seededWeekly(id: string): Weekly {
  const h = hash(id);
  const p: Weekly = {};
  const weekdays = [1, 2, 3, 4, 5];
  for (let i = 0; i < 3; i++) p[weekdays[(h + i * 2) % 5]] = [18 + (h >> (i + 3)) % 3, 20 + ((h >> (i + 5)) % 2)];
  p[h % 2 ? 6 : 0] = [10 + (h % 3), 11 + (h % 3)];
  return p;
}

export const OFFERABLE_HOURS = { from: 6, to: 22 }; // a mentor can offer a start hour in [from, to]

/** Pure: which slot starts (UTC ISO) are offered, given the mentor's weekly hours and blackout dates (mentor-local YYYY-MM-DD). */
export function slotsFor(m: Pick<Mentor, "utcOffsetMin">, av: Availability, from = new Date()): string[] {
  const localNow = new Date(from.getTime() + m.utcOffsetMin * 60_000);
  const out: string[] = [];
  for (let d = 0; d <= DAYS; d++) {
    const day = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + d));
    if (av.blackout.includes(day.toISOString().slice(0, 10))) continue;
    for (const hour of av.weekly[String(day.getUTCDay())] ?? []) {
      const utc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0) - m.utcOffsetMin * 60_000;
      if (utc - from.getTime() >= LEAD_MS) out.push(new Date(utc).toISOString());
    }
  }
  return out;
}

export async function availabilityFor(m: Pick<Mentor, "id">): Promise<Availability & { custom: boolean }> {
  const r = await one<{ weekly: string; blackout: string }>("SELECT weekly, blackout FROM mentor_availability WHERE mentor_id = ?", [m.id]);
  if (!r) return { weekly: seededWeekly(m.id), blackout: [], custom: false };
  return { weekly: JSON.parse(r.weekly), blackout: JSON.parse(r.blackout), custom: true };
}

/** Validates and stores a mentor's own hours. Returns an error message, or null on success. */
export async function saveAvailability(mentorId: string, input: { weekly: Weekly; blackout: string[] }): Promise<string | null> {
  const weekly: Weekly = {};
  for (const [dow, hours] of Object.entries(input.weekly)) {
    if (!/^[0-6]$/.test(dow) || !Array.isArray(hours)) return "Invalid day.";
    const hs = [...new Set(hours)].filter((h) => Number.isInteger(h));
    if (hs.some((h) => h < OFFERABLE_HOURS.from || h > OFFERABLE_HOURS.to)) return `Hours must be between ${OFFERABLE_HOURS.from}:00 and ${OFFERABLE_HOURS.to}:00.`;
    if (hs.length) weekly[dow] = hs.sort((a, b) => a - b);
  }
  const blackout = [...new Set(input.blackout)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(0, 60);
  if (Object.values(weekly).reduce((a, h) => a + h.length, 0) > 40) return "That's a lot of hours - pick up to 40 slots a week.";
  await run(
    "INSERT INTO mentor_availability (mentor_id, weekly, blackout, updated_at) VALUES (?,?,?,?) ON CONFLICT(mentor_id) DO UPDATE SET weekly = excluded.weekly, blackout = excluded.blackout, updated_at = excluded.updated_at",
    [mentorId, JSON.stringify(weekly), JSON.stringify(blackout), now()],
  );
  return null;
}

/** Everything the mentor currently offers (including slots already booked). */
export async function candidateSlots(m: Mentor, from = new Date()): Promise<string[]> {
  return slotsFor(m, await availabilityFor(m), from);
}

export async function openSlots(m: Mentor): Promise<string[]> {
  const taken = new Set(
    (await all<{ slot_start: string }>("SELECT slot_start FROM bookings WHERE mentor_id = ? AND status IN ('confirmed','completed')", [m.id])).map((r) => r.slot_start),
  );
  return (await candidateSlots(m)).filter((s) => !taken.has(s));
}
