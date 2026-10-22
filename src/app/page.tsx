import Link from "next/link";
import { currentStudent } from "@/lib/session";
import { StartForm } from "@/components/StartForm";

const STEPS = [
  { n: "1", t: "Tell us what you're stuck on", d: "Chat with the assistant in your own words. It asks only what it needs." },
  { n: "2", t: "Meet mentors who actually fit", d: "Picks come only from Mesa's mentor list, with honest reasons and gaps. No invented bios." },
  { n: "3", t: "Book and take the call", d: "Pick a slot, add it to your calendar. The call happens on your usual video tool." },
  { n: "4", t: "Leave with a plan", d: "A clear write-up: what was said, what to do next, and when. Tick items off as you go." },
];

export default async function Home() {
  const student = await currentStudent();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 grid gap-14">
      <section className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-start">
        <div className="grid gap-5">
          <span className="badge badge-accent w-fit">For Mesa students</span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.1]">Stuck in your career? Talk to the right person, then know exactly what to do next.</h1>
          <p className="text-lg text-muted max-w-xl">Describe your problem to our assistant. It points you to mentors from Mesa&apos;s list who have done the thing you&apos;re trying to do, and after your call you get a clear plan.</p>
          {student && (
            <div className="flex gap-2 flex-wrap">
              <Link className="btn btn-primary" href="/chat">Continue as {student.name} →</Link>
              <Link className="btn" href="/journey">My journey</Link>
            </div>
          )}
        </div>
        {!student && <StartForm />}
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="font-display text-2xl font-semibold mb-5">How it works</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-4 grid gap-1.5">
              <span className="h-7 w-7 rounded-full bg-accentsoft text-accent grid place-items-center text-sm font-bold">{s.n}</span>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
