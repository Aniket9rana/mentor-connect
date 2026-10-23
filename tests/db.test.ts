import { before, test } from "node:test";
import assert from "node:assert/strict";
import { pointAtTempDb } from "./helpers";

pointAtTempDb();

type Mods = {
  db: typeof import("../src/lib/db");
  booking: typeof import("../src/lib/booking");
  slots: typeof import("../src/lib/slots");
  signin: typeof import("../src/lib/signin");
  rate: typeof import("../src/lib/ratelimit");
  contacts: typeof import("../src/lib/contacts");
  waitlist: typeof import("../src/lib/waitlist");
  privacy: typeof import("../src/lib/privacy");
  shortlist: typeof import("../src/lib/shortlist");
  mentors: typeof import("../src/lib/mentors");
  events: typeof import("../src/lib/events");
};
let m: Mods;
before(async () => {
  m = {
    db: await import("../src/lib/db"),
    booking: await import("../src/lib/booking"),
    slots: await import("../src/lib/slots"),
    signin: await import("../src/lib/signin"),
    rate: await import("../src/lib/ratelimit"),
    contacts: await import("../src/lib/contacts"),
    waitlist: await import("../src/lib/waitlist"),
    privacy: await import("../src/lib/privacy"),
    shortlist: await import("../src/lib/shortlist"),
    mentors: await import("../src/lib/mentors"),
    events: await import("../src/lib/events"),
  };
});

const student = (id: string, email = `${id}@example.com`) => ({ id, name: id, email, tz: "Asia/Kolkata", is_demo: 0 });
async function mkStudent(id: string) {
  await m.db.run("INSERT INTO students (id, name, email, tz, is_demo, created_at) VALUES (?,?,?,?,0,?)", [id, id, `${id}@example.com`, "Asia/Kolkata", m.db.now()]);
  return student(id);
}

test("mentors are seeded from the sheet", async () => {
  assert.equal((await m.mentors.allMentors()).length, 50);
});

test("double booking is impossible: the second student gets a conflict, not a booking", async () => {
  const a = await mkStudent("stuA");
  const b = await mkStudent("stuB");
  const mentor = (await m.mentors.getMentor("M001"))!;
  const slot = (await m.slots.openSlots(mentor))[0];
  const first = await m.booking.createBooking({ student: a, mentorId: mentor.id, slotStart: slot });
  const second = await m.booking.createBooking({ student: b, mentorId: mentor.id, slotStart: slot });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(!second.ok && second.code, "conflict");
  assert.ok(!(await m.slots.openSlots(mentor)).includes(slot), "booked slot is no longer offered");
});

test("a tampered slot that the mentor never offered is refused", async () => {
  const s = await mkStudent("stuT");
  const r = await m.booking.createBooking({ student: s, mentorId: "M002", slotStart: "2030-01-01T03:00:00.000Z" });
  assert.equal(!r.ok && r.code, "invalid_slot");
});

test("mentor-set availability changes what students can book", async () => {
  const mentor = (await m.mentors.getMentor("M003"))!;
  assert.equal((await m.slots.availabilityFor(mentor)).custom, false);
  assert.equal(await m.slots.saveAvailability("M003", { weekly: { "1": [9, 10], "3": [14] }, blackout: [] }), null);
  const open = await m.slots.openSlots(mentor);
  assert.ok(open.length > 0);
  for (const s of open) assert.ok([1, 3].includes(new Date(new Date(s).getTime() + mentor.utcOffsetMin * 60_000).getUTCDay()));
  assert.match((await m.slots.saveAvailability("M003", { weekly: { "1": [3] }, blackout: [] })) ?? "", /between/);
  assert.match((await m.slots.saveAvailability("M003", { weekly: { "9": [9] }, blackout: [] })) ?? "", /Invalid/);
});

test("persistent rate limit blocks after max attempts and is per key", async () => {
  const key = `t:${Math.random()}`;
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await m.rate.allow(key, 3, 60_000));
  assert.deepEqual(results, [true, true, true, false, false]);
  assert.equal(await m.rate.allow(`${key}:other`, 3, 60_000), true);
});

test("sign-in: instant without a mail provider, one-time link when verification is on", async () => {
  const instant = await m.signin.startSignIn({ name: "Ann", email: "ann@example.com" });
  assert.equal(instant.mode, "instant");

  process.env.REQUIRE_EMAIL_VERIFY = "on";
  try {
    const r = await m.signin.startSignIn({ name: "Ann Hacker", email: "ann@example.com" });
    assert.equal(r.mode, "email");
    // the existing student's name was NOT changed by an unverified request
    assert.equal((await m.db.one<{ name: string }>("SELECT name FROM students WHERE email = 'ann@example.com'"))!.name, "Ann");
    const mail = (await m.db.one<{ link: string }>("SELECT link FROM emails WHERE kind = 'signin' AND to_email = 'ann@example.com' ORDER BY ts DESC"))!;
    const token = mail.link.split("/signin/")[1];
    const id = await m.signin.consumeSignIn(token);
    assert.ok(id);
    assert.equal(await m.signin.consumeSignIn(token), null, "single use");
    assert.equal((await m.db.one<{ name: string }>("SELECT name FROM students WHERE id = ?", [id!]))!.name, "Ann Hacker");

    await m.signin.startSignIn({ name: "Bob", email: "bob@example.com" });
    const bobMail = (await m.db.one<{ link: string }>("SELECT link FROM emails WHERE to_email = 'bob@example.com'"))!;
    const bobToken = bobMail.link.split("/signin/")[1];
    await m.db.run("UPDATE login_tokens SET expires_at = ? WHERE token_hash = ?", [new Date(Date.now() - 1000).toISOString(), m.signin.hashToken(bobToken)]);
    assert.equal(await m.signin.consumeSignIn(bobToken), null, "expired");
    assert.equal(await m.signin.consumeSignIn("not-a-token"), null);

    // demo addresses stay outbox-only and skip the link
    assert.equal((await m.signin.startSignIn({ name: "Demo", email: "x@demo.mentorconnect.test" })).mode, "instant");
    // mail bombing one address is capped
    let limited = false;
    for (let i = 0; i < 5; i++) limited ||= (await m.signin.startSignIn({ name: "Z", email: "z@example.com" })).mode === "limited";
    assert.ok(limited);
  } finally {
    delete process.env.REQUIRE_EMAIL_VERIFY;
  }
  assert.equal(m.signin.verifyRequired(), false);
});

test("only the hash of a sign-in token is stored", async () => {
  const rows = await m.db.all<{ token_hash: string }>("SELECT token_hash FROM login_tokens");
  assert.ok(rows.length > 0);
  for (const r of rows) assert.match(r.token_hash, /^[0-9a-f]{64}$/);
});

test("mentor contact falls back to the outbox-only mailbox, and a real one wins", async () => {
  assert.match(await m.contacts.mentorEmail("M010"), /\.test$/);
  await m.contacts.setMentorContact("M010", "Mentor@Example.com");
  assert.equal(await m.contacts.mentorEmail("M010"), "mentor@example.com");
  await m.contacts.setMentorContact("M010", null);
  assert.match(await m.contacts.mentorEmail("M010"), /\.test$/);
});

test("reminders go out once, to both sides, in local time", async () => {
  const s = await mkStudent("stuR");
  const soon = new Date(Date.now() + 10 * 3600_000).toISOString();
  await m.db.run("INSERT INTO bookings (id, student_id, mentor_id, slot_start, status, mentor_token, created_at, updated_at) VALUES ('bkR', ?, 'M020', ?, 'confirmed', 'tokR', ?, ?)", [s.id, soon, m.db.now(), m.db.now()]);
  const far = new Date(Date.now() + 5 * 86400_000).toISOString();
  await m.db.run("INSERT INTO bookings (id, student_id, mentor_id, slot_start, status, mentor_token, created_at, updated_at) VALUES ('bkFar', ?, 'M021', ?, 'confirmed', 'tokFar', ?, ?)", [s.id, far, m.db.now(), m.db.now()]);
  await m.db.run("UPDATE bookings SET reminded = 1 WHERE id NOT IN ('bkR','bkFar')"); // earlier tests' bookings may also fall in the window
  assert.equal(await m.booking.sendReminders(), 1);
  assert.equal(await m.booking.sendReminders(), 0);
  const mails = await m.db.all<{ kind: string; body: string }>("SELECT kind, body FROM emails WHERE kind IN ('reminder','mentor_reminder')");
  assert.deepEqual(mails.map((x) => x.kind).sort(), ["mentor_reminder", "reminder"]);
  assert.ok(mails.every((x) => !x.body.includes("T") || !/\d{4}-\d{2}-\d{2}T/.test(x.body)), "no raw ISO timestamps in emails");
});

test("waitlist: only for partial/no-match rounds, once per conversation, notify once", async () => {
  const s = await mkStudent("stuW");
  await m.db.run("INSERT INTO conversations (id, student_id, topic, created_at, updated_at) VALUES ('cW', ?, 'ux design', ?, ?)", [s.id, m.db.now(), m.db.now()]);
  assert.equal((await m.waitlist.joinWaitlist(s.id, "cW")).ok, false, "no recommendation yet");
  await m.db.run("INSERT INTO messages (id, conversation_id, role, content, payload, created_at) VALUES ('mW', 'cW', 'assistant', 'x', ?, ?)", [JSON.stringify({ kind: "recommend", matchQuality: "none", unmet: "UX research" }), m.db.now()]);
  const r1 = await m.waitlist.joinWaitlist(s.id, "cW");
  assert.deepEqual(r1, { ok: true, already: false });
  assert.deepEqual(await m.waitlist.joinWaitlist(s.id, "cW"), { ok: true, already: true });
  const other = await mkStudent("stuW2");
  assert.equal((await m.waitlist.joinWaitlist(other.id, "cW")).ok, false, "can't waitlist someone else's conversation");
  const row = (await m.waitlist.listWaitlist("all"))[0];
  assert.equal(row.unmet, "UX research");
  assert.equal(await m.waitlist.notifyWaitlist(row.id), true);
  assert.equal(await m.waitlist.notifyWaitlist(row.id), false);
});

test("shortlist: save, dedupe, cap, unknown mentor", async () => {
  const s = await mkStudent("stuS");
  assert.equal(await m.shortlist.setSaved(s.id, "M001", true), null);
  assert.equal(await m.shortlist.setSaved(s.id, "M001", true), null);
  assert.deepEqual(await m.shortlist.shortlistIds(s.id), ["M001"]);
  assert.match((await m.shortlist.setSaved(s.id, "M999", true)) ?? "", /isn't on our list/);
  assert.equal(await m.shortlist.setSaved(s.id, "M001", false), null);
  assert.deepEqual(await m.shortlist.shortlistIds(s.id), []);
});

test("urgent flags raise a team alert; demo students' flags don't", async () => {
  process.env.ADMIN_ALERT_EMAIL = "team@example.com";
  try {
    const s = await mkStudent("stuF");
    await m.db.run("INSERT INTO conversations (id, student_id, created_at, updated_at) VALUES ('cF', ?, ?, ?)", [s.id, m.db.now(), m.db.now()]);
    await m.events.flag("sensitive", { conversationId: "cF" }, "x");
    await m.events.flag("injection_attempt", { conversationId: "cF" }, "not urgent");
    const alerts = await m.db.all<{ body: string }>("SELECT body FROM emails WHERE kind = 'team_alert'");
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].body, /\/admin\/conversations\/cF/);
    assert.ok(!alerts[0].body.includes("x@"), "alert carries a link, not message content");

    await m.db.run("INSERT INTO students (id, name, email, is_demo, created_at) VALUES ('stuDemo','D','d@demo.mentorconnect.test',1,?)", [m.db.now()]);
    await m.db.run("INSERT INTO conversations (id, student_id, created_at, updated_at) VALUES ('cD','stuDemo',?,?)", [m.db.now(), m.db.now()]);
    await m.events.flag("sensitive", { conversationId: "cD" }, "demo");
    assert.equal((await m.db.all("SELECT 1 FROM emails WHERE kind = 'team_alert'")).length, 1);
  } finally {
    delete process.env.ADMIN_ALERT_EMAIL;
  }
});

test("delete my data removes the student, their transcript and mentor mail, and frees the slot", async () => {
  const s = await mkStudent("stuDel");
  const keeper = await mkStudent("stuKeep");
  const mentor = (await m.mentors.getMentor("M030"))!;
  const slots = await m.slots.openSlots(mentor);
  const r = await m.booking.createBooking({ student: s, mentorId: mentor.id, slotStart: slots[0] });
  const k = await m.booking.createBooking({ student: keeper, mentorId: mentor.id, slotStart: slots[1] });
  assert.ok(r.ok && k.ok);
  const id = r.ok ? r.booking.id : "";
  await m.db.run("UPDATE bookings SET transcript = 'secret words' WHERE id = ?", [id]);
  await m.db.run("INSERT INTO summaries (id, booking_id, content, source, status, created_at) VALUES ('smDel', ?, '{}', 'x', 'draft', ?)", [id, m.db.now()]);
  await m.shortlist.setSaved(s.id, "M001", true);

  assert.equal(await m.privacy.deleteStudentData(s.id), true);
  for (const t of ["students WHERE id", "bookings WHERE student_id", "shortlist WHERE student_id"]) assert.equal((await m.db.all(`SELECT 1 FROM ${t} = ?`, [s.id])).length, 0, t);
  assert.equal((await m.db.all("SELECT 1 FROM summaries WHERE booking_id = ?", [id])).length, 0);
  assert.equal((await m.db.all("SELECT 1 FROM emails WHERE to_email = ?", [s.email])).length, 0);
  assert.equal((await m.db.all("SELECT 1 FROM emails WHERE body LIKE '%stuDel%'")).length, 0, "mentor mail naming the student is gone");
  assert.ok((await m.slots.openSlots(mentor)).includes(slots[0]), "slot is open again");
  // someone else's data is untouched
  assert.equal((await m.db.all("SELECT 1 FROM bookings WHERE student_id = ?", [keeper.id])).length, 1);
  assert.equal(await m.privacy.deleteStudentData(s.id), false);
});
