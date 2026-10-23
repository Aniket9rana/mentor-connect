import Link from "next/link";
import type { Card } from "@/lib/assistant";
import { Avatar } from "./Brand";
import { Icon } from "./Icon";

export function MentorCard({ card, conversationId, rank }: { card: Card; conversationId?: string; rank: number }) {
  const href = `/mentors/${card.mentorId}${conversationId ? `?c=${conversationId}` : ""}`;
  return (
    <article className="card card-lift p-5 flex flex-col gap-4 fade-up" style={{ animationDelay: `${rank * 70}ms` }}>
      <header className="flex items-start gap-3">
        <Avatar name={card.name} seed={card.mentorId} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold tracking-tight leading-tight truncate">{card.name}</h3>
            <span className="font-mono text-[0.65rem] text-muted ml-auto shrink-0">#{rank}</span>
          </div>
          <p className="text-[0.82rem] text-muted leading-snug mt-0.5">{card.headline}</p>
        </div>
      </header>
      {(card.quality || card.profile === "thin") && (
        <div className="flex gap-1.5 flex-wrap -mt-1">
          {card.quality && <span className="badge badge-ok"><Icon name="star" size={11} /> Mentorship: {card.quality}</span>}
          {card.profile === "thin" && <span className="badge badge-warn"><Icon name="alert" size={11} /> Limited details on file</span>}
        </div>
      )}
      <div className="grid gap-3.5 text-sm">
        <div><span className="label block mb-1">Why this mentor</span><p className="leading-relaxed text-fg2">{card.reason}</p></div>
        {card.gaps && <div><span className="label block mb-1">Keep in mind</span><p className="leading-relaxed text-muted">{card.gaps}</p></div>}
        {card.ask && (
          <div className="rounded-xl bg-accentsoft px-3.5 py-3">
            <span className="label block mb-1 !text-accentink">Try opening with</span>
            <p className="leading-relaxed text-fg2">“{card.ask}”</p>
          </div>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs border-t border-line pt-3.5 mt-auto">
        {card.facts.slice(0, 5).map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-muted">{f.label}</dt>
            <dd className="text-fg2">{f.value}</dd>
          </div>
        ))}
      </dl>
      <Link className="btn btn-primary w-full" href={href}>View &amp; book a call <Icon name="arrow-right" size={15} /></Link>
    </article>
  );
}
