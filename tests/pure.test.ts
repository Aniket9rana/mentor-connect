import { test } from "node:test";
import assert from "node:assert/strict";
import { corpusFrom, ungrounded } from "../src/lib/grounding";
import { cleanTranscript, groundSummary, qualityGate, quoteInTranscript, SummarySchema } from "../src/lib/summarise";
import { csvCell, toCsv } from "../src/lib/csv";
import { formatWhen } from "../src/lib/format";
import { seededWeekly, slotsFor } from "../src/lib/slots";
import { mentorLinkExpired } from "../src/lib/booking";
import { parseRange, sinceOf } from "../src/lib/admin-stats";
import { catalogueLine } from "../src/lib/mentors";
import mentorFile from "../data/mentors.json";
import type { Mentor } from "../src/lib/mentor-types";

const IST = { utcOffsetMin: 330 };

test("grounding: invented employers/years are flagged, record facts are not", () => {
  const corpus = corpusFrom("domain: Product Management; sector: SaaS; roles: Product Manager", "I want to move into product");
  assert.deepEqual(ungrounded("Great fit for product and SaaS work.", corpus), []);
  assert.ok(ungrounded("She worked at Google for 12 years.", corpus).length >= 1);
});

test("grounding: generic career acronyms are allowed", () => {
  assert.deepEqual(ungrounded("Strong in PM and GTM.", corpusFrom("")), []);
});

test("transcript cleaning strips vtt/srt scaffolding", () => {
  const raw = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nMentor: Start with a portfolio.\n\n2\n00:00:05.000 --> 00:00:08.000\nStudent: Okay.";
  assert.equal(cleanTranscript(raw), "Mentor: Start with a portfolio.\nStudent: Okay.");
});

test("quality gate rejects short, garbled and repetitive input", () => {
  assert.equal(qualityGate("too short", "transcript").ok, false);
  assert.equal(qualityGate("1234 5678 ".repeat(60), "transcript").ok, false);
  assert.equal(qualityGate("word ".repeat(100), "transcript").ok, false);
  assert.equal(qualityGate(Array.from({ length: 120 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i}`).join(" "), "transcript").ok, true);
});

test("quote verification: verbatim passes, invented fails, light edits tolerated", () => {
  const t = "you should build a small portfolio of three real projects before applying to product roles".toLowerCase();
  assert.equal(quoteInTranscript("build a small portfolio of three real projects", t), true);
  assert.equal(quoteInTranscript("join a hedge fund immediately after graduation", t), false);
});

test("groundSummary drops items whose quote is not in the transcript", () => {
  const transcript = "Mentor: you should build a small portfolio of three real projects before applying. Read the book Inspired by Marty Cagan.";
  const base = SummarySchema.parse({
    transcript_quality: "good", headline: "h", summary: "s", key_advice: [], action_items: [], resources: [], open_questions: [], not_discussed: [],
    next_step: { type: "none", text: "n" },
  });
  const { content, dropped } = groundSummary(
    {
      ...base,
      action_items: [
        { task: "Build a portfolio", due_in_days: 14, evidence_quote: "build a small portfolio of three real projects" },
        { task: "Apply to Google", due_in_days: 7, evidence_quote: "apply to google by friday for sure" },
      ],
      resources: [{ name: "Inspired", note: "book", evidence_quote: "Read the book Inspired by Marty Cagan" }, { name: "Cracking the PM Interview", note: "book", evidence_quote: "Read the book Inspired by Marty Cagan" }],
    },
    transcript,
  );
  assert.equal(content.action_items.length, 1);
  assert.equal(content.resources.length, 1); // a resource name that never appears is dropped
  assert.equal(dropped, 2);
});

test("csv: quoting and formula-injection guard", () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(\"http://x\")"), '"\'=HYPERLINK(""http://x"")"');
  assert.equal(csvCell("+1 555"), "'+1 555");
  assert.equal(csvCell(null), "");
  assert.equal(toCsv([{ a: 1, b: "x,y" }]), 'a,b\n1,"x,y"\n');
});

test("email time formatting uses the recipient's zone", () => {
  assert.match(formatWhen("2026-11-02T13:30:00.000Z", { tz: "Asia/Kolkata" }), /7:00 pm/i);
  assert.match(formatWhen("2026-11-02T13:30:00.000Z", { offsetMin: 330 }), /7:00 pm.*UTC\+05:30/i);
  assert.match(formatWhen("2026-11-02T13:30:00.000Z", {}), /1:30 pm UTC/i);
  assert.match(formatWhen("2026-11-02T13:30:00.000Z", { tz: "Not/AZone" }), /UTC/); // bad tz falls back instead of throwing
});

test("slots: seeded pattern is stable, in the future, 12h lead, and local to the mentor", () => {
  const from = new Date("2026-11-02T06:00:00.000Z");
  const av = { weekly: seededWeekly("M013"), blackout: [] };
  const a = slotsFor(IST, av, from);
  assert.deepEqual(a, slotsFor(IST, av, from));
  assert.ok(a.length > 0);
  for (const s of a) {
    assert.ok(new Date(s).getTime() - from.getTime() >= 12 * 3600_000);
    const localHour = new Date(new Date(s).getTime() + 330 * 60_000).getUTCHours();
    assert.ok(localHour >= 10 && localHour <= 21, `local hour ${localHour}`);
  }
});

test("slots: mentor's own hours replace the seed, blackout days are skipped", () => {
  const from = new Date("2026-11-02T00:00:00.000Z"); // Monday 05:30 IST
  const monAndTue = slotsFor(IST, { weekly: { "1": [9], "2": [9] }, blackout: [] }, from);
  assert.ok(monAndTue.every((s) => [1, 2].includes(new Date(new Date(s).getTime() + 330 * 60_000).getUTCDay())));
  const withoutNov3 = slotsFor(IST, { weekly: { "1": [9], "2": [9] }, blackout: ["2026-11-03"] }, from);
  assert.ok(!withoutNov3.some((s) => new Date(new Date(s).getTime() + 330 * 60_000).toISOString().startsWith("2026-11-03")));
  assert.equal(withoutNov3.length, monAndTue.length - 1);
});

test("mentor links expire 30 days after the call", () => {
  const slot = "2026-11-02T13:30:00.000Z";
  assert.equal(mentorLinkExpired({ slot_start: slot }, Date.parse("2026-12-01T00:00:00Z")), false);
  assert.equal(mentorLinkExpired({ slot_start: slot }, Date.parse("2026-12-03T00:00:00Z")), true);
});

test("admin range helpers", () => {
  assert.equal(parseRange("30d"), "30d");
  assert.equal(parseRange("junk"), "all");
  assert.equal(sinceOf("all"), null);
  assert.equal(sinceOf("7d", Date.parse("2026-11-08T00:00:00Z")), "2026-11-01T00:00:00.000Z");
});

test("no contact data reaches the model's catalogue", () => {
  for (const m of (mentorFile as { mentors: Mentor[] }).mentors) {
    const line = catalogueLine(m);
    assert.ok(!/@|https?:|linkedin\.com|\+?\d[\d\s-]{8,}/i.test(line), `${m.id}: ${line}`);
    assert.ok(!/Company \d+/i.test(line), `${m.id} leaks a company label`);
  }
});
