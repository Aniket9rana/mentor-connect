import Link from "next/link";
import { currentStudent } from "@/lib/session";
import { StartForm } from "@/components/StartForm";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Brand";

const STEPS = [
  { icon: "message", t: "Tell us what you're stuck on", d: "Chat in your own words. The assistant asks only what it needs to find the right person." },
  { icon: "target", t: "Meet mentors who actually fit", d: "Picks come only from Mesa's list, with honest reasons and the gaps spelled out. No invented bios." },
  { icon: "calendar", t: "Book a 30-minute call", d: "Choose a slot in your time zone and add it to your calendar. The call runs on your usual video tool." },
  { icon: "list-checks", t: "Leave with a plan", d: "A clear write-up of what was said, what to do next and by when. Tick items off as you go." },
] as const;

const PRINCIPLES = [
  { icon: "shield-check", t: "Grounded, never invented", d: "The model only chooses mentor IDs. Every name, role and fact you see is read from Mesa's mentor sheet, and anything missing stays marked as unknown." },
  { icon: "quote", t: "Write-ups you can verify", d: "Each point in your post-call plan links to a quote from the transcript. If it can't be sourced, it doesn't make it in." },
  { icon: "lock", t: "Safety built in", d: "Sensitive topics are routed to proper support instead of a mentor, and unfit or thin matches are flagged openly." },
] as const;

export default async function Home() {
  const student = await currentStudent();
  return (
    <div className="relative">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate">
        <div className="aurora" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-14 items-center">
          <div className="grid gap-6">
            <span className="eyebrow fade-up w-fit"><i>AI</i> Matched from Mesa&apos;s real mentor list</span>
            <h1 className="font-display text-[2.75rem] sm:text-6xl lg:text-[4.5rem] leading-[1.02] fade-up d1">
              Find the mentor who&apos;s <span className="it text-gradient pr-1">already done</span> what you&apos;re trying to do.
            </h1>
            <p className="text-lg text-muted max-w-xl leading-relaxed fade-up d2">
              Describe your career problem in plain words. We point you to the right people on Mesa&apos;s list, help you book a call, and turn it into a clear plan you can act on.
            </p>
            {student ? (
              <div className="flex gap-2.5 flex-wrap fade-up d3">
                <Link className="btn btn-primary btn-lg" href="/chat">Continue as {student.name.split(" ")[0]} <Icon name="arrow-right" size={16} /></Link>
                <Link className="btn btn-lg" href="/journey">My journey</Link>
              </div>
            ) : (
              <ul className="grid gap-2.5 text-sm text-fg2 fade-up d3">
                {["Recommendations come only from Mesa's mentor list", "Honest about gaps and thin profiles", "A written plan after every call"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="grid place-items-center h-5 w-5 rounded-full bg-accentsoft text-accentink"><Icon name="check" size={12} strokeWidth={2.5} /></span>
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="fade-up d2 lg:justify-self-end w-full max-w-md">
            {student ? (
              <div className="card-glow p-6 sm:p-7 grid gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={student.name} size={44} round />
                  <div>
                    <p className="text-xs text-muted">Welcome back</p>
                    <p className="font-semibold tracking-tight">{student.name}</p>
                  </div>
                </div>
                <hr className="hairline" />
                <p className="text-sm text-muted">Pick up your conversation, check upcoming calls, or review the action items from your last write-up.</p>
                <div className="grid gap-2">
                  <Link className="btn btn-primary" href="/chat">Find a mentor <Icon name="arrow-right" size={15} /></Link>
                  <Link className="btn" href="/journey">See my journey</Link>
                </div>
              </div>
            ) : (
              <StartForm />
            )}
          </div>
        </div>
      </section>

      {/* ───────── Product preview ───────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20" aria-labelledby="preview">
        <div className="text-center grid gap-2 mb-10 justify-items-center">
          <span className="label">The product</span>
          <h2 id="preview" className="font-display text-4xl sm:text-5xl">From a vague problem to a <span className="it">specific</span> person</h2>
          <p className="text-muted max-w-xl">Every recommendation says why the mentor fits, what to keep in mind, and how to open the conversation.</p>
        </div>
        <div className="card-glow overflow-hidden max-w-4xl mx-auto" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="flex items-center gap-2 px-4 h-10 border-b border-line bg-surface2/60">
            <span className="flex gap-1.5" aria-hidden><i className="h-2.5 w-2.5 rounded-full bg-line2" /><i className="h-2.5 w-2.5 rounded-full bg-line2" /><i className="h-2.5 w-2.5 rounded-full bg-line2" /></span>
            <span className="mx-auto text-[0.7rem] font-mono text-muted whitespace-nowrap truncate rounded-md bg-surface border border-line px-3 py-0.5">mentor-connect / find-a-mentor</span>
            <span className="w-10" />
          </div>
          <div className="grid md:grid-cols-[1fr_1.05fr] gap-0">
            <div className="p-5 sm:p-7 grid gap-4 content-start bg-bg/40">
              <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed text-white" style={{ background: "linear-gradient(180deg, var(--brand-1), var(--brand-2))" }}>
                I&apos;m in my final year and want to move into product management, but I don&apos;t have a tech background.
              </div>
              <div className="flex gap-3">
                <span className="orb h-7 w-7 mt-0.5" aria-hidden />
                <div className="grid gap-2 text-sm">
                  <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 leading-relaxed shadow-[var(--shadow-sm)]">That move is very doable. Two mentors on our list made a similar switch. I&apos;ve noted what fits and what doesn&apos;t.</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="chip"><Icon name="search" size={12} /> Read 50 profiles</span>
                    <span className="chip"><Icon name="check" size={12} /> Checked fit</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-7 border-t md:border-t-0 md:border-l border-line grid gap-4 content-start">
              <div className="flex items-start gap-3">
                <Avatar name="Mentor A" size={44} />
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight leading-tight">Mentor A</p>
                  <p className="text-sm text-muted">Product · career switcher</p>
                </div>
                <span className="badge badge-ok ml-auto"><Icon name="check" size={11} strokeWidth={2.5} /> Strong fit</span>
              </div>
              <div className="grid gap-3 text-sm">
                <div><span className="label block mb-1">Why this mentor</span><p className="leading-relaxed">Made the move into product from a non-technical background, which matches the transition you described.</p></div>
                <div><span className="label block mb-1">Keep in mind</span><p className="leading-relaxed text-muted">Profile doesn&apos;t mention consumer products, so ask about it on the call.</p></div>
                <div className="rounded-xl bg-accentsoft px-3.5 py-3"><span className="label block mb-1 !text-accentink">Try opening with</span><p className="leading-relaxed text-fg2">“How did you build credibility for your first product role?”</p></div>
              </div>
              <p className="text-[0.7rem] text-muted flex items-center gap-1.5"><Icon name="sparkles" size={12} /> Illustrative example. Real matches come from Mesa&apos;s mentor list.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section id="how" aria-labelledby="how-h" className="border-y border-line bg-surface2/50 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="grid gap-2 mb-10 max-w-2xl">
            <span className="label">How it works</span>
            <h2 id="how-h" className="font-display text-4xl sm:text-5xl">Four steps. One <span className="it">clear</span> next move.</h2>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="card card-lift p-5 grid gap-4 content-start">
                <div className="flex items-center justify-between">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-accentsoft text-accentink border border-accent/10"><Icon name={s.icon} size={19} /></span>
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                </div>
                <div className="grid gap-1.5">
                  <h3 className="font-semibold tracking-tight leading-snug">{s.t}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Principles ───────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20" aria-labelledby="trust">
        <div className="grid gap-2 mb-10 max-w-2xl">
          <span className="label">Built to be trusted</span>
          <h2 id="trust" className="font-display text-4xl sm:text-5xl">AI that knows what it <span className="it">doesn&apos;t</span> know.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {PRINCIPLES.map((p) => (
            <div key={p.t} className="card p-6 grid gap-3 content-start">
              <span className="grid place-items-center h-10 w-10 rounded-xl text-white" style={{ background: "linear-gradient(145deg, var(--brand-1), var(--brand-2))", boxShadow: "inset 0 1px 0 rgb(255 255 255 / .25)" }}><Icon name={p.icon} size={19} /></span>
              <h3 className="font-semibold tracking-tight">{p.t}</h3>
              <p className="text-sm text-muted leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      {!student && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl px-6 py-14 sm:px-14 text-center grid gap-5 justify-items-center text-white" style={{ background: "radial-gradient(60% 120% at 20% 0%, #6a5cf5 0%, transparent 60%), radial-gradient(50% 100% at 90% 100%, #a56cf5 0%, transparent 60%), #1a1450" }}>
            <h2 className="font-display text-4xl sm:text-5xl max-w-2xl leading-[1.05]">Your next conversation could change your <span className="it">direction.</span></h2>
            <p className="text-white/70 max-w-lg">Tell us what you&apos;re stuck on. It takes about a minute to get your first matches.</p>
            <Link href="#start" className="btn btn-lg !bg-white !text-[#1a1450] !border-white hover:!bg-white/90">Get started <Icon name="arrow-right" size={16} /></Link>
          </div>
        </section>
      )}
    </div>
  );
}
