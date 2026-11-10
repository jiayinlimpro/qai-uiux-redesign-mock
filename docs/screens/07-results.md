# Screens · Results

## 6.1 Run results + result detail
**Header bar** "<scope> · <environment> · <date> · <cost>" (+ "· Stopped at x/y", D55); "Runs › Run #12" is the top bar breadcrumb (D31, as in 5.2). Title "Run #12 · 83 tests". **Summary buttons** (toggle, act as the status filter): All 83 · 8 failed · 3 couldn't complete · 72 passed (· n not run if any).
**Layout** Master–detail, draggable split. No `?result=` → the first shown result is selected; an unknown one → "This result is not part of this run."
**Rows** One per test in the run's frozen list. A test with no result (the run was stopped before it, D55) is **Not run** with the note "The run was stopped before this test"; it is selectable and can be re-run; its detail says there is no evidence (Re-run · Edit test only).

### Left: results list
- Search · Reason filter (BR-LIST-03: failed reasons when Failed selected, couldn't-complete reasons when Couldn't complete selected, all when All, hidden when Passed) · Mode filter (AI / Script / Data rows) · Worth a look toggle [PROPOSAL] · Clear filters.
- "Select all shown (n)" checkbox. Bulk bar only when ≥1 selected: "<n> selected" · Re-run · Re-run with model… (a menu of the configured models) · Copy bug reports · Known issue · Clear. Known issue for one result: result detail › More, or select it and use the bulk bar (D63). Deleted tests are left out of Re-run and Known issue; Copy bug reports leaves out results that did not fail (a message says how many) (D63).
- Rows (flat, sorted per BR-LIST-03): checkbox · status icon (✕ failed, ! couldn't complete, ✓ passed, ○ not run; with accessible label) · ID · title · worth-a-look dot · "Known issue" label · second line muted "<reason> · <mode> · <suite>" ("Overridden" replaces the reason of an overridden result; a note is appended) · **cost** right-aligned. Multi-browser: small browser marks after mode (e.g. "Chrome ✓ Safari ✕").

### Right: result detail
- Suite name; "<ID> · <title>"; chips: status · reason · mode · browser(s); line "Ran on test vN (current) · Open test · View test history".
- Actions: **Re-run** (primary; run dialog with this test, the run's environment and model) · Copy bug report (**Failed** only, D63) · Edit test · Override (not for Not run) · More › Mark known issue / Update known issue (D63). Chips also show Low confidence (BR-REASON-06), Script re-recorded (BR-RUN-07) and Known issue (· ticket; "marked by <user> · <date>").
- Worth-a-look banner with reason (if flagged) [PROPOSAL]. Override banner if overridden, showing the **latest** override ("Overridden to Passed by <user> · <date> · AI verdict: Failed · reason · proof"); earlier overrides are listed under **History** in the banner, newest first. Every override is kept; the newest applies (D62).
- Tabs: **Steps and evidence** · **Technical**.
- Steps and evidence:
  - **Failure summary card** (failed/couldn't complete): "Failed at step 2 of 3: <step text>" · "Expected <x> · Found <y>" · reason explanation + recommended action (BR-REASON-04).
  - "Show technical details" toggle (remembered).
  - Steps come from the test's own numbered steps; if the test has a single paragraph, the AI derives steps and labels them "AI-derived" (`Result.stepsSource`, D58).
  - Step list (3 levels): **intent step row** (status, "n. step text", "k actions · duration", screenshot thumbnail) → expanded: Actions (plain language) · Check (expected → found) · AI reasoning (one line) · Technical (raw action, locator, URL, full AI thought; only with toggle) · screenshot (click → viewer). **Failed step expanded by default.**
  - Data rows breakdown (if data rows): Row · varied field/value · Expected · Result.
  - Visual flags per step (if any) → 6.2.
- Technical tab: Script & versions · AI thoughts · Usage (tokens, cost) · Knowledge used · Logs.
- Evidence the engine did not write (locator, URL, AI thought, tokens, knowledge used, logs) shows **"Not recorded"** (D58, CLAUDE.md rule 10).

## 6.2 Visual compare (overlay)
Header: "<ID> · Run #12 · Chrome 1920×1080" · "Step k of n · <step>" · Previous step / Next step / Close. Chip "<n> areas changed since the previous run". Two panels: **Previous run · Run #11** and **This run · Run #12** (changed areas outlined). (Third panel "Pinned reference" only if pinned — PARKED.) Footer note "A visual change is a flag, never a failure. Ignored areas are not compared." Actions: Mark as bug (→ 6.4, a report of the visual change: expected "as in Run #9", actual "n areas changed at step k") · Ignore an area… · **Looks fine** (dismisses the flag). Previous step / Next step move through the steps that ran.
**Looks fine** (D59): the change is kept and shows "Looks fine · <user> · <date>" with **Undo**; dismissed flags are not counted. Changed areas are outlined from `visual.changedRegions` when the engine returns them; otherwise the prototype outlines them at fixed placeholder positions (D64, open question 23).
**Drawing ignore areas** (D45): Ignore an area… draws the area on this step's screenshot. Suites › Visual check › **Add area** saves the area, then opens this view on the chosen step (of the latest comparison) to draw it; until drawn, an area shows "Not drawn yet" there, with **Draw** when that step has a screenshot. Drawing: drag on This run's screenshot, or focus the area and use arrow keys (move) / Shift + arrow keys (resize); name required; Save area. No new version (BR-VERSION-01).

## 6.3 Override (dialog, 720 px)
AI verdict (kept for audit) chips · New status radio Passed/Failed · Reason (required textarea) · Proof (required: drop or choose a file) · note "The result shows 'Overridden by <user>' with your reason and proof. The pass rate uses the new status." · Cancel / Save override (disabled until reason + proof).

## 6.4 Bug report (dialog, 720 px)
Note "Editable before copying. Paste into a ClickUp task." Card with editable fields: Title · Environment (env · app · browser · viewport · run · date; the app is the one whose URL has the test's start page host, else left out) · Steps to reproduce (numbered, plain language, up to the failing step) · Expected · Actual · Screenshots (thumbnails). Actions: Save screenshots (prototype: placeholder images) · **Copy report** (primary; copies formatted text). Bulk: one card per Failed result, each with Copy, and "Copy N reports"; other results are skipped with a message (D63).
