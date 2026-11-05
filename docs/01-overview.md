# 01 · Overview

## Product in one sentence
QAI lets QA testers create, run and triage automated website tests in plain language: an AI performs a test the first time and records a script; later runs replay the script cheaply; results come with evidence and a clear next action.

## Why the redesign
The old QAI has a working engine but an unusable product layer:
| Root cause | Symptom in the old app |
|---|---|
| Built engine-first | Menu mirrors the code: Upload, Openworld, Report, Graphs, Timeline. Every task crosses 2–3 sections. |
| No clear user | Non-coder flows (CSV) mixed with coder flows (Python files, regex validation). |
| Two products glued together | Upload and Openworld have separate tests, settings, retries and results. |
| Trust not designed | AI acts, judges and fixes with little evidence; raw agent code shown as "steps"; no correction path. |
Full legacy → new mapping: `13-legacy-mapping.md`.

## Users
| Persona | Role | Uses QAI to | Frequency |
|---|---|---|---|
| **Primary: BQA / manual tester** | Knows what to test, little or no coding. Keeps test cases per module (preconditions, steps, expected result) in ClickUp today. | Turn test cases into automated tests, run regressions, triage failures, write bug tickets | Daily |
| Secondary: QA lead | Owns quality of a project, 1–3 testers per project | See status per module, decide go/no-go | Weekly |
| Tertiary: developer / SDET | Fixes bugs, maintains engine | Read evidence and bug reports | Occasional |
Context: local desktop app, single user per machine; handover between testers by **project export/import**. No multi-user features. One person usually checks a whole project or platform (e.g. admin portal + customer website).

## Design principles
1. **The test case is the central object.** Everything (runs, results, visual comparison, data rows) hangs off it.
2. **Library vs evidence.** Suites = what we test (definitions). Runs = what happened (results). Each only links to the other.
3. **No surprises.** Before a run, the user sees per test whether it will use AI or replay a script, and why.
4. **AI proposes, the human approves once.** One approval point per AI action; no double confirmation.
5. **Evidence first.** Plain-language failure summary and steps first; technical detail on demand.
6. **Tester language.** No engine terms in the UI (see glossary "Never use").
7. **Defaults over configuration.** Advanced options hidden; project defaults; per-run choices in the run dialog.
8. **Every failure has a next action.** Categories map to actions; wrong verdicts can be overridden with proof.

## Prototype scope
In scope: all screens in `03-navigation.md`, interactions, filters, dialogs, state handling, fake data via data layer.
Out of scope: test engine, real AI calls, real browser, file parsing beyond a simulated import check, persistence beyond in-memory/localStorage, authentication, multi-user, mobile layouts beyond basic responsiveness (desktop app; design for 1280–1920 px wide).

## What each stakeholder needs from this prototype
| Stakeholder | Needs |
|---|---|
| End users (BQA) | Clickable core journey to validate: create → run → triage → fix → re-run |
| Front-end developers | Clean component structure, typed domain model, api boundary to swap, rules as tested functions |
| Engine developers | Clear statement of what data the UI expects (07) and what behaviour it assumes (05, 10) |
| Product owner | Traceable decisions (12), parked ideas kept separate (09) |
