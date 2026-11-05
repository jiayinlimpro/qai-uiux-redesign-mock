# 05 · Business rules

Implement rules as pure functions in `src/lib/` with the rule ID in a comment, and unit-test them.
Rules marked [DEV-CONFIRM] are built in the UI as specified, but the real engine behaviour must be confirmed (see 10).

## Status (BR-STATUS)
- **BR-STATUS-01** Statuses: `passed`, `failed` (the app did not meet the expected result), `couldnt_complete` (no verdict: system, AI or environment problem), `not_run` (deselected, stopped, interrupted, or never executed).
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
- **BR-REASON-05** Product bug vs Needs confirmation: Product bug only when a linked document (or an explicit expected result) supports the expectation; otherwise Needs confirmation. [DEV-CONFIRM detection]
- **BR-REASON-06** A low-confidence verdict gets a "Low confidence" note and counts as Worth a look [PROPOSAL].

## Runs (BR-RUN)
- **BR-RUN-01** A run has exactly one environment, ≥1 browser, one model, a frozen list of tests (with their versions) and creates a new run number. Re-runs always create a new run.
- **BR-RUN-02** Mode per test: if the test has a valid script and Force AI is off → **Script replay**; otherwise → **AI run**. The run dialog shows the mode and the reason for every test before starting.
- **BR-RUN-03** AI runs always use Chrome (product behaviour, not configurable). Selected other browsers replay the script once one exists. If the AI run fails, the other browsers are `not_run` for that result. [DEV-CONFIRM same-run replay]
- **BR-RUN-04** Parallel: if enabled (project default / advanced), tests run in parallel automatically; otherwise they queue.
- **BR-RUN-05** Cost: shown per result, per run and "so far" during a run. **No cost or time estimates anywhere.**
- **BR-RUN-06** Auto-retry only for system causes (rate limit, timeout, provider error); never for real app failures. [DEV-CONFIRM: today "Retry after failed" retries everything]
- **BR-RUN-07** If a script replay cannot find an element, the system re-runs that test with AI automatically and records a new script; the result is flagged "Script re-recorded". [DEV-CONFIRM]
- **BR-RUN-08** Automatic repair of a script may change locators and waits, **never** expected values or checks.
- **BR-RUN-09** Pre-flight check after Start run: AI key/model valid (block), environment URL reachable (warn), browser launches (block). [DEV-CONFIRM feasibility]
- **BR-RUN-10** Progress saved after each test; interrupted runs can resume from the next test. [DEV-CONFIRM]
- **BR-RUN-11** (Proposed) Auto-pause when the AI provider stays unavailable after retries, or the environment fails N consecutive tests; user resumes. [DEV-CONFIRM: today the run continues and fails tests]
- **BR-RUN-12** Max AI steps per test: default 40 (project default, run Advanced). Max actions per step default 10.

## Scripts and versions (BR-SCRIPT, BR-VERSION)
- **BR-SCRIPT-01** A script is only created from a passing AI run.
- **BR-SCRIPT-02** Editing steps, preconditions, expected result, expected keywords or test data **resets the script** (next run uses AI). Editing title, description or moving suites does not. The editor warns before saving.
- **BR-SCRIPT-03** A script replay must verify the expected result, not only repeat actions. [DEV-CONFIRM — critical]
- **BR-VERSION-01** Saving any change to a test's definition or test data increments its version (v1, v2…).
- **BR-VERSION-02** Each result stores the test version it ran. Result detail shows "Ran on vN (current)" or "Ran on vN (old) · now vM".

## Test cases (BR-TEST)
- **BR-TEST-01** Test ID: auto = suite prefix + next number (e.g. CNT-05); editable; unique within the project. Tests without a suite get prefix "T-".
- **BR-TEST-02** Required: steps. Title defaults to the first 40 characters of the first step if empty.
- **BR-TEST-03** `{name}` placeholders in steps define test data fields.
- **BR-TEST-04** "New" badge on tests added from AI explore; cleared when the test is opened.

## Test data (BR-DATA)
- **BR-DATA-01** Fields = placeholders in steps; types: text, select, checkbox, date. (File upload: parked.)
- **BR-DATA-02** Row 1 = recorded row (valid values for all fields), cannot be deleted.
- **BR-DATA-03** Each row: values, expected outcome (Accepted / Rejected), optional "page shows" text, optional note, use on/off.
- **BR-DATA-04** Convention shown in UI: negative rows change one field at a time; the field a row varies is highlighted.
- **BR-DATA-05** Rejected rows pass when the flow is stopped after the data is entered (and "page shows" text is visible, if given).
- **BR-DATA-06** Suggest rows: techniques Boundary values, Equivalence classes, Pairwise; uses linked FRS if present, else an optional hint. Regenerating replaces generated rows, keeps manual rows.

## Visual comparison (BR-VISUAL)
- **BR-VISUAL-01** Project setting, default on: compares screenshots of script replays only.
- **BR-VISUAL-02** Comparison point: end of each step. Compared with the **previous replay of the same test, environment, browser and viewport**. No previous replay → "No previous run to compare".
- **BR-VISUAL-03** A difference is a **flag**, never a failure.
- **BR-VISUAL-04** Per test: Exclude this test; ignore areas.
- **BR-VISUAL-05** Script reset (BR-SCRIPT-02) restarts visual history for that test.
- **BR-VISUAL-06** Pin a reference: [PARKED, low priority].

## Clone (BR-CLONE)
- **BR-CLONE-01** Copies: title, description, preconditions, steps, expected result, expected keywords, start page, browser preference, test data, linked knowledge. (Linked knowledge: assumption, confirm with product owner.)
- **BR-CLONE-02** Does not copy: script, results/history, visual history, overrides, known-issue marks. Copy starts at v1.
- **BR-CLONE-03** Copy is placed directly after its original in the same suite (or Not in a suite), with a new ID (BR-TEST-01) and the **same title**. Naming and moving are the user's choice; no suffixes, no dialog.
- **BR-CLONE-04** Works for one test, a selection, or a whole suite (suite checkbox + Clone).

## Import (BR-IMPORT)
- **BR-IMPORT-01** CSV or Excel (first sheet only). A template is downloadable.
- **BR-IMPORT-02** Header matching is lenient: case-insensitive; spaces, hyphens and underscores are equivalent.
- **BR-IMPORT-03** Template columns (only `task_content` required):
  `task_id`, `title`, `description`, `category` (→ suite), `preconditions`, `task_content` (→ steps; numbered lines become steps), `expected_result`, `expected_keywords`, `base_url` (→ start page, optional), `browser_type` (comma list). Unknown columns are ignored and listed. [Legacy columns Copilot Mode, credentials, Skill, extension_path, llm_provider, model_name are NOT in the template: replaced by run dialog, Accounts, linked knowledge, project settings and run model.]
- **BR-IMPORT-04** Completely blank rows are removed.
- **BR-IMPORT-05** Category creates or reuses a suite; rows without category → Not in a suite.
- **BR-IMPORT-06** Rows whose test ID already exists: user chooses once for all: Update (new version; script reset per BR-SCRIPT-02) · Skip · Import as new (new IDs).
- **BR-IMPORT-07** No column mapping UI.

## AI explore (BR-EXPLORE)
- **BR-EXPLORE-01** Chats belong to one project; the chat list shows only this project's chats.
- **BR-EXPLORE-02** One active AI turn per chat. Leaving the workspace does not stop it; the chat shows a "Running" badge.
- **BR-EXPLORE-03** Proposed tests carry a validation badge: Validated · Likely bug · Needs attention. Needs attention is unticked by default.
- **BR-EXPLORE-04** Duplicates (similar to an existing test) are resolved inline per proposed test: Keep both · Replace existing · Skip.
- **BR-EXPLORE-05** "Add N tests to Suites" is the only approval. Added tests go to **Not in a suite**, marked New; Likely bug tests start with status Failed / Product bug (unconfirmed).
- **BR-EXPLORE-06** Validated tests keep their generated script, so their first run can replay. [DEV-CONFIRM script format]

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
- **BR-ENV-03** Accounts are resolved by role + app + environment.
