import { createClient, type Client, type InValue } from "@libsql/client";
import { randomBytes } from "node:crypto";
import mentorFile from "../../data/mentors.json";
import type { Mentor } from "./mentor-types";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mentors (id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS students (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, tz TEXT,
     is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS conversations (
     id TEXT PRIMARY KEY, student_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
     topic TEXT, outcome TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (
     id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
     payload TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS messages_conv ON messages(conversation_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS recommendations (
     id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, message_id TEXT NOT NULL, mentor_id TEXT NOT NULL,
     rank INTEGER NOT NULL, reason TEXT NOT NULL, gaps TEXT, ask TEXT, grounded INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bookings (
     id TEXT PRIMARY KEY, student_id TEXT NOT NULL, mentor_id TEXT NOT NULL, conversation_id TEXT,
     slot_start TEXT NOT NULL, duration_min INTEGER NOT NULL DEFAULT 30,
     status TEXT NOT NULL DEFAULT 'confirmed', brief TEXT, meeting_url TEXT, mentor_token TEXT NOT NULL,
     transcript TEXT, transcript_source TEXT, rescheduled_from TEXT,
     created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  // one live booking per mentor+slot, enforced by the database, not by application checks
  `CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot ON bookings(mentor_id, slot_start) WHERE status IN ('confirmed','completed')`,
  `CREATE TABLE IF NOT EXISTS summaries (
     id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE, content TEXT NOT NULL,
     source TEXT NOT NULL, status TEXT NOT NULL, dropped_items INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL, released_at TEXT, reviewed_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS action_items (
     id TEXT PRIMARY KEY, summary_id TEXT NOT NULL, booking_id TEXT NOT NULL, student_id TEXT NOT NULL,
     text TEXT NOT NULL, due_at TEXT, done INTEGER NOT NULL DEFAULT 0, done_at TEXT, nudged INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS feedback (
     booking_id TEXT PRIMARY KEY, student_id TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (
     id TEXT PRIMARY KEY, ts TEXT NOT NULL, type TEXT NOT NULL, student_id TEXT, conversation_id TEXT,
     booking_id TEXT, meta TEXT)`,
  `CREATE INDEX IF NOT EXISTS events_type ON events(type, ts)`,
  `CREATE TABLE IF NOT EXISTS flags (
     id TEXT PRIMARY KEY, ts TEXT NOT NULL, kind TEXT NOT NULL, conversation_id TEXT, booking_id TEXT,
     detail TEXT, resolved INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS emails (
     id TEXT PRIMARY KEY, ts TEXT NOT NULL, to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
     kind TEXT NOT NULL, link TEXT, delivered INTEGER NOT NULL DEFAULT 0)`,
  // sign-in links: only the hash of the token is stored
  `CREATE TABLE IF NOT EXISTS login_tokens (
     token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, tz TEXT,
     expires_at TEXT NOT NULL, used_at TEXT)`,
  // real mentor mailboxes live ONLY here: never loaded into prompts, cards or student-facing pages
  `CREATE TABLE IF NOT EXISTS mentor_contacts (mentor_id TEXT PRIMARY KEY, email TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  // mentor-owned availability; overrides the seeded weekly pattern. weekly = {"1":[18,19]} (local hours), blackout = ["2026-11-02"]
  `CREATE TABLE IF NOT EXISTS mentor_availability (mentor_id TEXT PRIMARY KEY, weekly TEXT NOT NULL, blackout TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS waitlist (
     id TEXT PRIMARY KEY, student_id TEXT NOT NULL, conversation_id TEXT NOT NULL, topic TEXT, unmet TEXT,
     status TEXT NOT NULL DEFAULT 'waiting', created_at TEXT NOT NULL, notified_at TEXT)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS waitlist_conv ON waitlist(conversation_id)`,
  `CREATE TABLE IF NOT EXISTS shortlist (student_id TEXT NOT NULL, mentor_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (student_id, mentor_id))`,
  `CREATE TABLE IF NOT EXISTS rate_hits (key TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS rate_hits_key ON rate_hits(key, ts)`,
];

// Columns added after first release. CREATE TABLE IF NOT EXISTS won't add them to an existing (e.g. Turso) database.
const MIGRATIONS = [`ALTER TABLE bookings ADD COLUMN reminded INTEGER NOT NULL DEFAULT 0`];

type G = typeof globalThis & { __mc?: { client: Client; ready: Promise<void> } };
const g = globalThis as G;

const dbUrl = () => process.env.TURSO_DATABASE_URL ?? (process.env.VERCEL ? "file:/tmp/mentor-connect.db" : "file:data/app.db");

function open(): Client {
  return createClient({ url: dbUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
}

async function init(client: Client) {
  if (dbUrl().startsWith("file:")) {
    await client.execute("PRAGMA busy_timeout = 10000"); // local file: wait on locks instead of failing
    await client.execute("PRAGMA journal_mode = WAL");
  }
  for (const stmt of SCHEMA) await client.execute(stmt);
  for (const stmt of MIGRATIONS) {
    try {
      await client.execute(stmt);
    } catch (e) {
      if (!/duplicate column/i.test(String((e as Error).message))) throw e;
    }
  }
  const n = await client.execute("SELECT COUNT(*) AS n FROM mentors");
  if (Number(n.rows[0].n) === 0) {
    await client.batch(
      (mentorFile.mentors as Mentor[]).map((m) => ({ sql: "INSERT INTO mentors (id, data) VALUES (?, ?)", args: [m.id, JSON.stringify(m)] })),
      "write",
    );
  }
}

export async function db(): Promise<Client> {
  if (!g.__mc) {
    const client = open();
    g.__mc = { client, ready: init(client) };
  }
  await g.__mc.ready;
  return g.__mc.client;
}

export async function all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  const rs = await (await db()).execute({ sql, args });
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]]))) as T[];
}
export async function one<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}
export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}

export const now = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}_${randomBytes(6).toString("hex")}`;
export const token = () => randomBytes(18).toString("base64url");
