"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/assistant";
import { MentorCard } from "./MentorCard";
import { Icon } from "./Icon";
import { WaitlistButton } from "./WaitlistButton";

const SUGGESTIONS = [
  { icon: "compass", label: "Switch into product", text: "I'm a final-year student and want to move into product management, but I have no tech background." },
  { icon: "trending-up", label: "Sales → growth marketing", text: "I work in sales and want to switch into growth marketing at a D2C brand." },
  { icon: "zap", label: "Use AI in my work", text: "I want to learn how to use AI tools and automation in my marketing work." },
  { icon: "briefcase", label: "Join a startup", text: "I'm thinking of joining a startup's founder's office. How do I get in?" },
] as const;
const STAGES = ["Reading your message…", "Looking through our mentor list…", "Checking who really fits…", "Writing up why…"];

export function Chat({ initial, conversationId: initialId, prefill, savedIds = [], waitlisted = false, signedIn = true }: { initial: ChatMessage[]; conversationId: string | null; prefill?: string; savedIds?: string[]; waitlisted?: boolean; signedIn?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [cid, setCid] = useState<string | null>(initialId);
  const [text, setText] = useState(prefill ?? "");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState("");
  const lastRecommendId = [...messages].reverse().find((x) => x.kind === "recommend")?.id;
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, [busy]);
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  async function send(msg: string) {
    const m = msg.trim();
    if (!m || busy) return;
    setErr("");
    setStage(0);
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
    <div className="flex flex-col flex-1">
      <div className="grid gap-6 pb-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="grid gap-8 justify-items-center text-center pt-6 sm:pt-12 fade-up">
            <div className="grid gap-4 justify-items-center">
              <span className="orb h-14 w-14 float-y" aria-hidden />
              <h2 className="font-display text-4xl sm:text-5xl leading-[1.05]">What are you <span className="it text-gradient pr-0.5">stuck</span> on?</h2>
              <p className="text-muted max-w-lg leading-relaxed">Describe it like you would to a friend: where you are, what you want, and what&apos;s in the way. A few sentences is plenty.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 w-full max-w-3xl text-left">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} className="card card-lift p-4 flex gap-3.5 items-start cursor-pointer text-left group" onClick={() => send(s.text)}>
                  <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-accentsoft text-accentink group-hover:scale-105 transition-transform"><Icon name={s.icon} size={17} /></span>
                  <span className="grid gap-0.5 min-w-0">
                    <span className="text-sm font-semibold tracking-tight">{s.label}</span>
                    <span className="text-[0.82rem] text-muted leading-snug line-clamp-2">{s.text}</span>
                  </span>
                  <Icon name="arrow-up-right" size={15} className="ml-auto text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[min(85%,36rem)] rounded-2xl rounded-br-md text-white px-4 py-3 text-[0.94rem] leading-relaxed whitespace-pre-wrap fade-up shadow-[0_8px_20px_-10px_rgb(80_64_230/0.6)]" style={{ background: "linear-gradient(180deg, var(--brand-1), var(--brand-2))" }}>{m.content}</div>
          ) : (
            <div key={m.id} className="flex gap-3 sm:gap-3.5 fade-up">
              <span className="orb h-8 w-8 mt-0.5" aria-hidden />
              <div className="grid gap-4 min-w-0 flex-1">
                <div className={`max-w-3xl rounded-2xl rounded-tl-md px-4 py-3 text-[0.94rem] leading-relaxed whitespace-pre-wrap border shadow-[var(--shadow-sm)] ${m.kind === "safety" ? "bg-warnsoft border-warn/20 text-fg" : m.kind === "error" ? "bg-badsoft border-bad/20" : "bg-surface border-line"}`}>
                  {m.kind === "safety" && <span className="flex items-center gap-1.5 text-warn font-semibold text-xs mb-1.5"><Icon name="shield-check" size={14} /> A note from us</span>}
                  {m.content}
                </div>
                {m.kind === "recommend" && m.matchQuality && m.matchQuality !== "strong" && (
                  <p className={`max-w-3xl text-sm rounded-xl px-3.5 py-2.5 flex gap-2.5 items-start leading-relaxed ${m.matchQuality === "none" ? "bg-warnsoft text-warn" : "bg-surface2 text-muted border border-line"}`}>
                    <Icon name={m.matchQuality === "none" ? "alert" : "target"} size={16} className="mt-0.5" />
                    {m.matchQuality === "none"
                      ? "We don't have a strong match for this on our current list. We've noted the gap so Mesa can bring on mentors with this expertise."
                      : "These mentors cover part of what you described, not all of it."}
                  </p>
                )}
                {m.kind === "recommend" && m.matchQuality && m.matchQuality !== "strong" && cid && m.id === lastRecommendId && (
                  <WaitlistButton conversationId={cid} joined={waitlisted} />
                )}
                {m.cards && m.cards.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {m.cards.map((c, i) => (
                      <MentorCard key={c.mentorId} card={c} rank={i + 1} conversationId={cid ?? undefined} saved={savedIds.includes(c.mentorId)} signedIn={signedIn} />
                    ))}
                  </div>
                )}
                {m.kind === "recommend" && m.cards && m.cards.length > 0 && (
                  <p className="text-xs text-muted flex items-center gap-1.5"><Icon name="refresh" size={12} /> Not quite right? Tell me what&apos;s off (more senior, different sector, more AI…) and I&apos;ll look again.</p>
                )}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex gap-3.5 items-center fade-up" role="status">
            <span className="orb h-8 w-8 pulse-dot" aria-hidden />
            <div className="card px-4 py-2.5 text-sm text-muted flex items-center gap-3">
              <span className="inline-flex gap-1" aria-hidden>
                <i className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                <i className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:120ms]" />
                <i className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:240ms]" />
              </span>
              {STAGES[stage]}
            </div>
          </div>
        )}
        {err && <p role="alert" className="text-sm text-bad rounded-xl bg-badsoft px-3.5 py-2.5 flex gap-2 items-center"><Icon name="alert" size={15} /> {err}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 mt-auto -mx-4 px-4 sm:-mx-6 sm:px-6 pt-6 pb-4 bg-gradient-to-t from-bg from-60% to-transparent"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="card-glow flex items-end gap-2 p-2 pl-4" style={{ boxShadow: "var(--shadow-lg)" }}>
            <textarea
              ref={taRef}
              className="flex-1 resize-none bg-transparent outline-none py-2.5 text-[0.95rem] leading-relaxed placeholder:text-muted/80 max-h-40"
              rows={1}
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
            <button className="btn btn-primary h-10 w-10 !p-0 !rounded-xl shrink-0" disabled={busy || !text.trim()} aria-label="Send message">
              <Icon name="arrow-up" size={18} strokeWidth={2.25} />
            </button>
          </div>
          <p className="mt-2 text-center text-[0.72rem] text-muted"><span className="kbd">Enter</span> to send · <span className="kbd">Shift</span> + <span className="kbd">Enter</span> for a new line · Recommendations come only from Mesa&apos;s mentor list</p>
        </div>
      </form>
    </div>
  );
}
