import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { one } from "./db";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  // never sign cookies with a known default in production: anyone could forge a session
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return "dev-only-secret";
};
const mac = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
export const sign = (v: string) => `${v}.${mac(v)}`;
export function unsign(s: string | undefined): string | null {
  if (!s) return null;
  const i = s.lastIndexOf(".");
  if (i < 0) return null;
  const v = s.slice(0, i);
  const a = Buffer.from(mac(v));
  const b = Buffer.from(s.slice(i + 1));
  return a.length === b.length && timingSafeEqual(a, b) ? v : null;
}

export type Student = { id: string; name: string; email: string; tz: string | null; is_demo: number };

export async function currentStudent(): Promise<Student | null> {
  const id = unsign((await cookies()).get("mc_student")?.value);
  if (!id) return null;
  return (await one<Student>("SELECT * FROM students WHERE id = ?", [id])) ?? null;
}

export const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 90 };

export async function isAdmin(): Promise<boolean> {
  return unsign((await cookies()).get("mc_admin")?.value) === "admin";
}
