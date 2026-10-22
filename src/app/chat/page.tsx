import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { one } from "@/lib/db";
import { loadMessages } from "@/lib/assistant";
import { Chat } from "@/components/Chat";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string; new?: string; q?: string }> }) {
  const student = await currentStudent();
  if (!student) redirect("/");
  const sp = await searchParams;

  let conversationId: string | null = null;
  if (sp.c) conversationId = (await one<{ id: string }>("SELECT id FROM conversations WHERE id = ? AND student_id = ?", [sp.c, student.id]))?.id ?? null;
  else if (!sp.new)
    conversationId = (await one<{ id: string }>("SELECT c.id FROM conversations c WHERE c.student_id = ? AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id) ORDER BY c.updated_at DESC LIMIT 1", [student.id]))?.id ?? null;
  const messages = conversationId ? await loadMessages(conversationId) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-display text-2xl font-semibold">Find your mentor</h1>
        {messages.length > 0 && <Link className="btn ml-auto" href="/chat?new=1">New topic</Link>}
      </div>
      <Chat key={conversationId ?? "new"} initial={messages} conversationId={conversationId} prefill={sp.q} />
    </div>
  );
}
