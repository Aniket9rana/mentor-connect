import { all, one } from "./db";
import type { Mentor } from "./mentor-types";

export async function allMentors(): Promise<Mentor[]> {
  return (await all<{ data: string }>("SELECT data FROM mentors ORDER BY id")).map((r) => JSON.parse(r.data));
}
export async function getMentor(id: string): Promise<Mentor | undefined> {
  const r = await one<{ data: string }>("SELECT data FROM mentors WHERE id = ?", [id]);
  return r ? JSON.parse(r.data) : undefined;
}

const yn = (v: boolean | null, yes: string, no: string) => (v === true ? yes : v === false ? no : null);

/** Facts shown to students. Built only from the sheet; empty fields are omitted, never filled in. */
export function mentorFacts(m: Mentor): { label: string; value: string }[] {
  const f: { label: string; value: string }[] = [];
  if (m.domains.length) f.push({ label: "Domain", value: m.domains.join(", ") });
  const sectors = [m.masterSector, ...m.sectors].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  if (sectors.length) f.push({ label: "Sectors", value: sectors.join(", ") });
  if (m.roles.length) f.push({ label: "Roles of expertise", value: m.roles.join(", ") });
  if (m.seniority) f.push({ label: "Seniority", value: m.seniority });
  const ai = [
    yn(m.aiNative, "AI native", "Not AI native"),
    yn(m.builtAiProduct, "Has built AI products / automations / workflows", "Has not built AI products"),
    m.aiSubDomain ? `AI focus: ${m.aiSubDomain}` : null,
    m.aiTools.length ? `AI tools: ${m.aiTools.join(", ")}` : null,
  ].filter(Boolean);
  if (ai.length) f.push({ label: "AI experience", value: ai.join(" · ") });
  if (m.tools.length) f.push({ label: "Tools", value: m.tools.join(", ") });
  if (m.city) f.push({ label: "Based in", value: m.city });
  return f;
}

export function headline(m: Mentor): string {
  return [m.domains.slice(0, 2).join(" / ") || null, m.masterSector].filter(Boolean).join(" · ") || "Profile details limited";
}

/** One compact line per mentor for the model's catalogue. UNKNOWN is stated explicitly. */
export function catalogueLine(m: Mentor): string {
  const unk = "unknown";
  const list = (a: string[]) => (a.length ? a.join("; ") : unk);
  return [
    `${m.id} | ${m.name}`,
    `domain: ${list(m.domains)}`,
    `main sector: ${m.masterSector ?? unk}`,
    `sectors: ${list(m.sectors)}`,
    `roles: ${list(m.roles)}`,
    `seniority: ${m.seniority ?? unk}`,
    `ai native: ${m.aiNative === null ? unk : m.aiNative ? "yes" : "no"}`,
    `built AI product/automation: ${m.builtAiProduct === null ? unk : m.builtAiProduct ? "yes" : "no"}`,
    `ai focus: ${m.aiSubDomain ?? unk}`,
    `ai tools: ${list(m.aiTools)}`,
    `other tools: ${list(m.tools)}`,
    `city: ${m.city ?? unk}`,
    `mentorship quality: ${m.mentorshipQuality ?? unk}`,
    `profile: ${m.profile}`,
  ].join(" | ");
}
