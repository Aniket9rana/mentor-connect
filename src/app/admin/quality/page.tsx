import Link from "next/link";
import { parseScope, quality } from "@/lib/admin-stats";
import { Bar, ScopeToggle, Stat } from "@/components/AdminBits";
import { LocalTime } from "@/components/LocalTime";
import { ResolveFlag } from "@/components/ResolveFlag";

export default async function Quality({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const scope = parseScope((await searchParams).scope);
  const q = await quality(scope);
  const maxDist = Math.max(1, ...q.dist.map((d) => Number(d.c)));
  return (
    <div className="grid gap-8">
      <header className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight">Quality &amp; safety</h1>
          <p className="text-muted text-sm">Where the AI or the process needed a safety net, and what needs a human.</p>
        </div>
        <div className="ml-auto"><ScopeToggle scope={scope} path="/admin/quality" /></div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat k="Sensitive messages" v={q.counts.sensitive} hint="routed to support resources, not mentors" />
        <Stat k="Injection attempts" v={q.counts.injection} />
        <Stat k="Invented details blocked" v={q.counts.validationDropped} hint="fabricated mentor ids / facts caught" />
        <Stat k="Ungrounded summary items dropped" v={q.dropped} hint="no matching quote in the transcript" />
        <Stat k="LLM errors" v={q.counts.llmErrors} />
        <Stat k="Booking collisions" v={q.counts.conflicts} hint="two students, one slot" />
        <Stat k="Off-topic messages" v={q.counts.offTopic} />
        <Stat k="Messages sent" v={q.counts.messages} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-base font-semibold tracking-tight">Needs a human ({q.flags.length})</h2>
        {q.flags.length === 0 && <p className="text-sm text-muted">Nothing open.</p>}
        {q.flags.map((f) => (
          <article key={f.id} className="card p-3 flex gap-3 items-start text-sm">
            <span className={`badge ${["sensitive", "mentor_no_show", "llm_error", "summary_failed"].includes(f.kind) ? "badge-bad" : "badge-warn"}`}>{f.kind.replace(/_/g, " ")}</span>
            <div className="grid gap-0.5 min-w-0">
              <p className="break-words">{f.detail}</p>
              <p className="text-xs text-muted"><LocalTime iso={f.ts} />{f.conversation_id && <> · <Link className="underline" href={`/admin/conversations/${f.conversation_id}`}>conversation</Link></>}</p>
            </div>
            <ResolveFlag id={f.id} />
          </article>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 grid gap-3">
          <h2 className="text-base font-semibold tracking-tight">Write-ups waiting on mentors</h2>
          {q.drafts.length === 0 && <p className="text-sm text-muted">None waiting.</p>}
          {q.drafts.map((d) => (
            <div key={d.booking_id} className="text-sm flex gap-2"><span>{d.student} ↔ {d.mentor_id}</span><span className="ml-auto text-muted">drafted <LocalTime iso={d.created_at} mode="date" /></span></div>
          ))}
        </div>
        <div className="card p-5 grid gap-3">
          <h2 className="text-base font-semibold tracking-tight">Call ratings</h2>
          {q.dist.length === 0 && <p className="text-sm text-muted">No ratings yet.</p>}
          {q.dist.map((d) => <Bar key={d.rating} label={`${d.rating} star${d.rating === 1 ? "" : "s"}`} value={Number(d.c)} max={maxDist} />)}
        </div>
      </section>
    </div>
  );
}
