import { one, run } from "./db";

// Shared sliding window kept in the database so it holds across serverless instances.
// If the database call fails we fall back to a per-instance in-memory window rather than blocking everyone.
const mem = new Map<string, number[]>();
function allowInMemory(key: string, max: number, windowMs: number): boolean {
  const t = Date.now();
  const arr = (mem.get(key) ?? []).filter((x) => t - x < windowMs);
  const ok = arr.length < max;
  if (ok) arr.push(t);
  mem.set(key, arr);
  return ok;
}

export async function allow(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const t = Date.now();
    await run("INSERT INTO rate_hits (key, ts) VALUES (?, ?)", [key, t]);
    const c = await one<{ n: number }>("SELECT COUNT(*) AS n FROM rate_hits WHERE key = ? AND ts > ?", [key, t - windowMs]);
    if (Math.random() < 0.02) await run("DELETE FROM rate_hits WHERE ts < ?", [t - 3600_000]);
    return Number(c?.n ?? 0) <= max; // the attempt just recorded counts, so `max` attempts are allowed
  } catch {
    return allowInMemory(key, max, windowMs);
  }
}
