# Mentor Connect: design note

**What I built.** A student describes a career problem to an assistant, gets 1-3 mentors from the 50-mentor sheet, books a 30-minute slot, and after the call (which happens elsewhere) receives a write-up with action items they can tick off. Mesa gets a dashboard. Everything runs end to end; the rest of this page is why it is shaped this way.

## The decisions that matter

1. **The model can't make up a mentor.** All 50 profiles sit in the prompt (≈4k tokens, so no retrieval layer is needed). The model answers through a `recommend_mentors` tool that returns mentor *IDs*. Code checks every ID against the database and builds the card from the sheet, so facts on screen are never model-written. The model's free text ("why this mentor") must also trace to the mentor's record or the student's own words, or it is replaced by a template. Contact fields and the anonymised company labels never reach the prompt.
2. **The sheet is messy, and the product respects that.** Of 52 rows there were 2 exact duplicates, 28 of 50 mentors have no seniority, and only 13 have a rating. The ingest script normalises spellings (`Ecomm`/`E - Commerce`, `Bombay`/`Mumbai`) and drops placeholder contacts. Unknown stays *unknown*: the assistant is told "unknown ≠ none", so it won't call anyone "junior" or "director". Thin profiles are flagged to the student instead of being hidden or embellished.
3. **Honest "no match".** The list is business/marketing/product/growth/sales-heavy, with no design or engineering mentors. The assistant says so, shows at most two closest mentors with explicit gaps, and logs the gap. The admin "Demand & gaps" page turns this into a recruiting brief.
4. **Post-call write-up from a transcript or notes, quote-verified.** The call is outside the app, so the input is a pasted/uploaded transcript (.txt/.vtt/.srt) or the student's own recap. Every advice point, action item and resource must carry a verbatim quote; code verifies the quote exists in the transcript and drops items that fail. Sections with no evidence appear as "not covered". Text is treated as data, not instructions.
5. **Mentor review gate, with a timeout.** A draft goes to the mentor via a no-login private link to edit/approve. After 48h it is released automatically, labelled "not reviewed". Rationale: wrong advice attributed to a mentor is costly, but a mentor who never replies must not strand the student.
6. **Double-booking is impossible by construction:** a unique database index on (mentor, slot), not an application-level check. Calendar = `.ics` + Google Calendar link instead of OAuth.
7. **Progress across calls.** A Journey page and reminder emails; the assistant reads prior summaries to suggest the next step or a follow-up with the same mentor.

## Awkward cases handled (all in the eval suite)
Vague input (≤2 questions, then it must recommend) · multiple problems · no match · crisis messages (resources, no mentor push, flagged) vs ordinary stress (not treated as a crisis) · prompt injection · fake/famous mentors · employer/phone questions · job-guarantee asks · rejection and refinement · Hinglish · slot collisions · cancel/reschedule/no-shows · too-short, garbled, small-talk and injected transcripts · PII in transcripts · LLM failures (retry, repair once, graceful message, state kept).

**Evidence:** `npm run eval` runs 35 live checks (29 assistant, 6 summary) plus invariants on every reply (IDs exist, no contact strings, ≤3 picks). 8 of them score *relevance*: the picks must match the need on the mentor's own record (precision 96%, a good pick in 8/8 cases on the last run). `npm test` adds 26 deterministic tests, including the double-booking index and sign-in token rules. Last eval run: see `evals/REPORT.md`.

## Deliberately not built
Accounts and passwords (students sign in with an emailed one-time link, mentors with signed links, admin with one password) · Calendar OAuth/availability sync (mentors set their own hours instead) · automatic call capture or transcription bot · payments · mentor onboarding/profile editing · vector search (unnecessary at 50 mentors; the path at scale is retrieval then rerank) · WhatsApp. Each costs more than it proves in a prototype.

## Assumptions
- Mentor availability starts **seeded** (stable weekly pattern per mentor in their city's time zone; the sheet has none) until the mentor sets their own hours on their private link.
- A mentor's rating ("Quality of Mentorship") is Mesa's internal view; I show it only when present and use it as a tiebreaker, never as a guarantee.
- English-first with light Hinglish; mentors are reachable through the private link rather than the sheet's placeholder emails.
- The demo data (30 students) is flagged and removable; "Real only" filters it from every admin view.

## AI in the build
I used Claude Code to scaffold, write and test, but kept myself on the hard parts: the constraint design (IDs-not-facts), the data cleaning rules, and the eval cases. The evals caught real bugs: a crisis classifier that fired on "idk, everything", a grounding check that rejected "PM", and clarifying questions that weren't counted toward the cap.

## Known limits
Responses take 5-20s (no streaming yet, only staged progress text) · the grounding check is a heuristic, not a proof · sign-in is only verified when an email provider is configured · reminders are daily, not hourly · no mobile polish pass beyond responsive layout.
