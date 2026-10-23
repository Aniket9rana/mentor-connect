import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { currentStudent } from "@/lib/session";
import { Avatar, Wordmark } from "@/components/Brand";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Mentor Connect", template: "%s · Mentor Connect" },
  description: "Describe your career problem, get matched with the right mentor, and turn one call into progress.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const student = await currentStudent();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/75 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
            <Link href="/" aria-label="Mentor Connect home" className="rounded-lg"><Wordmark compact={!!student} /></Link>
            {student && <NavLinks />}
            <div className="ml-auto flex items-center gap-2">
              {student ? (
                <Link href="/journey" className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 py-1 text-sm shadow-[var(--shadow-sm)] hover:border-line2 transition-colors" aria-label="Your journey">
                  <Avatar name={student.name} size={26} round />
                  <span className="max-w-[9rem] truncate font-medium">{student.name}</span>
                </Link>
              ) : (
                <>
                  <Link className="btn btn-ghost hidden sm:inline-flex" href="/#how">How it works</Link>
                  <Link className="btn btn-primary" href="/#start">Get started</Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-[1fr_auto] items-start text-sm text-muted">
            <div className="grid gap-2 max-w-md">
              <Wordmark />
              <p className="text-[0.8rem] leading-relaxed">A prototype built for the Mesa assignment. Mentor data is Mesa&apos;s anonymised 50-mentor sample. Recommendations never go beyond what is on file.</p>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[0.8rem]" aria-label="Footer">
              <Link className="hover:text-fg transition-colors" href="/#how">How it works</Link>
              <Link className="hover:text-fg transition-colors" href="/chat">Find a mentor</Link>
              <Link className="hover:text-fg transition-colors" href="/admin">Mesa team</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
