"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/assistant";
import { MentorCard } from "./MentorCard";

const SUGGESTIONS = [
  "I'm a final-year student and want to move into product management, but I have no tech background.",
  "I work in sales and want to switch into growth marketing at a D2C brand.",
  "I want to learn how to use AI tools and automation in my marketing work.",
  "I'm thinking of joining a startup's founder's office. How do I get in?",
];
const STAGES = ["Reading your message…", "Looking through our mentor list…", "Checking who really fits…", "Writing up why…"];

export function Chat({ initial, conversationId: initialId, prefill }: { initial: ChatMessage[]; conversationId: string | null; prefill?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [cid, setCid] = useState<string | null>(initialId);
  const [text, setText] = useState(prefill ?? "");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);
  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, [busy]);

  async function send(msg: string) {
    const m = msg.trim();
    if (!m || busy) return;
    setErr("");
    setBusy(true);
    setText("");
    setMessages((cur) => [...cur, { id: `tmp_${Date.now()}`, role: "user", content: m, kind: "user", createdAt: new Date().toISOString() }]);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: cid, message: m }) });
      const j = await r.json();
      if (j.conversationId) setCid(j.conversationId);
      if (!j.ok) throw new Error(j.message || "Something went wrong.");
      setMessages(j.messages);
      if (j.conversationId && !cid) window.history.replaceState(null, "", `/chat?c=${j.conversationId}`);
    } catch (e) {
      setErr((e as Error).message);
      setMessages((cur) => cur.filter((x) => !x.id.startsWith("tmp_")));
      setText(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="card p-5 grid gap-3">
            <h2 className="font-display text-xl font-semibold">What are you stuck on?</h2>
            <p className="text-sm text-muted">Describe it like you would to a friend: where you are, what you want, what&apos;s in the way. A few sentences is plenty.</p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn text-left justify-start font-normal" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent text-accentfg px-4 py-2.5 text-[0.95rem] whitespace-pre-wrap">{m.content}</div>
          ) : (
            <div key={m.id} className="grid gap-3 max-w-[96%]">
              <div className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-[0.95rem] whitespace-pre-wrap border ${m.kind === "safety" ? "bg-warnsoft border-transparent" : m.kind === "error" ? "bg-badsoft border-transparent" : "bg-surface border-line"}`}>{m.content}</div>
              {m.kind === "recommend" && m.matchQuality && m.matchQuality !== "strong" && (
                <p className={`text-sm rounded-xl px-3 py-2 ${m.matchQuality === "none" ? "bg-warnsoft text-warn" : "bg-surface2 text-muted"}`}>
                  {m.matchQuality === "none"
                    ? "We don't have a strong match for this on our current list. We've noted the gap so Mesa can bring on mentors with this expertise."
                    : "These mentors cover part of what you described, not all of it."}
                </p>
              )}
              {m.cards && m.cards.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {m.cards.map((c, i) => (
                    <MentorCard key={c.mentorId} card={c} rank={i + 1} conversationId={cid ?? undefined} />
                  ))}
                </div>
              )}
              {m.kind === "recommend" && m.cards && m.cards.length > 0 && (
                <p className="text-xs text-muted">Not quite right? Tell me what&apos;s off (more senior, different sector, more AI…) and I&apos;ll look again.</p>
              )}
            </div>
          ),
        )}

        {busy && (
          <div className="card px-4 py-3 text-sm text-muted w-fit flex items-center gap-2" role="status">
            <span className="inline-flex gap-1" aria-hidden>
              <i className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
              <i className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:120ms]" />
              <i className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:240ms]" />
            </span>
            {STAGES[stage]}
          </div>
        )}
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 bg-bg/90 backdrop-blur pt-2 pb-4 grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            className="input min-h-[3rem] max-h-40 resize-y"
            rows={2}
            maxLength={2000}
            placeholder={messages.length ? "Reply…" : "Tell me what you're stuck on…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            aria-label="Your message"
          />
          <button className="btn btn-primary h-12" disabled={busy || !text.trim()}>Send</button>
        </div>
        <p className="text-xs text-muted">Enter to send, Shift+Enter for a new line. Recommendations come only from Mesa&apos;s mentor list.</p>
      </form>
    </div>
  );
}
