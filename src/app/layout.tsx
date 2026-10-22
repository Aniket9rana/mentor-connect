import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Fraunces } from "next/font/google";
import { currentStudent } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mentor Connect",
  description: "Describe your career problem, get matched with the right mentor, and turn one call into progress.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const student = await currentStudent();
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-4">
            <Link href="/" className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
              <span aria-hidden className="inline-block h-5 w-5 rounded-md bg-accent" />
              Mentor Connect
            </Link>
            <nav className="ml-auto flex items-center gap-1 text-sm">
              {student ? (
                <>
                  <Link className="btn border-transparent bg-transparent" href="/chat">Chat</Link>
                  <Link className="btn border-transparent bg-transparent" href="/journey">My journey</Link>
                  <Link className="btn border-transparent bg-transparent hidden sm:inline-flex" href="/outbox">Notifications</Link>
                  <span className="hidden md:inline text-muted px-2">{student.name}</span>
                </>
              ) : (
                <Link className="btn" href="/#start">Get started</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line text-xs text-muted">
          <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap gap-x-4 gap-y-1">
            <span>Prototype built for the Mesa assignment. Mentor data is the anonymised 50-mentor sample.</span>
            <Link className="ml-auto underline" href="/admin">Mesa team</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
