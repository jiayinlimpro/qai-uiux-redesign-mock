# 05 · Business rules

Implement rules as pure functions in `src/lib/` with the rule ID in a comment, and unit-test them.
Rules marked [DEV-CONFIRM] are built in the UI as specified, but the real engine behaviour must be confirmed (see 10).

## Status (BR-STATUS)
- **BR-STATUS-01** Statuses: `passed`, `failed` (the app did not meet the expected result), `couldnt_complete` (no verdict: system, AI or environment problem), `not_run` (deselected, stopped, interrupted, or never executed). A test that has never run shows **Not run**, never a blank status.
- **BR-STATUS-02** Pass rate = passed / (passed + failed). `couldnt_complete` and `not_run` are excluded and shown separately.
- **BR-STATUS-03** Multi-browser roll-up for one result: failed if any browser failed; else couldnt_complete if any couldn't complete; else passed if all passed; else not_run. Show a per-browser breakdown. Label WebKit as "Safari (WebKit)".
- **BR-STATUS-04** Data rows roll-up: passed only if every row met its expectation; show "k/n rows".
- **BR-STATUS-05** An override replaces the status used in all counts; the AI verdict is kept and shown.
- **BR-STATUS-06** Known issue: status unchanged; result labelled "Known issue".

## Failure reason (BR-REASON)
- **BR-REASON-01** Reasons for `failed`: Product bug · Needs confirmation · Test data problem · Test case unclear · Blocked.
- **BR-REASON-02** Reasons for `couldnt_complete`: Environment down · QAI or AI service · AI couldn't finish.
- **BR-REASON-03** Every failed/couldnt_complete result has exactly one reason, set by the system; users cannot edit it (they can override the status).
- **BR-REASON-04** Each reason has one recommended action (see 04 · F5) shown in the result detail.
- **BR-REASON-05** Product bug vs Needs confirmation (changed: D28):
  - **Product bug**: the app is clearly broken (error, crash, missing element, wrong data), **or** a linked document confirms the expectation.
  - **Needs confirmation**: the app behaves consistently but differently from the test, and no linked document confirms which is right.
  [DEV-CONFIRM detection]
- **BR-REASON-06** A low-confidence verdict gets a "Low confidence" note and counts as Worth a look [PROPOSAL].

## Runs (BR-RUN)
- **BR-RUN-01** A run has exactly one environment, ≥1 browser, one model, a frozen list of tests (with their versions) and creates a new run number. Re-runs always create a new run.
- **BR-RUN-02** Mode per test: if the test has a valid script and Force AI is off → **Script replay**; otherwise → **AI run** (a test with test data → **Data rows**, BR-DATA). The run dialog shows the mode and the reason for every test before starting ("Valid script from run #9", "No script yet", "Edited after last run (v3), script reset", "Last AI run failed, so no valid script", "Force AI is on"); Force AI for all updates the table at once. Implemented in `src/lib/runPlan.ts` (`planTest`).
- **BR-RUN-03** AI runs always use Chrome (product behaviour, not configurable). Selected other browsers replay the script once one exists. If the AI run fails, the other browsers are `not_run` for that result. [DEV-CONFIRM same-run replay]
- **BR-RUN-04** Parallel: if enabled (project default / advanced), tests run in parallel automatically; otherwise they queue.
- **BR-RUN-05** Cost: shown per result, per run and "so far" during a run. **No cost or time estimates anywhere.**
- **BR-RUN-06** Auto-retry only for system causes (rate limit, timeout, provider error); never for real app failures. [DEV-CONFIRM: today "Retry after failed" retries everything]
- **BR-RUN-07** If a script replay cannot find an element, the system re-runs that test with AI automatically and records a new script; the result is flagged "Script re-recorded". [DEV-CONFIRM]
- **BR-RUN-08** Automatic repair of a script may change locators and waits, **never** expected values or checks.
- **BR-RUN-09** Pre-flight check after Start run: AI key/model valid (block), environment URL reachable (warn), browser launches (block). A block stops the start; warnings offer "Start anyway" (D57). [DEV-CONFIRM feasibility]
- **BR-RUN-10** Progress saved after each test; paused and interrupted runs can resume from the next test ("Resume from test 35"). [DEV-CONFIRM]
- **BR-RUN-11** (Proposed) Auto-pause when the AI provider stays unavailable after retries, or the environment fails N consecutive tests; user resumes. [DEV-CONFIRM: today the run continues and fails tests]
- **BR-RUN-12** Max AI steps per test: default 40, allowed 1–500, warning above 100 ("Higher values increase AI cost per test"). Max actions per step: default 10, allowed 1–50. Parallel workers: default 2, allowed 1–8. (Project default, run Advanced; D38.)
- **BR-RUN-13** Browsers per test (D53): a test replays in the run's browsers that it allows (browser preference; none = all). If none is allowed, the test is Not run in this run with the note "No allowed browser selected (test allows …)"; Start run is disabled when no test can run. AI runs still use Chrome (BR-RUN-03).
- **BR-RUN-14** Skip test (D54): the current test ends at once as Not run with the note "Skipped by user"; the run continues with the next test. There is no Stop test.
- **BR-RUN-15** Stop run (D55): with confirmation; the run becomes Completed with `stoppedAt` ("Stopped at done/total"), cannot be resumed, and the tests not run yet are Not run (re-run them from the results).

## Scripts and versions (BR-SCRIPT, BR-VERSION)
- **BR-SCRIPT-01** A script is only created from a passing AI run.
- **BR-SCRIPT-02** Editing steps, preconditions, expected result, expected keywords, test data fields, or test data row 1 (the recorded row) **resets the script** (next run uses AI). Editing title, description, linked knowledge, test data rows 2+, or moving suites does not. The editor warns before saving. (Refined: D44, see BR-DATA-07.)
- **BR-SCRIPT-03** A script replay must verify the expected result, not only repeat actions. [DEV-CONFIRM — critical]
- **BR-VERSION-01** Saving any change to a test's definition or test data increments its version (v1, v2…). Definition includes linked knowledge. Not a new version: "Use" on a data row, visual settings (exclude, ignore areas), known-issue marks, the New badge, moving suites. The data layer decides version and reset from what changed; callers never set them.
- **BR-VERSION-02** Each result stores the test version it ran. Result detail shows "Ran on vN (current)" or "Ran on vN (old) · now vM".

## Test cases (BR-TEST)
- **BR-TEST-01** Test ID: auto = suite prefix + next number (e.g. CNT-05); editable; unique within the project. Tests without a suite get prefix "T-".
- **BR-TEST-02** Required: steps. Title defaults to the first 40 characters of the first step if empty.
- **BR-TEST-03** `{name}` placeholders in steps define test data fields.
- **BR-TEST-04** "New" badge on tests added from AI explore; cleared when the test is opened.
- **BR-TEST-06** Deleting a test asks for confirmation listing what is affected (knowledge scoped to it, its results) and offers Undo. Its results stay in their runs; each result keeps a snapshot of the test's display ID and title, shown once the test is deleted (while it exists, the current ID and title are shown). (D46)
- **BR-TEST-05** Moving tests to another suite keeps their IDs, except tests from Not in a suite ("T-" IDs), which get the destination prefix + next number (T-01 → CNT-05). Everything that refers to a test (AI explore outcomes, history, results) uses the internal test id, so it shows the current display ID after a move. (D42)

## Test data (BR-DATA)
- **BR-DATA-01** Fields = placeholders in steps; types: text, select, checkbox, date. (File upload: parked.)
- **BR-DATA-02** Row 1 = recorded row (valid values for all fields), cannot be deleted.
- **BR-DATA-03** Each row: values, expected outcome (Accepted / Rejected), optional "page shows" text, optional note, use on/off.
- **BR-DATA-04** Convention shown in UI: negative rows change one field at a time; the field a row varies is highlighted.
- **BR-DATA-05** Rejected rows pass when the flow is stopped after the data is entered (and "page shows" text is visible, if given).
- **BR-DATA-06** Suggest rows: techniques Boundary values, Equivalence classes, Pairwise; uses linked FRS if present, else an optional hint. Regenerating replaces generated rows, keeps manual rows.
- **BR-DATA-08** When a row-1 value changes, ask "Also update <n> rows that used the old value '<value>'?" (default Yes) so rows 2+ keep varying only their intended field; rows varying more than one field get a gentle note. (D47)
- **BR-DATA-09** Saving a test keeps the test data fields in sync with the steps' {placeholders}: a new placeholder adds a text field (empty in every row; the first one creates test data with an empty row 1); a removed placeholder removes its field and values; renaming = remove + add. The editor says so before saving ("Test data: removes {email} and its values in <n> rows"). (D49)
- **BR-DATA-07** Saving test data (D44): add/remove a field or change row 1 (recorded row) → new version + script reset (reset warning shown); add/edit/delete rows 2+ or Suggest rows → new version, no script reset; toggling "Use" → no new version, no reset, saved at once. Other test data edits are a draft saved with "Save as vN+1 · Cancel".

## Visual comparison (BR-VISUAL)
- **BR-VISUAL-01** Project setting, default on: compares screenshots of script replays only.
- **BR-VISUAL-02** Comparison point: end of each step. Compared with the **previous replay of the same test, environment, browser and viewport**. No previous replay → "No previous run to compare".
- **BR-VISUAL-03** A difference is a **flag**, never a failure.
- **BR-VISUAL-04** Per test: Exclude this test; ignore areas. An ignore area is drawn on a step's screenshot (stored as a share of the screenshot); until drawn it shows "Not drawn yet" and leaves nothing out (D45).
- **BR-VISUAL-05** Script reset (BR-SCRIPT-02) restarts visual history for that test.
- **BR-VISUAL-06** Pin a reference: [PARKED, low priority].

## Suites (BR-SUITE)
- **BR-SUITE-01** A suite has a name (unique in the project, case-insensitive) and an ID prefix (1–6 capital letters or digits starting with a letter, unique, not "T", which is for Not in a suite). Created from "Move to suite… › New suite…" or by Import; renamed (name + prefix) from the suite row menu. Changing the prefix keeps existing test IDs; new tests use the new prefix. (D43)
- **BR-SUITE-02** Only an empty suite can be deleted; otherwise: "Move or delete its tests first." (D43)

## Clone (BR-CLONE)
- **BR-CLONE-01** Copies: title, description, preconditions, steps, expected result, expected keywords, start page, browser preference, test data, linked knowledge. (Linked knowledge: assumption, confirm with product owner.)
- **BR-CLONE-02** Does not copy: script, results/history, visual history, overrides, known-issue marks. Copy starts at v1.
- **BR-CLONE-03** Copy is created in the same suite (or Not in a suite) with a new ID (BR-TEST-01) and the **same title**, and sorts by ID like any test (BR-LIST-01). After cloning, the copies are selected, scrolled to and highlighted. `TestCase.clonedFromId` records the original for information only (detail: "Source: Clone of <ID>"). Naming and moving are the user's choice; no suffixes, no dialog. (Changed: D41.)
- **BR-CLONE-04** Works for one test, a selection, or a whole suite (suite checkbox + Clone).

## Import (BR-IMPORT)
- **BR-IMPORT-01** CSV or Excel (first sheet only). A template is downloadable.
- **BR-IMPORT-02** Header matching is lenient: case-insensitive; spaces, hyphens and underscores are equivalent.
- **BR-IMPORT-03** Template columns (only `task_content` required):
  `task_id`, `title`, `description`, `category` (→ suite), `preconditions`, `task_content` (→ steps; numbered lines become steps), `expected_result`, `expected_keywords`, `base_url` (→ start page, optional), `browser_type` (comma list). Unknown columns are ignored and listed. [Legacy columns Copilot Mode, credentials, Skill, extension_path, llm_provider, model_name are NOT in the template: replaced by run dialog, Accounts, linked knowledge, project settings and run model.]
- **BR-IMPORT-04** Completely blank rows are removed.
- **BR-IMPORT-05** Category creates or reuses a suite (name compared case-insensitively); rows without category → Not in a suite. A new suite's ID prefix comes from its tests' IDs (LOG-01 → LOG), made unique and never "T" (D50).
- **BR-IMPORT-06** Rows whose test ID already exists: user chooses once for all: Update (new version; script reset per BR-SCRIPT-02) · Skip · Import as new (new IDs).
- **BR-IMPORT-07** No column mapping UI.
- **BR-IMPORT-08** Rows without steps (empty task_content) are skipped; a test ID used more than once in the file gives later rows new IDs. Both are listed in the file check. New tests keep their task_id when free, else get the suite prefix + next number (D50).
- **BR-IMPORT-09** Update (D50): a column missing from the file keeps the current value; a column present with an empty cell clears it (an empty category cell → Not in a suite; an empty title → the first step). The file check shows "<n> fields will be cleared".

## AI explore (BR-EXPLORE)
- **BR-EXPLORE-01** Chats belong to one project; the chat list shows only this project's chats.
- **BR-EXPLORE-02** One active AI turn per chat. Leaving the workspace does not stop it; the chat shows a "Running" badge.
- **BR-EXPLORE-03** Proposed tests carry a validation badge: Validated · Likely bug · Needs attention. Needs attention is unticked by default.
- **BR-EXPLORE-04** Duplicates (similar to an existing test) are resolved inline per proposed test: Keep both · Replace existing · Skip.
- **BR-EXPLORE-05** "Add N tests to Suites" is the only approval, and it approves **each test once**, not the whole card (D30). Decided proposals record an outcome (added / replaced / skipped); unticked proposals stay **pending** (no outcome) and can be added later with "Add N more tests to Suites". Added tests go to **Not in a suite**, marked New. A status only comes from a run, so Likely bug tests start **Not run** with a **"Likely bug" badge** (same pattern as New) in Suites and the test detail: tooltip "Found during AI explore, not yet confirmed by a run" and a link "View in AI explore" that opens the chat at its tests-ready message. The badge disappears after the test's first real run. It never counts as failed (pass rate, Overview, suite counts). Stored as `TestCase.aiExploreFinding` (07). (Changed: D25.)
- **BR-EXPLORE-06** Validated tests keep their generated script, so their first run can replay. [DEV-CONFIRM script format]

## AI providers (BR-PROVIDER)
- **BR-PROVIDER-01** Secrets (API keys, access keys, TypeSafe key) are write-only: the UI never reads them back, and a partial secret is never saved (both AWS access keys together or neither). Editing with empty secret fields keeps the saved ones. (D32)
- **BR-PROVIDER-02** The last AI provider cannot be removed. (D33)
- **BR-PROVIDER-03** Removing a provider: projects whose default model only that provider offers switch to the default model of the first remaining provider; the confirmation lists them and the user is told afterwards. (D33)

## Projects (BR-PROJECT)
- **BR-PROJECT-01** Project names are unique on this computer, compared case-insensitively and ignoring surrounding spaces. Create and rename block a taken name inline. On import, a different project whose name is taken is added as "<name> (2)". (D35)
- **BR-PROJECT-02** Importing a project that is already on this computer (same project): Replace it (runs and changes made here since the export are lost) · Import as a copy ("<name> (copy)", "(copy 2)"…, new IDs) · Cancel. (D34)

## Results actions (BR-ACTION)
- **BR-ACTION-01** Override: single result only; new status Passed/Failed; reason (required) and proof file (required); shows "Overridden by <user> · <date>" and the AI verdict.
- **BR-ACTION-02** Known issue: single or bulk; optional ticket reference text.
- **BR-ACTION-03** Bug report: generated per result (title, environment, browser, run, steps to reproduce in plain language, expected, actual, screenshots), editable, Copy; bulk = one report per result.
- **BR-ACTION-04** Re-run / Re-run with model: open the run dialog prefilled with the selection (and the chosen model).

## Lists and filters (BR-LIST)
- **BR-LIST-01** Suites: tree by suite (alphabetical by suite name), "Not in a suite" last; within a suite by test ID. Filters: search (ID/title), latest status.
- **BR-LIST-02** Suites selection: suite checkbox selects its visible tests; when ≥1 test selected, show Move to suite… · Clone · Run N selected.
- **BR-LIST-03** Run results: flat list sorted Failed → Couldn't complete → Passed → Not run, then by ID. Filters: status (the summary buttons), reason (options depend on status; hidden for Passed), mode (AI / Script / Data rows), search, Worth a look [PROPOSAL].
- **BR-LIST-04** Run results bulk bar appears only when ≥1 selected; "Select all shown" respects filters.
- **BR-LIST-05** All list/detail screens have a draggable split (min list 280 px, min detail 420 px; keyboard ←/→ on the handle).

## Worth a look (BR-WORTH) [PROPOSAL]
Flag when any: passed using ≥ 90% of max AI steps; agent and judge disagree; low confidence verdict; Needs confirmation; Script re-recorded. Shown as a dot in lists and a banner with the reason in detail.

## Environments (BR-ENV)
- **BR-ENV-01** Environment differences are handled by **separate test cases** (clone), not variants.
- **BR-ENV-02** App URL resolves from the run's environment; an app with no URL for that environment → affected tests are Not run with note "No URL for <environment>".
- **BR-ENV-03** Accounts are resolved by role + app + environment, so that combination is unique per project.
- **BR-ENV-04** A run stores a snapshot of its environment when it starts: the environment name and every app's URL in it. Run history shows the snapshot even if the environment is later renamed or deleted, or a URL changes. (D36)
