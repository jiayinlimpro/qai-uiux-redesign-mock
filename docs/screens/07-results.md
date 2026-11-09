# Screens · Results

## 6.1 Run results + result detail
**Header bar** "Runs › Run #12 · <scope> · <environment> · <date> · <cost>", title "Run #12 · 83 tests". **Summary buttons** (toggle, act as the status filter): All 83 · 8 failed · 3 couldn't complete · 72 passed (· n not run if any).
**Layout** Master–detail, draggable split.

### Left: results list
- Search · Reason filter (BR-LIST-03: failed reasons when Failed selected, couldn't-complete reasons when Couldn't complete selected, all when All, hidden when Passed) · Mode filter (AI / Script / Data rows) · Worth a look toggle [PROPOSAL] · Clear filters.
- "Select all shown (n)" checkbox. Bulk bar only when ≥1 selected: "<n> selected" · Re-run · Re-run with model… · Copy bug reports · Known issue · Clear.
- Rows (flat, sorted per BR-LIST-03): checkbox · status icon (✕ failed, ! couldn't complete, ✓ passed, ○ not run; with accessible label) · ID · title · worth-a-look dot · second line muted "<reason> · <mode> · <suite>" · **cost** right-aligned. Multi-browser: small browser marks after mode (e.g. "Chrome ✓ Safari ✕").

### Right: result detail
- Suite name; "<ID> · <title>"; chips: status · reason · mode · browser(s); line "Ran on test vN (current) · Open test · View test history".
- Actions: **Re-run** (primary) · Copy bug report · Edit test · Override.
- Worth-a-look banner with reason (if flagged) [PROPOSAL]. Override banner if overridden ("Overridden to Passed by <user> · <date> · AI verdict: Failed · reason · proof").
- Tabs: **Steps and evidence** · **Technical**.
- Steps and evidence:
  - **Failure summary card** (failed/couldn't complete): "Failed at step 2 of 3: <step text>" · "Expected <x> · Found <y>" · reason explanation + recommended action (BR-REASON-04).
  - "Show technical details" toggle (remembered).
  - Steps come from the test's own numbered steps; if the test has a single paragraph, the AI derives steps and labels them "AI-derived".
  - Step list (3 levels): **intent step row** (status, "n. step text", "k actions · duration", screenshot thumbnail) → expanded: Actions (plain language) · Check (expected → found) · AI reasoning (one line) · Technical (raw action, locator, URL, full AI thought; only with toggle) · screenshot (click → viewer). **Failed step expanded by default.**
  - Data rows breakdown (if data rows): Row · varied field/value · Expected · Result.
  - Visual flags per step (if any) → 6.2.
- Technical tab: Script & versions · AI thoughts · Usage (tokens, cost) · Knowledge used · Logs.

## 6.2 Visual compare (overlay)
Header: "<ID> · Run #12 · Chrome 1920×1080" · "Step k of n · <step>" · Previous step / Next step / Close. Chip "<n> areas changed since the previous run". Two panels: **Previous run · Run #11** and **This run · Run #12** (changed areas outlined). (Third panel "Pinned reference" only if pinned — PARKED.) Footer note "A visual change is a flag, never a failure. Ignored areas are not compared." Actions: Mark as bug (→ 6.4) · Ignore an area… · **Looks fine** (dismisses the flag).
**Drawing ignore areas** (D45): Ignore an area… draws the area on this step's screenshot. Suites › Visual check › **Add area** opens this view on the chosen step for the same purpose; until drawn, an area shows "Not drawn yet" there.

## 6.3 Override (dialog, 720 px)
AI verdict (kept for audit) chips · New status radio Passed/Failed · Reason (required textarea) · Proof (required: drop or choose a file) · note "The result shows 'Overridden by <user>' with your reason and proof. The pass rate uses the new status." · Cancel / Save override (disabled until reason + proof).

## 6.4 Bug report (dialog, 720 px)
Note "Editable before copying. Paste into a ClickUp task." Card with editable fields: Title · Environment (env · app · browser · viewport · run · date) · Steps to reproduce (numbered, plain language) · Expected · Actual · Screenshots (thumbnails). Actions: Save screenshots · **Copy report** (primary; copies formatted text).
