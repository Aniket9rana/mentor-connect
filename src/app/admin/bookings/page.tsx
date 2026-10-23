import Link from "next/link";
import { all } from "@/lib/db";
import { parseScope } from "@/lib/admin-stats";
import { allMentors } from "@/lib/mentors";
import { mentorLinkExpired } from "@/lib/booking";
import { CopyLink } from "@/components/AdminActions";
import { CsvLink, ScopeToggle } from "@/components/AdminBits";
import { LocalTime } from "@/components/LocalTime";

type Row = { id: string; slot_start: string; status: string; mentor_id: string; mentor_token: string; meeting_url: string | null; sname: string; is_demo: number; summary: string | null; conversation_id: string | null };

const BADGE: Record<string, string> = { confirmed: "badge-ok", completed: "badge-accent", cancelled: "badge-bad", no_show_student: "badge-warn", no_show_mentor: "badge-warn" };

export default async function Bookings({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const scope = parseScope((await searchParams).scope);
  const where = scope === "all" ? "" : `WHERE s.is_demo = ${scope === "demo" ? 1 : 0}`;
  const rows = await all<Row>(
    `SELECT b.id, b.slot_start, b.status, b.mentor_id, b.mentor_token, b.meeting_url, b.conversation_id, s.name AS sname, s.is_demo, sm.status AS summary
       FROM bookings b JOIN students s ON s.id = b.student_id LEFT JOIN summaries sm ON sm.booking_id = b.id ${where} ORDER BY b.slot_start DESC LIMIT 200`,
  );
  const names = new Map((await allMentors()).map((m) => [m.id, m.name]));
  return (
    <div className="grid gap-6">
      <header className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight">Bookings</h1>
          <p className="text-muted text-sm">Every call, with the private mentor link so you can nudge a mentor who hasn&apos;t responded.</p>
        </div>
        <div className="ml-auto flex gap-2 items-center"><CsvLink table="bookings" scope={scope} /><ScopeToggle scope={scope} path="/admin/bookings" /></div>
      </header>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr>{["When", "Student", "Mentor", "Status", "Write-up", "Link", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="text-muted">No bookings yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap"><LocalTime iso={r.slot_start} /></td>
                <td>{r.sname}{r.is_demo ? <span className="badge ml-2">demo</span> : null}</td>
                <td>{names.get(r.mentor_id) ?? r.mentor_id}</td>
                <td><span className={`badge ${BADGE[r.status] ?? ""}`}>{r.status.replace(/_/g, " ")}</span></td>
                <td>{r.summary ? <span className={`badge ${r.summary === "draft" ? "badge-warn" : "badge-ok"}`}>{r.summary === "auto_released" ? "released, unreviewed" : r.summary}</span> : <span className="text-muted">—</span>}</td>
                <td>{r.meeting_url ? <span className="badge badge-ok">has link</span> : <span className="text-muted text-xs">no meeting link</span>}</td>
                <td className="whitespace-nowrap">
                  {mentorLinkExpired({ slot_start: r.slot_start }) ? <span className="text-xs text-muted">link expired</span> : <CopyLink path={`/mentor/${r.mentor_token}`} />}
                  {r.conversation_id && <Link className="text-xs underline ml-3" href={`/admin/conversations/${r.conversation_id}`}>Chat</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
