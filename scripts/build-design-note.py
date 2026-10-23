#!/usr/bin/env python3
"""Single source for the one-page design note. Writes docs/DESIGN_NOTE.md and docs/design-note.html.
PDF: Chrome headless on the HTML (see README of this script's last lines)."""
import html, re

TITLE = "Mentor Connect: design note"
SUB = "Mesa technical associate assignment · Aniket Rana · live at mentor-connect-beryl-one.vercel.app"
INTRO = ("A student describes a career problem to an assistant, gets 1-3 mentors from the 50-mentor sheet, books a 30-minute call "
         "(the call itself happens elsewhere) and afterwards receives a write-up with action items. Mesa sees where students drop off "
         "and which demand it cannot serve.")

DECISIONS = [
 ("The model cannot invent a mentor.", "All 50 profiles sit in the prompt (about 4k tokens, so no retrieval layer). The model answers through a tool that returns mentor IDs; code validates them and builds each card from the sheet. Its free text must trace to the record or the student's own words, or a template replaces it. A made-up mentor or employer is the worst failure here, so it is prevented structurally, not by prompting."),
 ("The sheet is messy, so the product says so.", "52 rows, 2 duplicates; 28 of 50 mentors have no seniority; 13 have a rating. Unknown stays unknown (never \"junior\"), thin profiles are flagged to the student, and contact fields and anonymised company labels never reach a prompt or a page."),
 ("Honest \"no match\".", "The list leans business, marketing, product, growth and sales; there are no design or engineering mentors. The assistant says so, shows at most two closest mentors with their gaps, and logs the gap. The student can join a waitlist; Mesa gets a recruiting brief from the Demand page."),
 ("The write-up comes from a transcript and is quote-verified.", "The call is outside the app, so the input is a pasted or uploaded transcript (.txt/.vtt/.srt) or the student's own recap. Every advice point, action item and resource needs a verbatim quote that code checks; failures are dropped, uncovered topics show as \"not covered\", and transcript text is treated as data, never instructions."),
 ("A mentor review gate with a timeout.", "A no-login private link lets the mentor edit or approve. After 48 hours it releases, labelled \"not reviewed\". Wrong advice under a mentor's name is costly, but a silent mentor must not strand a student."),
 ("Correctness lives in the database.", "A unique index on (mentor, slot) makes double-booking impossible even in a race; only slots the mentor actually offers can be booked. Calendar is .ics plus a Google Calendar link, not OAuth."),
 ("Safety is checked before routing.", "A classifier plus a regex backstop catches crisis messages: the student gets resources, not mentors, and the team is alerted. Ordinary stress is not treated as a crisis (the evals caught this going wrong)."),
 ("Evidence, not vibes.", "35 live-model checks (awkward cases, injection, no-match, Hinglish, bad transcripts), invariants on every reply (IDs exist, no contact strings, at most 3 picks), 8 relevance cases scoring picks against the mentor's own record (96% precision on the last run), and 26 deterministic tests. The admin view answers real questions: funnel by student, unmet demand, mentor concentration, quality flags."),
]
NOT_BUILT = [
 ("Accounts and passwords.", "An emailed one-time link (or name + email) proves the flow; passwords add risk and no insight."),
 ("Calendar OAuth, call capture, transcription bot.", "Integration and verification cost far more than they prove; .ics plus transcript paste gives most of the value."),
 ("Vector search.", "50 mentors fit in a prompt. At thousands: retrieve, then rerank."),
 ("Payments, WhatsApp, mentor onboarding.", "Not what a prototype needs to prove."),
 ("Streaming and ratings-into-recommendations.", "Replies take 5-20s, a known cost (the chat shows staged progress). Ratings would change the prompt and need their own eval."),
]
ASSUMPTIONS = [
 "The sheet has no availability, so each mentor gets a seeded weekly pattern in their city's time zone until they set their own hours.",
 "\"Quality of Mentorship\" is Mesa's internal view: shown only when present, a tie-breaker, never a guarantee.",
 "English-first with light Hinglish; the crisis reply is India-first (Tele-MANAS). Mentors are reached by private link because the sheet's contact fields are placeholders.",
 "Calls are 30 minutes; changes close 2 hours before.",
 "The 30 demo students are labelled and removable; every admin view can filter to real data only.",
]
BUILD = ("I used Claude Code to scaffold, write and test, and kept my own judgement on the hard parts: the IDs-not-facts constraint, the data-cleaning rules and the eval cases. "
         "The evals caught real bugs: a crisis classifier that fired on \"idk, everything\", a grounding check that rejected \"PM\", and clarifying questions that were not counted toward the cap.")
LIMITS = ("Known limits: replies take 5-20s; the grounding check is a heuristic, not a proof; emailed sign-in only works for everyone once a sender domain is verified; reminders are daily; no real-device mobile pass.")

def md():
    o = [f"# {TITLE}", "", f"*{SUB}*", "", INTRO, "", "## Decisions I took, and why", ""]
    o += [f"{i}. **{h}** {t}" for i, (h, t) in enumerate(DECISIONS, 1)]
    o += ["", "## Decisions I chose not to take, and why", ""]
    o += [f"- **{h}** {t}" for h, t in NOT_BUILT]
    o += ["", "## Assumptions", ""] + [f"- {a}" for a in ASSUMPTIONS]
    o += ["", "## AI in the build", "", BUILD, "", f"_{LIMITS}_", ""]
    return "\n".join(o)

def e(s): return html.escape(s)
def page():
    dl = "".join(f"<li><b>{e(h)}</b> {e(t)}</li>" for h, t in DECISIONS)
    nb = "".join(f"<li><b>{e(h)}</b> {e(t)}</li>" for h, t in NOT_BUILT)
    asm = "".join(f"<li>{e(a)}</li>" for a in ASSUMPTIONS)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(TITLE)}</title>
<style>
@page {{ size: A4; margin: 11mm 12mm; }}
* {{ box-sizing: border-box; }}
body {{ font: 9.6pt/1.4 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #15151f; margin: 0; }}
h1 {{ font-size: 18pt; margin: 0 0 1px; letter-spacing: -0.01em; }}
.sub {{ color: #5a5a6e; font-size: 8.6pt; margin: 0 0 5px; }}
.intro {{ margin: 0 0 6px; }}
.cols {{ display: grid; grid-template-columns: 1.55fr 1fr; gap: 14px; }}
h2 {{ font-size: 9.2pt; text-transform: uppercase; letter-spacing: .06em; color: #3a2fc4; margin: 0 0 3px; padding-bottom: 2px; border-bottom: 1px solid #d9d6f5; }}
ol, ul {{ margin: 0 0 7px; padding-left: 14px; }}
li {{ margin: 0 0 4px; }}
b {{ font-weight: 650; }}
.foot {{ margin-top: 4px; color: #4a4a5e; font-size: 8.4pt; }}
</style></head><body>
<h1>{e(TITLE)}</h1><p class="sub">{e(SUB)}</p><p class="intro">{e(INTRO)}</p>
<div class="cols"><div><h2>Decisions I took, and why</h2><ol>{dl}</ol></div>
<div><h2>Decisions I chose not to take, and why</h2><ul>{nb}</ul><h2>Assumptions</h2><ul>{asm}</ul>
<h2>AI in the build</h2><p style="margin:0">{e(BUILD)}</p></div></div>
<p class="foot">{e(LIMITS)}</p></body></html>"""

open("docs/DESIGN_NOTE.md", "w").write(md())
open("docs/design-note.html", "w").write(page())
print("wrote docs/DESIGN_NOTE.md and docs/design-note.html")
