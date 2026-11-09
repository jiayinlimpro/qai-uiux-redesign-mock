# Screens · Runs (running)

## 5.1 Run dialog (modal)
**Opened from** Suites selection / test Run / suite Run (Overview) / result Re-run / bulk Re-run with model / Edit test "Save and re-run".
**Content**
1. Scope: "Suite: 09 Contact Us · 4 tests" (or "<n> selected tests"; "All tests · <n>" from New run with no selection, including tests not in a suite, D56) + Change selection (closes the dialog, goes to Suites).
2. Environment (select, project environments) · AI model (project default + others; preselected when "Re-run with model…").
3. Browsers for script replays: Chrome / Firefox / Safari (WebKit) checkboxes (default Chrome); note "AI runs always use Chrome. A test with a browser preference replays only in the browsers it allows." (BR-RUN-13, D53)
4. Visual comparison line: "Visual comparison: on · <n> replays compared with their previous run · <k> tests excluded" + link to Project settings (or "off").
5. **How each test will run** table: Test · Mode (AI run / Script replay / Data rows, or Not run) · Why ("Valid script from run #9", "No script yet", "Edited after last run (v3), script reset", "Last AI run failed, so no valid script", "Force AI is on", "No allowed browser selected (test allows Chrome, Safari)") · Browsers (only when a test's browsers differ from the selection). Checkbox **Force AI for all** (updates the table). "No test can run with these browsers." disables Start run.
6. Advanced (collapsed): headless, parallel + workers, max AI steps, max actions per step (prefilled from Project settings › Run defaults, same limits, BR-RUN-12); browser extension shown read-only from Project settings.
7. Pre-flight check result area [DEV-CONFIRM]: list of checks with pass/warn/block, shown after Start run (D57).
**Actions** Cancel · Start run (primary); after a warning: **Start anyway**. Starting opens 5.2 Live run.
**States** Loading ("Preparing the run…"), error with Retry.
**Not included** Cost or time estimate. [DECIDED]

## 5.2 Live run
**Layout** Header: breadcrumb "Runs › Run #14" (the top bar breadcrumb, D31), title "Running · <scope> · <environment>", Pause · Stop. Progress card: "Test 3 of 4 · 2 passed · 0 failed", elapsed, **cost so far**, progress bar.
Three areas: Queue (each test: state chip Passed/Failed/Running/Queued + mode) · Live screenshot (refreshed per step; caption URL + browser) · **Narration panel**: Now running (ID + title) · Step k of n (step text) · Doing (current action in plain language) · Why (one line) · Checks so far (passed / waiting) · "AI steps used x of max" (script replays: "Script replay: no AI steps") · **Skip test** (BR-RUN-14; no Stop test, D54) · expandable Full AI reasoning.
**Stop** asks for confirmation, then the run ends as "Stopped at x/y" (BR-RUN-15, D55). Pause → 5.3.
**In-browser panel**: when headless is off and the panel can attach, the same narration also appears beside the test browser; otherwise only in-app. [DEV-CONFIRM]
**User may leave** the screen; the run continues; Runs list shows progress.

## 5.3 Paused / interrupted run
Banner variants (amber): "Interrupted at test 34 of 83 — QAI closed while the run was in progress. Progress up to test 34 is saved." → **Resume from test 35** · Stop run. Proposed variants [DEV-CONFIRM]: "AI provider unavailable — retrying automatically, then waits for you"; "UAT website not responding for 5 tests in a row"; "Blocked before start: API key rejected (pre-flight)".
Banner actions: Resume from test <n> · Stop run (confirmation, D55). User pause: "Paused at test 3 of 4 — You paused this run. Progress up to test 3 is saved."
Progress card: "<done> of <total> · passed · failed · <n> not run" + cost so far. Note: "Tests that never ran show as Not run, never as Failed, and do not count in the pass rate."

## 5.4 Runs list
Header "Runs" + subtitle "Every execution, with the exact test versions it used." + New run (All tests, D56). Table: Run (link) · Started ("Today 10:02", "Yesterday 16:40", "16 Oct") · Scope ("All tests · 83", "09 Contact Us · 4 tests", "CNT-04 only") · Environment (run snapshot, D36) · **Duration** ("45s", "2m 54s", "1h 05m") · State (Running x/y · Paused · Interrupted at x/y · Completed · Stopped at x/y) · Results (chips computed from results) · Cost · action (Watch / Resume / Open). Running rows update live.
**States** Empty: "No runs yet" + "Select tests in Suites to run them" + Go to Suites · Loading · Error with Retry.
