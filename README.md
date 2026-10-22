# Mentor Connect

A working prototype for the Mesa assignment: a student describes a career problem to an assistant, gets pointed to mentors **from the 50-mentor sheet only**, books a call (which happens outside the app), and receives a grounded write-up afterwards. The Mesa team gets a dashboard.

- Design note (decisions, non-decisions, assumptions): [docs/DESIGN_NOTE.md](docs/DESIGN_NOTE.md)
- Build plan and awkward-case catalogue: [PLAN.md](PLAN.md)
- Latest AI eval run: [evals/REPORT.md](evals/REPORT.md)

## Run it

```bash
npm install
cp .env.example .env.local     # add LITELLM_API_KEY (any OpenAI-compatible endpoint works), set SESSION_SECRET and ADMIN_PASSWORD
npm run dev                    # http://localhost:3000 (or the next free port; set APP_URL to match)
```

The database is a local SQLite file (`data/app.db`), created and seeded with the mentors on first request. No other services are required. Emails always land in the in-app **Notifications** page; they are also really sent if `RESEND_API_KEY` is set.

### Try the whole flow in ~3 minutes
1. Home → enter a name and email → describe a problem (e.g. "I'm in sales and want to move into growth marketing at a D2C brand").
2. Open a recommended mentor → book a slot → add it to Google Calendar / download the `.ics`.
3. On the booking page click **Pretend the call has happened** (demo-only control; set `DEMO_TOOLS=off` to hide it). Then **Use sample transcript (demo)** → **Generate write-up** (~20s).
4. The mentor reviews through their private link. Mentor emails go to placeholder mailboxes, so open **/admin → Emails** and click the "Please review the write-up…" row. Approve → the student gets the write-up and a checklist.
5. For a populated dashboard and a student with history: **/admin** (password = `ADMIN_PASSWORD`) → Admin tools → **Load demo data** → **Sign in as demo student**.

### Commands
| | |
|---|---|
| `npm run ingest -- "path/to/sheet.csv"` | Re-clean the mentor sheet (CSV or XLSX) into `data/mentors.json`; prints a data-quality report. Delete `data/app.db` to reload. |
| `npm run eval` | 27 behaviour checks against the live model; writes `evals/REPORT.md`. Uses its own `data/eval.db`. |
| `npm run build` | Production build. |

## Deploy (Vercel)
1. Create a Turso database (`turso db create mentor-connect`) and set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Without it the app falls back to an ephemeral `/tmp` database on Vercel.
2. Set `LITELLM_API_KEY` (+ `LITELLM_BASE_URL`/`LLM_MODEL` if using a different gateway), `SESSION_SECRET`, `ADMIN_PASSWORD`, optionally `APP_URL` (not needed on Vercel), optionally `RESEND_API_KEY` / `EMAIL_FROM`, `CRON_SECRET`.
3. `vercel.json` schedules the daily job (auto-release of unreviewed write-ups after 48h, action-item nudges).

## How it is built
Next.js (App Router) · TypeScript · Tailwind · libSQL (SQLite locally, Turso hosted) · Claude Sonnet via an OpenAI-compatible gateway for chat and write-ups, Claude Haiku for triage.

```
data/                  raw sheet + cleaned mentors.json
scripts/ingest-*.ts    sheet → mentors.json (normalise, dedupe, drop placeholders, report)
src/lib/assistant.ts   chat turn: safety triage → catalogue prompt → recommend_mentors tool → ID validation + grounding
src/lib/grounding.ts   deterministic "is this traceable to the sheet / the student?" check
src/lib/booking.ts     slots, double-booking guard (DB unique index), cancel/reschedule, no-show, pre-call brief
src/lib/summarise.ts   transcript → write-up; every item needs a verbatim quote, verified in code
src/lib/admin-stats.ts funnel, unmet demand, mentor concentration, quality/safety
src/lib/demo.ts        labelled demo data
evals/run.ts           product-AI regression suite
```
