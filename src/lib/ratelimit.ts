// In-memory sliding window. Per server instance only - enough to stop a runaway client in a
// prototype; a shared store (Redis/Upstash) is the production answer.
const hits = new Map<string, number[]>();
export function allow(key: string, max: number, windowMs: number): boolean {
  const t = Date.now();
  const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(t);
  hits.set(key, arr);
  return true;
}
