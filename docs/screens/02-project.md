# Screens · Project overview and settings

## 1.4 Project overview
**Purpose** Daily starting point: what needs attention.
**Content (top to bottom)**
1. Header: project name, "<n> apps · <environment names>"; buttons New test, Import, Run… (primary).
2. **Interrupted run banner** (only if a run is Interrupted/Paused): "Run #13 was interrupted at test 34 of 83 · All suites · UAT" → Resume (→ 5.3) · Discard.
3. Three cards: **New from AI explore** ("<n> tests not in a suite" → Organise in Suites; hidden if 0) · **Last completed run** (number, date, passed/failed/couldn't complete chips) · **Needs attention** (failed + couldn't complete count; [PROPOSAL] worth-a-look count) → Open run.
4. Suites table: Suite · Tests · Latest status chips (passed/failed/couldn't complete/not run) · Last run · Run button.
5. Recent runs table: Run · Scope · Environment · State · Cost.
**Not included** Graphs, timeline, trend charts [PARKED as Overview metrics].
**States** New project empty state with four entry actions: Import tests · Write a test · Explore with AI · Set up Knowledge.

## 2.2 Project settings
**Sections**
1. General: Project name.
2. AI: Default model (overridable per run).
3. Browser: Browser extension folder (optional; needs chrome/firefox/safari sub-folders).
4. **Visual comparison**: checkbox "Compare screenshots with the previous run for all tests" (default on). Help: "Script replays only. Individual tests can be excluded in their Visual check tab. Changes are flagged, never failed."
5. Run defaults (advanced): Headless · Parallel + workers (default 2) · Max AI steps per test (default 40) · Max actions per step (default 10). Pre-fill the run dialog's Advanced section.
6. Data: Export project (includes suites, tests, scripts, knowledge, runs, AI chats) · Delete project (confirm).
