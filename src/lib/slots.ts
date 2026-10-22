import { all } from "./db";
import type { Mentor } from "./mentor-types";

export const SLOT_MIN = 30;
const LEAD_MS = 12 * 3600_000;
const DAYS = 14;

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * The sheet has no availability, so we SEED a stable weekly pattern per mentor (documented
 * assumption): 3 weekdays with evening slots, plus one weekend morning, in the mentor's own time zone.
 */
function weeklyPattern(id: string): Map<number, number[]> {
  const h = hash(id);
  const p = new Map<number, number[]>();
  const weekdays = [1, 2, 3, 4, 5];
  for (let i = 0; i < 3; i++) p.set(weekdays[(h + i * 2) % 5], [18 + (h >> (i + 3)) % 3, 20 + ((h >> (i + 5)) % 2)]);
  p.set(h % 2 ? 6 : 0, [10 + (h % 3), 11 + (h % 3)]);
  return p;
}

export function candidateSlots(m: Mentor, from = new Date()): string[] {
  const pat = weeklyPattern(m.id);
  const localNow = new Date(from.getTime() + m.utcOffsetMin * 60_000);
  const out: string[] = [];
  for (let d = 0; d <= DAYS; d++) {
    const day = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + d));
    for (const hour of pat.get(day.getUTCDay()) ?? []) {
      const utc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, 0) - m.utcOffsetMin * 60_000;
      if (utc - from.getTime() >= LEAD_MS) out.push(new Date(utc).toISOString());
    }
  }
  return out;
}

export async function openSlots(m: Mentor): Promise<string[]> {
  const taken = new Set(
    (await all<{ slot_start: string }>("SELECT slot_start FROM bookings WHERE mentor_id = ? AND status IN ('confirmed','completed')", [m.id])).map((r) => r.slot_start),
  );
  return candidateSlots(m).filter((s) => !taken.has(s));
}
