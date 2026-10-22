import { currentStudent, isAdmin, type Student } from "./session";
import { allow } from "./ratelimit";

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400, extra: Record<string, unknown> = {}) => json({ ok: false, message, ...extra }, status);

export async function studentOr401(): Promise<Student | Response> {
  return (await currentStudent()) ?? fail("Please start from the home page first.", 401);
}
export async function adminOr401(): Promise<true | Response> {
  return (await isAdmin()) ? true : fail("Admin only.", 401);
}
export const ipOf = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
export const limited = (req: Request, scope: string, max: number, windowMs = 60_000) => !allow(`${scope}:${ipOf(req)}`, max, windowMs);
export const body = async <T = Record<string, unknown>>(req: Request): Promise<T> => {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
};
