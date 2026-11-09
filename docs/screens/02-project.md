# Screens · Project overview and settings

## 1.4 Project overview
**Purpose** Daily starting point: what needs attention.
**Content (top to bottom)**
1. Header: project name, "<n> apps · <environment names>"; buttons New test, Import, Run… (primary).
2. **Interrupted run banner** (only if a run is Interrupted/Paused): "Run #13 was interrupted at test 34 of 83 · All tests · UAT" → Resume (→ 5.3) · Discard.
3. Three cards: **New from AI explore** ("<n> tests not in a suite" → Organise in Suites; hidden if 0) · **Last completed run** (number, date, passed/failed/couldn't complete chips) · **Needs attention** (failed + couldn't complete count; [PROPOSAL] worth-a-look count) → Open run.
4. Suites table: Suite · Tests · Latest status chips (passed/failed/couldn't complete/not run) · Last run · Run button.
5. Recent runs table: Run · Scope · Environment · State · Cost.
**Not included** Graphs, timeline, trend charts [PARKED as Overview metrics].
**States** New project empty state with four entry actions: Import tests · Write a test · Explore with AI · Set up Knowledge.

## 2.2 Project settings
**Saving** (as D32) Toggles and choices save at once with "Saved" (visual comparison, headless, parallel, default model, extension folder). Typed values use Save / Cancel (project name, run default numbers).
**Sections**
1. General: Project name (unique, BR-PROJECT-01, shown inline).
2. AI: Default model (overridable per run). A model no provider offers any more stays visible, marked "not offered by your AI providers".
3. Browser: Browser extension folder (optional; needs chrome/firefox/safari sub-folders). A folder missing one of them is refused with the missing names. Remove clears it.
4. **Visual comparison**: checkbox "Compare screenshots with the previous run for all tests" (default on). Help: "Script replays only. Individual tests can be excluded in their Visual check tab. Changes are flagged, never failed."
5. Run defaults (advanced): Headless · Parallel + workers (default 2, **1–8**; disabled while Parallel is off) · Max AI steps per test (default 40, **1–500**; above 100 the warning "Higher values increase AI cost per test", not blocking) · Max actions per step (default 10, **1–50**). Pre-fill the run dialog's Advanced section (BR-RUN-12, D38).
6. Data: Export project (includes suites, tests, scripts, knowledge, runs, AI chats) · Delete project (typed-name confirmation, then Projects).
   **Export dialog** (D37): checkbox "Include account passwords" (default on). When on, warning: "The file will contain passwords in readable form. Share it only with trusted colleagues." When off, accounts are exported without passwords and the recipient adds them in Knowledge. Same dialog from Projects › Export.
