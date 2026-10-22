"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE_TRANSCRIPT } from "@/lib/sample-transcript";

/** Used by the student (cookie auth) and by the mentor (token auth) - `endpoint` and `mentorMode` switch the wiring. */
export function TranscriptForm({ endpoint, mentorMode = false }: { endpoint: string; mentorMode?: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"transcript" | "debrief">("transcript");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 500_000) return setErr("That file is too large. Please use a text transcript under 500 KB.");
    setErr("");
    setText(await f.text());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const payload = mentorMode ? { action: "transcript", text } : { text, kind };
      const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Couldn't process that.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {!mentorMode && (
        <fieldset className="flex gap-4 text-sm">
          <legend className="label mb-1">What are you adding?</legend>
          <label className="flex items-center gap-2"><input type="radio" checked={kind === "transcript"} onChange={() => setKind("transcript")} /> Call transcript or notes</label>
          <label className="flex items-center gap-2"><input type="radio" checked={kind === "debrief"} onChange={() => setKind("debrief")} /> My own recap (no transcript)</label>
        </fieldset>
      )}
      <textarea
        className="input min-h-48 font-mono text-[0.82rem]"
        placeholder={kind === "debrief" && !mentorMode ? "In your own words: what did you talk about, what did the mentor suggest, what will you do next?" : "Paste the transcript or your notes from the call (Meet / Zoom / Otter .txt, .vtt and .srt all work)…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        aria-label="Transcript or notes"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="btn cursor-pointer">
          Upload .txt / .vtt / .srt
          <input type="file" accept=".txt,.vtt,.srt,text/plain" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
        </label>
        <button type="button" className="btn" onClick={() => setText(SAMPLE_TRANSCRIPT)}>Use sample transcript (demo)</button>
        <button className="btn btn-primary ml-auto" disabled={busy || !text.trim()}>{busy ? "Writing it up… (≈20s)" : "Generate write-up"}</button>
      </div>
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      <p className="text-xs text-muted">Every point in the write-up is tied to a quote from what you paste. Personal details like phone numbers are left out.</p>
    </form>
  );
}
