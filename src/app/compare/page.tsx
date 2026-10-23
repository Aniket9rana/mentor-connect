import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStudent } from "@/lib/session";
import { getMentor, headline, mentorFacts } from "@/lib/mentors";
import { Avatar } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { BackLink, PageHeader } from "@/components/PageBits";

export const metadata = { title: "Compare mentors" };

export default async function Compare({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const student = await currentStudent();
  if (!student) redirect("/");
  const ids = [...new Set(((await searchParams).ids ?? "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean))].slice(0, 3);
  // facts come from the mentor record only; unknown stays unknown
  const mentors = (await Promise.all(ids.map((id) => getMentor(id)))).filter((m) => !!m);
  const facts = mentors.map((m) => mentorFacts(m!));
  const labels = [...new Set(facts.flatMap((f) => f.map((x) => x.label)))];

  return (
    <div className="relative isolate">
      <div className="aurora !opacity-40" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 grid gap-8">
        <BackLink href="/journey">My journey</BackLink>
        <PageHeader title={<>Compare <span className="it text-gradient pr-1">mentors</span></>} sub="Side by side, from the profile on file. A dash means the profile doesn't say." />
        {mentors.length < 2 ? (
          <p className="text-muted">Save at least two mentors and pick them to compare. <Link className="underline" href="/chat">Find mentors</Link></p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[40rem]">
              <thead>
                <tr className="border-b border-line">
                  <th className="w-36" />
                  {mentors.map((m) => (
                    <th key={m!.id} className="p-4 text-left align-top">
                      <div className="flex items-center gap-3">
                        <Avatar name={m!.name} seed={m!.id} size={40} />
                        <div className="min-w-0"><div className="font-semibold tracking-tight">{m!.name}</div><div className="text-xs text-muted font-normal">{headline(m!)}</div></div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {labels.map((l) => (
                  <tr key={l}>
                    <th scope="row" className="p-4 text-left font-normal text-muted align-top">{l}</th>
                    {facts.map((f, i) => <td key={i} className="p-4 align-top leading-relaxed text-fg2">{f.find((x) => x.label === l)?.value ?? <span className="text-muted">—</span>}</td>)}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="p-4 text-left font-normal text-muted">Mentorship rating</th>
                  {mentors.map((m) => <td key={m!.id} className="p-4">{m!.mentorshipQuality ?? <span className="text-muted">—</span>}</td>)}
                </tr>
                <tr>
                  <th />
                  {mentors.map((m) => <td key={m!.id} className="p-4"><Link className="btn btn-primary btn-sm" href={`/mentors/${m!.id}`}>Book <Icon name="arrow-right" size={14} /></Link></td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
