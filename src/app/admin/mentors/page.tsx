import { mentorTable, parseScope } from "@/lib/admin-stats";
import { headline } from "@/lib/mentors";
import { CsvLink, pct, ScopeToggle, Stat } from "@/components/AdminBits";
import { ContactEditor } from "@/components/AdminActions";
import { all } from "@/lib/db";

export default async function Mentors({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const scope = parseScope((await searchParams).scope);
  const t = await mentorTable(scope);
  const contacts = new Map((await all<{ mentor_id: string; email: string }>("SELECT mentor_id, email FROM mentor_contacts")).map((c) => [c.mentor_id, c.email]));
  return (
    <div className="grid gap-6">
      <header className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight">Mentors</h1>
          <p className="text-muted text-sm">Who gets recommended, booked and rated. Watch for concentration and for mentors who never come up.</p>
        </div>
        <div className="ml-auto flex gap-2 items-center"><CsvLink table="mentors" scope={scope} /><ScopeToggle scope={scope} path="/admin/mentors" /></div>
      </header>
      <section className="grid grid-cols-3 gap-3">
        <Stat k="Recommendations made" v={t.totalRecs} />
        <Stat k="Share going to top 5 mentors" v={pct(t.top5Share)} hint="50 mentors → an even spread would be 10%" />
        <Stat k="Mentors never recommended" v={t.neverRecommended} hint="often thin profiles or niches" />
      </section>
      <p className="text-sm text-muted rounded-xl border border-line bg-surface2/60 px-4 py-3 leading-relaxed">
        <strong className="text-fg">Contact emails</strong> are where booking notices, reminders and write-up reviews go. Until one is set, a mentor&apos;s mail only lands in the outbox and the review step always times out. They are stored apart from the profiles and never shown to students or the assistant.
      </p>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr>{["Mentor", "Profile", "Recommended", "Booked", "Completed", "Mentor no-shows", "Rating", "Contact email"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.m.id}>
                <td><div className="font-medium">{r.m.name}</div><div className="text-xs text-muted">{headline(r.m)}</div></td>
                <td><span className={`badge ${r.m.profile === "rich" ? "badge-ok" : r.m.profile === "thin" ? "badge-bad" : ""}`}>{r.m.profile}</span></td>
                <td className="tabular-nums">{r.recs}</td><td className="tabular-nums">{r.booked}</td><td className="tabular-nums">{r.completed}</td>
                <td className="tabular-nums">{r.noShows || "—"}</td>
                <td className="tabular-nums">{r.rating ? `${r.rating.toFixed(1)} (${r.ratingN})` : "—"}</td>
                <td><ContactEditor mentorId={r.m.id} initial={contacts.get(r.m.id) ?? ""} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
