import { z } from "zod";
import { ensureConversation, handleTurn, LIMITS, loadMessages } from "@/lib/assistant";
import { body, fail, json, limited, studentOr401 } from "@/lib/http";
import { allow } from "@/lib/ratelimit";
import { one } from "@/lib/db";

export const maxDuration = 90;
const In = z.object({ conversationId: z.string().nullish(), message: z.string().trim().min(1, "Type a message first.") });

export async function POST(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  if (await limited(req, "chat-ip", 40) || !(await allow(`chat-stu:${s.id}`, 20, 60_000))) return fail("You're sending messages quickly - give it a few seconds.", 429);
  const p = In.safeParse(await body(req));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid message.");
  if (p.data.message.length > LIMITS.messageChars) return fail(`Please keep messages under ${LIMITS.messageChars} characters.`, 413);

  const conversationId = await ensureConversation(s.id, p.data.conversationId);
  const n = await one<{ n: number }>("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", [conversationId]);
  if (Number(n?.n) >= LIMITS.messagesPerConversation) return fail("This conversation is getting long. Start a new one for a fresh topic.", 409, { conversationId });
  return json({ ok: true, ...(await handleTurn({ studentId: s.id, studentName: s.name, conversationId, text: p.data.message })) });
}

export async function GET(req: Request) {
  const s = await studentOr401();
  if (s instanceof Response) return s;
  const id = new URL(req.url).searchParams.get("conversationId");
  if (!id || !(await one("SELECT id FROM conversations WHERE id = ? AND student_id = ?", [id, s.id]))) return fail("Not found", 404);
  return json({ ok: true, conversationId: id, messages: await loadMessages(id) });
}
