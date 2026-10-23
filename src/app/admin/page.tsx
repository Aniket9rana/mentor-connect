import { funnel, kpis, parseRange, parseScope, sinceOf } from "@/lib/admin-stats";
import { AdminTools } from "@/components/AdminTools";
import { Bar, CsvLink, pct, RangeToggle, ScopeToggle, Stat } from "@/components/AdminBits";

export default async function Overview({ searchParams }: { searchParams: Promise<{ scope?: string; range?: string }> }) {
  const sp = await searchParams;
  const scope = parseScope(sp.scope);
  const range = parseRange(sp.range);
  const since = sinceOf(range);
  const [steps, k] = await Promise.all([funnel(scope, since), kpis(scope, since)]);
  const top = steps[0].v;
  return (
    <div className="grid gap-8">
      <header className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight">How is Mentor Connect doing?</h1>
          <p className="text-muted text-sm">{k.students} students in view{k.demoStudents > 0 && <> · <span className="badge badge-warn">{k.demoStudents} of {k.totalStudents} students are labelled demo data</span></>}</p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap"><RangeToggle range={range} scope={scope} path="/admin" /><ScopeToggle scope={scope} path="/admin" range={range} /></div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat k="Calls booked" v={k.bookings} />
        <Stat k="Calls held" v={k.held} hint={`${k.cancelled} cancelled`} />
        <Stat k="No-show rate" v={pct(k.noShowRate)} hint={`${k.noShows} no-shows`} />
        <Stat k="Avg call rating" v={k.avgRating ? k.avgRating.toFixed(1) + " / 5" : "—"} hint={`${k.ratings} ratings`} />
        <Stat k="Action items done" v={pct(k.actionRate)} />
        <Stat k="Mentor review time" v={k.avgReviewHours === null ? "—" : `${k.avgReviewHours.toFixed(1)}h`} hint="draft → released" />
        <Stat k="Write-ups sent unreviewed" v={pct(k.unreviewedShare)} hint="mentor missed the 48h window" />
      </section>

      <section className="card p-5 grid gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Where students drop off</h2>
          <p className="text-sm text-muted">Students (not sessions) reaching each step. The % is of the step before it.</p>
        </div>
        <div className="-mt-2"><CsvLink table="funnel" scope={scope} range={range} /></div>
        <div className="grid gap-3">
          {steps.map((s, i) => (
            <Bar key={s.key} label={s.key} value={s.v} max={top} sub={i === 0 ? undefined : steps[i - 1].v ? `${Math.round((s.v / steps[i - 1].v) * 100)}% of previous` : undefined} />
          ))}
        </div>
      </section>

      <section className="card p-5 grid gap-3">
        <h2 className="text-base font-semibold tracking-tight">Admin tools</h2>
        <AdminTools />
      </section>
    </div>
  );
}
