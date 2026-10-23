import type { Mentor } from "./mentor-types";

/**
 * Cheap deterministic guard against invented specifics. Anything the model writes about a mentor
 * must be traceable to the mentor's record or to what the student said: a capitalised word or a
 * year/quantity that appears in neither is treated as invented.
 */
// Generic career acronyms say nothing about a specific mentor, so they are never treated as invented.
const ALLOW = new Set([
  "i", "i'm", "i'll", "i've", "mentor", "mentors", "mesa", "connect", "ok", "okay", "hi", "hello", "hey", "thanks", "yes", "no",
  "pm", "pms", "cs", "csm", "kpi", "kpis", "okr", "okrs", "b2b", "b2c", "cv", "jd", "ux", "ui", "roi", "gtm", "ai", "faq", "ml", "dl", "hr",
]);

const norm = (w: string) => w.toLowerCase().replace(/[’]/g, "'").replace(/[.\-'&+]+$/g, "").replace(/'s$/, "");
const WORD = /[A-Za-z0-9][A-Za-z0-9'’&+.-]*/g;

export function corpusFrom(...parts: string[]): Set<string> {
  const set = new Set<string>(ALLOW);
  for (const p of parts)
    for (const w of p.match(WORD) ?? [])
      for (const piece of [w, ...w.split("-")]) {
        set.add(norm(piece));
        set.add(norm(piece).replace(/s$/, ""));
      }
  return set;
}

export function mentorText(m: Mentor): string {
  return [m.id, m.name, ...m.domains, m.masterSector ?? "", ...m.sectors, ...m.roles, m.seniority ?? "", m.aiSubDomain ?? "", ...m.aiTools, ...m.tools, m.city ?? "", m.mentorshipQuality ?? ""].join(" ");
}

export function ungrounded(text: string, corpus: Set<string>): string[] {
  const bad = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?:])\s+|\n+/)) {
    const words = sentence.match(WORD) ?? [];
    words.forEach((word, i) => {
      // "SaaS-specific" is checked as "SaaS" + "specific": only capitalised parts can be proper nouns
      for (const w of word.split("-")) {
        const n = norm(w);
        if (n && (i > 0 || word.includes("-")) && /^[A-Z]/.test(w) && !corpus.has(n) && !corpus.has(n.replace(/s$/, ""))) bad.add(w);
      }
    });
  }
  for (const m of text.matchAll(/\b(\d{2,}|\d+\+?\s*(?:years?|yrs|months?))\b/gi)) {
    const n = m[0].match(/\d+/)![0];
    if (!corpus.has(n)) bad.add(m[0]);
  }
  return [...bad];
}
