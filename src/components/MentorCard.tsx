import Link from "next/link";
import type { Card } from "@/lib/assistant";

export function MentorCard({ card, conversationId, rank }: { card: Card; conversationId?: string; rank: number }) {
  const href = `/mentors/${card.mentorId}${conversationId ? `?c=${conversationId}` : ""}`;
  return (
    <article className="card p-4 flex flex-col gap-3">
      <header className="flex items-start gap-3">
        <span className="h-8 w-8 shrink-0 rounded-full bg-accentsoft text-accent grid place-items-center text-sm font-bold">{rank}</span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight">{card.name}</h3>
          <p className="text-sm text-muted">{card.headline}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          {card.quality && <span className="badge badge-ok">Mentorship: {card.quality}</span>}
          {card.profile === "thin" && <span className="badge badge-warn">Limited details on file</span>}
        </div>
      </header>
      <p className="text-sm leading-relaxed"><span className="label block mb-0.5">Why this mentor</span>{card.reason}</p>
      {card.gaps && <p className="text-sm text-muted leading-relaxed"><span className="label block mb-0.5">Keep in mind</span>{card.gaps}</p>}
      {card.ask && <p className="text-sm leading-relaxed"><span className="label block mb-0.5">Try opening with</span>“{card.ask}”</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs border-t border-line pt-3">
        {card.facts.slice(0, 5).map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-muted">{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2 pt-1">
        <Link className="btn btn-primary" href={href}>View &amp; book a call</Link>
      </div>
    </article>
  );
}
