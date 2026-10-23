import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { one } from "@/lib/db";
import { loadMessages } from "@/lib/assistant";
import { Chat } from "@/components/Chat";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Find a mentor" };

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
    <div className="relative isolate flex flex-col min-h-[calc(100dvh-4rem)]">
      <div className="aurora !opacity-60" />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid">
            <span className="label">Assistant</span>
            <h1 className="text-lg font-semibold tracking-tight">Find your mentor</h1>
          </div>
          {messages.length > 0 && <Link className="btn btn-sm ml-auto" href="/chat?new=1"><Icon name="plus" size={14} /> New topic</Link>}
        </div>
        <Chat key={conversationId ?? "new"} initial={messages} conversationId={conversationId} prefill={sp.q} />
      </div>
    </div>
  );
}
