# Screens · Runs (running)

## 5.1 Run dialog (modal)
**Opened from** Suites selection / test Run / suite Run (Overview) / result Re-run / bulk Re-run with model / Edit test "Save and re-run".
**Content**
1. Scope: "Suite: 09 Contact Us · 4 tests" (or "<n> selected tests") + Change selection.
2. Environment (select, project environments) · AI model (project default + others; preselected when "Re-run with model…").
3. Browsers for script replays: Chrome / Firefox / Safari (WebKit) checkboxes; note "AI runs always use Chrome."
4. Visual comparison line: "Visual comparison: on · <n> replays compared with their previous run · <k> tests excluded" + link to Project settings (or "off").
5. **How each test will run** table: Test · Mode (AI run / Script replay) · Why ("Valid script from run #9", "No script yet", "Edited after last run (v3), script reset", "Last AI run failed, so no valid script"). Checkbox **Force AI for all**.
6. Advanced (collapsed): headless, parallel + workers, max AI steps, max actions per step, browser extension (prefilled from Project settings).
7. Pre-flight check result area [DEV-CONFIRM]: list of checks with pass/warn/block.
**Actions** Cancel · Start run (primary).
**Not included** Cost or time estimate. [DECIDED]

## 5.2 Live run
**Layout** Header: breadcrumb "Runs › Run #14", title "Running · <scope> · <environment>", Pause · Stop. Progress card: "Test 3 of 4 · 2 passed · 0 failed", elapsed, **cost so far**, progress bar.
Three areas: Queue (each test: state chip Passed/Failed/Running/Queued + mode) · Live screenshot (refreshed per step; caption URL + browser) · **Narration panel**: Now running (ID + title) · Step k of n (step text) · Doing (current action in plain language) · Why (one line) · Checks so far (passed / waiting) · "AI steps used x of max" · Skip test · Stop test · expandable Full AI reasoning.
**In-browser panel**: when headless is off and the panel can attach, the same narration also appears beside the test browser; otherwise only in-app. [DEV-CONFIRM]
**User may leave** the screen; the run continues; Runs list shows progress.

## 5.3 Paused / interrupted run
Banner variants (amber): "Interrupted at test 34 of 83 — QAI closed while the run was in progress. Progress up to test 34 is saved." → **Resume from test 35** · Stop run. Proposed variants [DEV-CONFIRM]: "AI provider unavailable — retrying automatically, then waits for you"; "UAT website not responding for 5 tests in a row"; "Blocked before start: API key rejected (pre-flight)".
Progress card: "<done> of <total> · passed · failed · <n> not run" + cost so far. Note: "Tests that never ran show as Not run, never as Failed, and do not count in the pass rate."

## 5.4 Runs list
Header "Runs" + New run. Table: Run (link) · Started · Scope · Environment · **Duration** · State (Running x/y · Paused · Interrupted at x/y · Completed) · Results (chips) · Cost · action (Watch / Resume / Open).
**States** Empty: "No runs yet" + "Select tests in Suites to run them".
