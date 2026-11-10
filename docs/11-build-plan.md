# 11 · Build plan

Build in slices. After each slice: run the app, check the acceptance list, stop and report to the user. Do not start the next slice without approval.

## Slice 0 · Foundation
Vite + React + TS strict + Router + Tailwind tokens (08) + lucide-react + Vitest. Folder structure from CLAUDE.md. `types.ts` exactly as 07. Mock store seeded from the CSV fixture and the sample data in 07. `api.ts` stubs with latency.
**Accept**: `npm run dev` shows a blank shell; `npm run test` runs; types compile; seed produces 83 tests in 12 suites + 2 Not-in-a-suite tests; Run #12 counts compute to 72/8/3.

## Slice 1 · App shells and navigation
Projects shell, project shell (sidebar, collapse toggle on edge, top bar breadcrumb + AI explore), routes from 03, empty placeholder screens.
**Accept**: brand links to Projects in both states; collapsed state remembered; no project switcher; theme not in sidebar; all routes reachable; keyboard focus visible.

## Slice 2 · Global: Welcome, Projects, New project, Global settings
**Accept**: first launch → Welcome; Jev section collapsed and fields only when ticked; no test connection; environment columns rename/add/remove in New project; Global settings back → Projects.

## Slice 3 · Knowledge + Project settings
**Accept**: editable environment grid (names, add/remove with confirmation, URLs); accounts, documents, skills tables with scope; visual comparison toggle; run defaults.

## Slice 4 · Suites (list + detail + tabs)
**Accept**: tree with suite checkboxes; Not in a suite last; filters (search, latest status) with auto-expand; selection actions Move / Clone / Run N; detail chips, latest strip with Open result; tabs Definition / Test data / Visual check / History all working; draggable split; clone inserts copies after originals per BR-CLONE.

## Slice 5 · Edit test + Import
**Accept**: reset warning only for reset fields (BR-SCRIPT-02); version increments; "Save and re-run" only when opened from a result; import check simulated with seed CSV; duplicate choice applied; categories → suites.

## Slice 6 · Run dialog + Live run + Paused + Runs list
**Accept**: per-test mode + reason from `planRun` (BR-RUN-02); Force AI updates the table; no estimates; visual comparison line; simulated live run updates queue, narration, cost so far; Pause/Resume/Stop; interrupted run shows banner and resumes; Runs list durations and states.

## Slice 7 · Run results + detail + dialogs
**Accept**: summary buttons filter; reason options follow status; flat sort; cost per row; bulk bar only on selection; select all shown; result detail failure card, 3-level steps with failed step expanded, technical toggle; Override (requires reason + proof), Bug report copy, Known issue, Visual compare (previous vs this, Looks fine / Ignore area / Mark as bug).

## Slice 8 · Overview + AI explore
**Accept** (D65):
- Overview: resume banner; cards computed from library tests only.
- Data layer: `TestCase.location` / `aiValidationStatus` / `aiOrigin` replace `Proposal` and `aiExploreFinding`; **`listLibraryTests`** is the one function for library tests and every Suites list, filter, run picker, run scope ("All tests"), count and Overview card uses it; **automated checks prove tray and discarded tests never appear in Suites, runs or counts**.
- AI explore: chat list with Running badge; **Ready for Suites (n)** always visible under the chat history; chat cases card shows each case's status and where it is (In Ready for Suites · link to the test once moved · Replaced <ID> · Discarded); no approval in the chat.
- Ready for Suites modal (70–80% of the screen): cases from all chats; status filter (Not checked · Checked · Needs fixing); missing steps flagged (warning icon + text) and not movable; possible duplicates resolved inline (Keep both · Replace existing · Discard) before moving; inline edit of small fields; Open in chat; no nested modals; Esc / outside click asks inline when cases are selected; selections persist after closing; empty state explains how cases arrive.
- Bulk **Move to Suites** → Suites › Not in a suite, T- IDs, New badges; Replace existing updates the existing test; toast with Undo.
- **Discard** for every AI case (row and bulk), record kept, toast with Undo; **Show discarded** filter with **Restore to tray**.
- Moved Needs fixing tests show the "Needs fixing" badge until their first run (never counted as failed); Checked cases keep their script (first run replays).

## Slice 9 · Polish
Empty/loading/error states for every screen; accessibility pass; consistency with glossary (no legacy terms).

## Prompt template for each slice (paste into Claude Code)
```
Read CLAUDE.md, docs/00-README.md, docs/02-glossary.md, and the docs listed for Slice <N> in docs/11-build-plan.md
(plus the screen files and rules they reference). Build Slice <N> only. Follow the rules in CLAUDE.md.
When done: list what you built, how each acceptance item is met, any spec gaps you found (do not fill them yourself), then stop.
```
