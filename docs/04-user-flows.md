# 04 · User flows

Screen IDs refer to `03-navigation.md`. Each flow lists entry → steps → exit.

## F1 · First launch
1. App opens → no AI provider configured → **1.1 Welcome**.
2. Choose provider, enter key (provider-specific fields), choose default model. Optionally expand "Save AI cost with Browser Use + Jev" and fill it.
3. Continue → **1.2 Projects** (empty state: "Create your first project").

## F2 · Create a project
1. 1.2 → New project → **1.3**: name, apps × environments (rename/add environments), default model → Create.
2. → **1.4 Overview** (empty states point to Knowledge, Import, New test, AI explore).
3. Optional: **2.1 Knowledge** → accounts per role and environment, documents, skills.

## F3 · Get tests into the library (three ways)
- **Import**: 3.1 → Import → **3.3**: download template (if needed) → choose CSV/XLSX → file check (recognised / ignored columns, rows read) → duplicates choice → Import → suites created from category; rows without category in "Not in a suite".
- **Write**: 3.1 → New test → **3.2** → Save → test appears in its suite.
- **AI explore**: top bar AI explore → **3.4** → chat (explore an app or plan from documents) → "tests ready" card → tick tests (resolve duplicates inline) → **Add N tests to Suites** → 3.1 with "Not in a suite" open, new tests marked New → select → **Move to suite…**.

## F4 · Run (main loop)
1. Select tests or suites in **3.1** (or a single test → Run) → **5.1 Run dialog**.
2. Choose environment, browsers, model; review "How each test will run" (AI run / Script replay + reason); optional Force AI; Advanced hidden.
3. Start run → pre-flight check [DEV-CONFIRM] → **5.2 Live run** (narration; Pause / Stop; Skip test).
4. User may leave; the run continues. Run ends → **6.1 Run results**.

## F5 · Triage and the failure loop
Entry: 6.1 (from the finished run, Runs list, Overview, or a test's latest strip).
1. Summary buttons show counts; click **Failed** → list shows failures first.
2. Select a result → read the failure summary (expected vs found) and the failed step (auto-expanded) with screenshot.
3. Next action by reason:
| Reason | Action | Then |
|---|---|---|
| Product bug | Copy bug report (6.4) → paste into ClickUp | After developer fix: Re-run that test (5.1) |
| Needs confirmation | Confirm with BA/PM | Bug report, or Edit test |
| Test data problem | Fix account/data in Knowledge (2.1) | Re-run |
| Test case unclear | Edit test (3.2, "Save and re-run") | Run dialog prefilled |
| Blocked | Fix the root failure first | Re-run the group |
| Environment down | Check the site | Re-run |
| QAI or AI service | Fix key/credits in Global settings | Resume / re-run |
| AI couldn't finish | Filter this reason → Select all shown → **Re-run with model…** | New run with another model |
| System got it wrong | **Override** (6.3) with reason + proof | Done |
| Known, not yet fixed | **Known issue** (single or bulk) | Done |
4. Every re-run goes through the run dialog and creates a new run.

## F6 · Interrupted or paused run
1. App closed or crashed mid-run → next launch: **1.4 Overview** banner "Run #N interrupted at X of Y" → Resume / Discard. Runs list shows "Interrupted".
2. Resume → **5.3** → "Resume from test X+1" → **5.2**. [DEV-CONFIRM: progress saved per test]
3. (Proposed) provider down or site not responding repeatedly → run auto-pauses with reason → Resume / Stop. [DEV-CONFIRM: today the engine continues and fails the remaining tests]

## F7 · Visual comparison review
1. Project setting on (2.2). Script replays capture a screenshot at the end of each step.
2. 6.1 result shows a visual flag (never a failure) → open **6.2**: previous run vs this run, changed areas outlined.
3. Actions: Looks fine · Ignore an area… · Mark as bug (→ 6.4).
4. Noisy test → 3.1 › Visual check tab → Exclude this test, or manage ignore areas.

## F8 · Test data (data-driven)
1. 3.2: write steps with {field} placeholders (e.g. "enter {email} in the email field").
2. 3.1 › Test data tab: fields appear as columns; row 1 = valid values; add rows (one field varied per negative row) or **Suggest rows** (boundary / equivalence / pairwise; uses linked FRS if present).
3. Run → row 1 by AI if no script, other rows replay → result shows "3/5 rows" breakdown.

## F9 · Environments (separate test cases)
1. A test behaves differently on Prod → select it (or tick a whole suite) → **Clone** → copies appear next to the originals.
2. User renames/moves copies (e.g. into a "09 Contact Us · Prod" suite they create).
3. Run the Prod copies with environment = Prod. Copies start fresh (first run uses AI).

## F10 · Handover
Project settings (2.2) → Export project → file sent outside QAI → recipient: Projects (1.2) → Import project → continues with the same history.

## F11 · Change after a release
1. Edit tests whose behaviour changed (3.2) → warning: steps changed → script resets, next run uses AI.
2. User chooses what to re-run (manual scope) → 5.1 shows which tests will use AI → run.
