import Link from "next/link";
import { demand, parseScope } from "@/lib/admin-stats";
import { Bar, ScopeToggle, Stat } from "@/components/AdminBits";
import { LocalTime } from "@/components/LocalTime";

export default async function Demand({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const scope = parseScope((await searchParams).scope);
  const d = await demand(scope);
  const maxPer = Math.max(0.01, ...d.byDomain.map((x) => x.recs / Math.max(1, x.mentors)));
  return (
    <div className="grid gap-8">
      <header className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold">Demand &amp; gaps</h1>
          <p className="text-muted text-sm">What students ask for that the mentor list can&apos;t fully serve. This is the recruiting brief.</p>
        </div>
        <div className="ml-auto"><ScopeToggle scope={scope} path="/admin/demand" /></div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat k="Recommendation rounds" v={d.total} />
        <Stat k="No good match" v={d.noMatch} hint="nobody on the list fits" />
        <Stat k="Partial match" v={d.partial} hint="covers only part of the need" />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 grid gap-3">
          <h2 className="font-display text-xl font-semibold">Expertise we&apos;re missing</h2>
          {d.topUnmet.length === 0 && <p className="text-sm text-muted">No gaps logged yet.</p>}
          {d.topUnmet.map(([k, v]) => <Bar key={k} label={k} value={v} max={d.topUnmet[0][1]} />)}
        </div>
        <div className="card p-5 grid gap-3">
          <h2 className="font-display text-xl font-semibold">Most-asked topics</h2>
          {d.topTags.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
          {d.topTags.map(([k, v]) => <Bar key={k} label={k} value={v} max={d.topTags[0][1]} />)}
        </div>
      </section>

      <section className="card p-5 grid gap-3">
        <h2 className="font-display text-xl font-semibold">Supply vs. demand by domain</h2>
        <p className="text-sm text-muted">How often each mentor domain was recommended, next to how many mentors we have in it. A domain with many recommendations and few mentors is a bottleneck.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1 pr-3 font-medium">Domain</th><th className="font-medium pr-3">Mentors</th><th className="font-medium pr-3">Times recommended</th><th className="font-medium w-1/3">Per mentor</th></tr></thead>
            <tbody>
              {d.byDomain.map((r) => (
                <tr key={r.domain} className="border-t border-line">
                  <td className="py-1.5 pr-3">{r.domain}</td><td className="pr-3 tabular-nums">{r.mentors}</td><td className="pr-3 tabular-nums">{r.recs}</td>
                  <td><div className="h-2 rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(r.recs / Math.max(1, r.mentors) / maxPer) * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold">Recent unserved requests</h2>
        {d.gaps.length === 0 && <p className="text-sm text-muted">None.</p>}
        {d.gaps.map((g, i) => (
          <article key={i} className="card p-4 grid gap-1">
            <div className="flex gap-2 items-center flex-wrap">
              <span className={`badge ${g.type === "no_match" ? "badge-bad" : "badge-warn"}`}>{g.type === "no_match" ? "No match" : "Partial"}</span>
              <span className="text-xs text-muted"><LocalTime iso={g.ts} /></span>
              {g.conversation_id && <Link className="text-xs underline ml-auto" href={`/admin/conversations/${g.conversation_id}`}>View conversation</Link>}
            </div>
            <p className="text-sm">{g.meta.topic}</p>
            {g.meta.unmet && <p className="text-sm text-muted">Missing: {g.meta.unmet}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
