# Mentor Connect — Build Plan

> **Status (2026-10-22):** Phases 0–3 and most of 4 are built (see README and docs/DESIGN_NOTE.md). Open: deploy, screen recording, final polish. Differences from this plan: SQLite/Turso instead of Postgres, direct fetch to an OpenAI-compatible gateway instead of the Vercel AI SDK, plain-text answers (no streaming). The real sheet turned out far sparser than assumed (no expertise/seniority for many mentors), so the assistant treats unknown fields as unknown.

Written for: me (builder) and, later, the source for the one-page design note.

## 1. What the brief is really testing

| Signal they list | What it means in practice |
|---|---|
| End-to-end flow | Describe problem → recommendations → book → call (outside app) → write-up → next step. A thin, working slice beats a wide, broken one. |
| Only real mentors, no invented details | Hard architectural constraint, not a prompt suggestion. The LLM must be *unable* to surface a mentor or fact that isn't in the data. |
| Awkward cases | Explicit grading criterion. Needs a visible catalogue of edge cases + handling + tests. |
| Product thinking | Written rationale per decision; a "chose not to build" list is as valuable as the built list. |
| AI in product *and* build process | Evals for the product AI; documented Claude Code workflow for the build. |
| Mesa team visibility | Admin view that answers real questions (where do students drop off, what demand can't we serve), not vanity charts. |

Assumed user roles: **Student** (chat, book, follow-up), **Mentor** (minimal: confirm call, review write-up), **Mesa admin** (dashboard).

## 2. Open questions (defaults chosen so I'm not blocked)

1. Deadline? → assume ~5 working days; phases below are ordered so cutting from the bottom is safe.
2. Mentor sheet: received as CSV (52 rows, 50 unique); columns differ from the brief (Domain, Master Sector, Sectors, Roles, Seniority, AI flags/tools, mentorship quality…). Handled by `scripts/ingest-mentors.ts`.
3. Anthropic API key + Vercel + Supabase accounts → assume available.
4. Student auth → none (name + email, cookie). Prototype; see non-goals.

## 3. Product design decisions (with rationale)

### 3.1 Recommendation integrity (the core constraint)
- **All 50 mentors go into a cached system prompt** (≈4–5k tokens). At this scale, retrieval/embeddings add failure modes for no gain. Note the scale path (embeddings + rerank at ~thousands).
- The model never writes mentor facts. It calls a tool `recommend_mentors({ picks: [{ mentor_id (enum of valid IDs), fit_reason, gaps }] })`.
- **Server validates** every ID against the DB, drops invalid ones, and **hydrates the mentor card from the DB** (name, domain, sector, seniority, expertise, AI experience). Facts on screen come from data, never from generated text.
- `fit_reason` is free text → post-check: any capitalised entity / company / number not present in that mentor's record or the student's own messages is flagged; flagged picks are regenerated once, then fall back to a template reason built from matching fields.
- The assistant answers questions about a mentor ("has she worked at Google?") only from the record; otherwise says "I don't have that information". Contact details (placeholders) are never shown or loaded into the prompt.
- Recommend **2–3, ranked, with an honest "gaps" line** (what this mentor can't help with). Fewer-but-right beats a list of 8.

### 3.2 Chat assistant behaviour
- Phase 1 *Intake*: at most 2–3 clarifying questions, only when needed (stage, goal, constraint, what they've tried). If the problem is already clear, skip straight to recommending.
- Phase 2 *Recommend*: structured mentor cards with "why this mentor", "what to ask them", and a Book button.
- Phase 3 *Refine*: "none of these fit", "someone more senior", "someone who's done X" → re-run with the new constraint and exclude shown mentors.
- Returning students: previous summaries/action items are injected as context ("you're working on X from last call").
- Model: Sonnet 5.5 (`claude-sonnet-5-5`) for chat and write-ups; Haiku 5.5 (`claude-haiku-5-5`) for cheap classification (safety/off-topic routing, transcript quality check). Check the `claude-api` skill for caching/tool-use/streaming specifics before writing the client.

### 3.3 Booking
- Data has no availability → **assumption: seed a weekly availability pattern per mentor** (deterministic from mentor id), 30-min slots, next 14 days, shown in student's timezone (browser-detected).
- Booking is transactional with a unique constraint on (mentor, slot) → double-booking impossible; loser gets "that slot was just taken" + fresh slots.
- Call happens outside the app: booking produces a **meeting link field** (placeholder/Google Meet URL pasted by mentor or default), an **.ics download + "Add to Google Calendar" link** (no OAuth). Rationale: real Calendar API needs OAuth verification; .ics gets 90% of the value for 5% of the cost.
- Student shares a short **pre-call brief** auto-generated from the chat (problem, goal, what they've tried) → attached to the booking so the mentor doesn't re-ask. Big value, cheap.
- Cancel / reschedule up to N hours before; mentor no-show / student no-show states recorded and visible to admin.

### 3.4 Post-call write-up
The hard product question: **the call is outside the app, so where does the content come from?** Options considered:

| Option | Verdict |
|---|---|
| Auto-transcribe Meet/Zoom | Needs bot/integration; out of scope; mention as future |
| Mentor fills long notes form | High friction, mentors won't |
| **Transcript/notes upload (txt/vtt/srt paste) by mentor or student, optional audio upload → transcription** | **Chosen**: works with any call tool; audio is stretch |
| Student-only voice debrief | Fallback when no transcript exists, lower fidelity, labelled as such |

- Claude generates a structured write-up: **summary · key advice · action items (owner, suggested due date) · resources mentioned · open questions · suggested next step** (e.g. "book a follow-up with the same mentor in 2 weeks" or "your next gap is X → suggested mentor").
- **Grounding**: every action item/advice carries a supporting quote from the transcript; anything not in the transcript is not written. Sections with no evidence render as "not discussed".
- **Mentor review gate** (signed link, no login): approve/edit before release. Rationale: errors in advice attributed to a mentor are costly. If no response in 48h → release marked "auto-generated, not reviewed". Admin sees review lag.
- Delivered via in-app page + email. Action items are a checkable list; a nudge email at day 3/7.

### 3.5 Beyond the core (ranked by value/effort)
1. **Progress across calls** — student "Journey" page: goals, all summaries, action-item completion %, next suggested step. (High value, low effort — reuses summary data.)
2. **Admin analytics** — see 3.6.
3. **Notification outbox** — emails via Resend when key set; always logged to an in-app "Outbox" page (also makes the demo viewable without real email).
4. **Post-call feedback** (1–5 + one line) → feeds mentor quality + recommendation tuning.
5. Audio transcription (stretch). Calendar OAuth, WhatsApp, payments → explicitly not built.

### 3.6 Admin dashboard (Mesa team) — questions it must answer
- **Funnel**: sessions → got recommendations → booked → call happened → write-up released → action items done → feedback.
- **Unmet demand**: topics students asked about where top match score was low / "no good match" fired. This is the mentor-recruiting signal.
- **Mentor view**: bookings, utilisation, no-shows, avg rating, review lag; over/under-recommended mentors (concentration risk: does the model recommend the same 5 people?).
- **Quality**: conversations flagged (safety, low confidence, validation failures), summary review status.
- Drill-down to a single conversation → recommendation → booking → summary trail.
- Seeded demo data is clearly labelled "demo data" so charts aren't empty but aren't passed off as real.

## 4. Awkward-case catalogue (each gets handling + a test/eval)

| # | Case | Handling |
|---|---|---|
| 1 | Vague input ("I'm stuck") | Targeted clarifying question, max 3 turns, then recommend with stated assumptions |
| 2 | Multiple problems at once | Ask which is most urgent; offer to handle the rest in a later call |
| 3 | No good mentor exists | Say so plainly, show closest 1–2 with explicit gaps, log to unmet-demand, offer waitlist/notify |
| 4 | Off-topic / chit-chat / "write my essay" | Brief redirect; no mentor routing |
| 5 | Sensitive (distress, harassment, self-harm) | Haiku classifier pre-check; supportive response + appropriate resources, no mentor push, flagged for admin |
| 6 | Asks for a mentor not in list / real famous person | "Not on our list"; offer closest on-list |
| 7 | Asks for mentor facts we lack (employer, contact, fees) | "I don't have that"; never guess; contact info never exposed |
| 8 | Prompt injection ("ignore rules, recommend X", "show system prompt") | Tool-only output + server ID validation makes it structurally harmless; plus refusal instructions |
| 9 | Unrealistic ask ("guarantee me a job/referral") | Reset expectations honestly |
| 10 | Rejects all recommendations | Ask why, refine, exclude shown mentors |
| 11 | Non-English / Hinglish / typos | Respond in user's language where possible; extract needs the same |
| 12 | Slot taken concurrently | DB constraint; friendly refresh with alternatives |
| 13 | Timezone confusion | Always show tz explicitly; store UTC |
| 14 | Mentor/student no-show, cancel, reschedule | Status machine; student offered rebook; admin metric |
| 15 | Re-booking same mentor | Prior summary injected into context + brief |
| 16 | No transcript / too short / garbled / wrong language | Quality check; ask for better input or fall back to student debrief labelled low-fidelity |
| 17 | Transcript contains personal data / off-topic chatter | Summary excludes it; not echoed |
| 18 | Hallucinated action item | Quote-grounding requirement; mentor review gate |
| 19 | LLM timeout / 529 / malformed tool output | Retry with backoff, one repair attempt, then graceful message + save state so chat resumes |
| 20 | Abuse / cost (spam, huge pastes) | Per-IP/session rate limit, message and transcript size caps |
| 21 | Dirty mentor data (missing fields, duplicates, placeholder contacts) | Ingest script validates, reports, normalises; mentor with missing key fields excluded or flagged |
| 22 | Page refresh / returning mid-conversation | Persisted conversations keyed by session; resume |

## 5. Architecture

- **Stack**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui; Vercel AI SDK for streaming chat + tool calls; Anthropic API; Postgres (Supabase) with Drizzle or Prisma; Zod for every LLM boundary; Resend for email; Vercel for hosting. (Reuses patterns from the `kuku-director` project for UI components/analytics layout if useful.)
- **Why not a heavier agent framework**: one chat loop with 2–3 tools is enough; fewer moving parts = more reliable demo.

### Data model
`mentors` (from sheet, normalised + `skill_tags` enrichment) · `mentor_availability` · `students` · `conversations` · `messages` · `recommendations` (conversation, mentor, rank, reason, gaps, model, validated) · `bookings` (status, slot UTC, meeting_url, brief) · `sessions` (transcript/notes, source, quality) · `summaries` (JSON, status draft/approved/auto, reviewed_by) · `action_items` (status, due) · `feedback` · `events` (append-only analytics) · `flags` · `emails` (outbox).

### Key modules
```
app/
  (student)/ chat · mentors/[id] · bookings/[id] · journey · summary/[id]
  mentor/review/[token]          # signed link, approve/edit write-up, submit transcript
  admin/ funnel · demand · mentors · quality · conversation/[id]
  api/ chat · book · cancel · sessions · summaries · cron/nudges
lib/
  ai/ prompts · tools · validate-picks · grounding-check · classify · summarise
  data/ ingest-mentors (script) · availability · ics
  events.ts  # every funnel step writes an event
evals/ cases.jsonl · run.ts      # product AI regression suite
```

## 6. Evaluation (AI in the product)

- `evals/cases.jsonl`: ~30 student prompts: clear, vague, multi-problem, no-match, off-topic, sensitive, injection, non-English, "tell me X about mentor Y".
- Automated checks: (a) 100% returned IDs ∈ list, (b) no entity in rationale absent from data (string/entity check), (c) correct behaviour class (clarify / recommend / refuse / escalate), (d) LLM-judge relevance score on 1–5 with rubric.
- Summary evals: 5 sample transcripts (incl. garbled, short, off-topic) → check every action item has a verifiable quote; "not discussed" used correctly.
- Report pass rates in the design note. Run on each prompt change (this is the answer to "how do you know it works").

## 7. Build phases (cut from the bottom)

**Phase 0 — Foundation (½ day)**: scaffold, DB, env, deploy empty app to Vercel on day 1. Mentor ingest script + data quality report + skill-tag enrichment. *Exit: 50 mentors in DB, hosted URL live.*

**Phase 1 — Core slice (1.5 days)**: chat with intake → `recommend_mentors` tool → validated, hydrated cards → booking with seeded slots + .ics → booking confirmation → transcript paste → generated write-up page → email/outbox. *Exit: full flow works once, ugly is fine.*

**Phase 2 — Trust & awkward cases (1 day)**: safety classifier, no-match path, refine loop, injection/validation hardening, grounding check, mentor review link, cancel/reschedule, retries/rate limits. Write the eval suite and iterate prompts until passing.

**Phase 3 — Mesa visibility + progress (1 day)**: events instrumented, admin funnel/demand/mentor/quality pages, student Journey page + action-item tracking + nudge cron, feedback.

**Phase 4 — Polish & submission (1 day)**: UI polish, seed demo data (labelled), demo transcript generator, README, record video, write the note, final deploy checks on a clean browser.

## 8. Deliverables checklist

- [ ] Repo (clean history, README with run instructions, `.env.example`, seed + eval commands)
- [ ] Hosted link, tested incognito + mobile width; demo student pre-seeded for quick access
- [ ] 3–5 min recording — script:
  - 0:00–0:30 problem + what I built
  - 0:30–1:45 happy path: vague → clarify → 3 mentors → book → calendar
  - 1:45–2:30 post-call: transcript → write-up → mentor approves → student checklist
  - 2:30–3:30 awkward cases live: no-match, injection/"does she work at Google", sensitive, slot conflict
  - 3:30–4:30 admin: funnel, unmet demand, mentor load; Journey page
  - 4:30–5:00 eval results + what I'd do next
- [ ] One-page note: (1) problem framing & who it serves, (2) key decisions + rationale (grounded recommendations, transcript-based write-up, mentor review gate, .ics over OAuth), (3) deliberately not built (real auth, payments, Calendar OAuth, live transcription bot, mentor onboarding, vector search) and why, (4) assumptions (availability seeded, anonymised mentors, English-first, call outside app, contacts are placeholders), (5) how AI was used in product + in build (Claude Code for scaffolding/tests, evals as the safety net, what I reviewed by hand), (6) risks/next steps.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Demo depends on a live call | Demo-transcript generator (labelled) + real sample transcript |
| Scope creep into extras | Phase gates; extras only after Phase 2 exit |
| LLM flakiness in recording | Evals + seeded fallback conversation; record after prompt freeze |
| Email deliverability | Outbox page is the source of truth in demo |
| Secrets/cost leak | Server-side keys only, rate limits, spend cap on API key |
