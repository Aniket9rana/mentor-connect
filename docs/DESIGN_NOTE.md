# Mentor Connect: design note

*Mesa technical associate assignment · Aniket Rana · live at mentor-connect-beryl-one.vercel.app*

A student describes a career problem to an assistant, gets 1-3 mentors from the 50-mentor sheet, books a 30-minute call (the call itself happens elsewhere) and afterwards receives a write-up with action items. Mesa sees where students drop off and which demand it cannot serve.

## Decisions I took, and why

1. **The model cannot invent a mentor.** All 50 profiles sit in the prompt (about 4k tokens, so no retrieval layer). The model answers through a tool that returns mentor IDs; code validates them and builds each card from the sheet. Its free text must trace to the record or the student's own words, or a template replaces it. A made-up mentor or employer is the worst failure here, so it is prevented structurally, not by prompting.
2. **The sheet is messy, so the product says so.** 52 rows, 2 duplicates; 28 of 50 mentors have no seniority; 13 have a rating. Unknown stays unknown (never "junior"), thin profiles are flagged to the student, and contact fields and anonymised company labels never reach a prompt or a page.
3. **Honest "no match".** The list leans business, marketing, product, growth and sales; there are no design or engineering mentors. The assistant says so, shows at most two closest mentors with their gaps, and logs the gap. The student can join a waitlist; Mesa gets a recruiting brief from the Demand page.
4. **The write-up comes from a transcript and is quote-verified.** The call is outside the app, so the input is a pasted or uploaded transcript (.txt/.vtt/.srt) or the student's own recap. Every advice point, action item and resource needs a verbatim quote that code checks; failures are dropped, uncovered topics show as "not covered", and transcript text is treated as data, never instructions.
5. **A mentor review gate with a timeout.** A no-login private link lets the mentor edit or approve. After 48 hours it releases, labelled "not reviewed". Wrong advice under a mentor's name is costly, but a silent mentor must not strand a student.
6. **Correctness lives in the database.** A unique index on (mentor, slot) makes double-booking impossible even in a race; only slots the mentor actually offers can be booked. Calendar is .ics plus a Google Calendar link, not OAuth.
7. **Safety is checked before routing.** A classifier plus a regex backstop catches crisis messages: the student gets resources, not mentors, and the team is alerted. Ordinary stress is not treated as a crisis (the evals caught this going wrong).
8. **Evidence, not vibes.** 35 live-model checks (awkward cases, injection, no-match, Hinglish, bad transcripts), invariants on every reply (IDs exist, no contact strings, at most 3 picks), 8 relevance cases scoring picks against the mentor's own record (96% precision on the last run), and 26 deterministic tests. The admin view answers real questions: funnel by student, unmet demand, mentor concentration, quality flags.

## Decisions I chose not to take, and why

- **Accounts and passwords.** An emailed one-time link (or name + email) proves the flow; passwords add risk and no insight.
- **Calendar OAuth, call capture, transcription bot.** Integration and verification cost far more than they prove; .ics plus transcript paste gives most of the value.
- **Vector search.** 50 mentors fit in a prompt. At thousands: retrieve, then rerank.
- **Payments, WhatsApp, mentor onboarding.** Not what a prototype needs to prove.
- **Streaming and ratings-into-recommendations.** Replies take 5-20s, a known cost (the chat shows staged progress). Ratings would change the prompt and need their own eval.

## Assumptions

- The sheet has no availability, so each mentor gets a seeded weekly pattern in their city's time zone until they set their own hours.
- "Quality of Mentorship" is Mesa's internal view: shown only when present, a tie-breaker, never a guarantee.
- English-first with light Hinglish; the crisis reply is India-first (Tele-MANAS). Mentors are reached by private link because the sheet's contact fields are placeholders.
- Calls are 30 minutes; changes close 2 hours before.
- The 30 demo students are labelled and removable; every admin view can filter to real data only.

## AI in the build

I used Claude Code to scaffold, write and test, and kept my own judgement on the hard parts: the IDs-not-facts constraint, the data-cleaning rules and the eval cases. The evals caught real bugs: a crisis classifier that fired on "idk, everything", a grounding check that rejected "PM", and clarifying questions that were not counted toward the cap.

_Known limits: replies take 5-20s; the grounding check is a heuristic, not a proof; emailed sign-in only works for everyone once a sender domain is verified; reminders are daily; no real-device mobile pass._
