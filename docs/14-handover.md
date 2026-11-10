# 14 · Handover to engineering

This prototype is the front end of the redesigned QAI, built slice by slice from the specs in this folder. Every
screen, rule and state is real code you can keep. Everything behind `src/data/api.ts` is a mock you replace.

Read with: `07-data-model.md` (types and data layer), `05-business-rules.md` (rules), `10-open-questions.md`,
`12-decision-log.md`, `15-decisions-since-plan.md` (what changed since the original plan), and the screenshots in
`reference/prototype-screens/`.

## 1. What is real and what is mocked

| Area | Where | Status |
|---|---|---|
| Screens, app shells, routing, dialogs | `src/app`, `src/screens`, `src/components` | **Real.** Keep. Hash routes defined only in `src/app/routes.ts` (D26). |
| UI primitives and tokens | `src/components/ui`, `tailwind.config.ts`, `src/index.css` | **Real**, interim visual design (08). Restyle there only. |
| Business rules | `src/lib/*.ts` (+ `*.test.ts`) | **Real.** Pure, unit-tested, tagged with rule IDs (`// BR-…`). The data layer and screens call them. |
| Domain types | `src/data/types.ts` | **Real**, exactly `07-data-model.md`. The engine maps its output into these. |
| Data layer signatures | `src/data/api.ts` (exports, parameter/return types, error classes) | **Real contract.** Keep the signatures; see §3 for the ones still marked "shape to confirm". |
| Data layer bodies | `src/data/api.ts` (function bodies) | **Mock.** They read and write the in-memory store. Replace with real calls (§2). |
| Store, seed, sample data | `src/data/mock/store.ts`, `seed.ts`, `fixtures/qcfixer-tests-seed.csv` | **Mock.** One consistent fake world (07 § Sample data), persisted to `localStorage` (`qai.mockDb`). |
| Run engine | `src/data/mock/runEngine.ts` | **Mock.** Timer-driven runs (500 ms ticks) with simulated outcomes and narration. |
| Result evidence | `src/data/mock/evidence.ts` | **Mock.** Fake actions, locators, URLs, AI thoughts, tokens and logs (D58). |
| AI features | `mock/suggestRows.ts`, simulated chat turn in `api.ts`, `MOCK_MODELS` in `api.ts` | **Mock.** No AI provider is called anywhere. |
| Import file reading | `mock/importFile.ts`; parsing in `lib/csv.ts` + `lib/importRules.ts` | CSV parsing and import rules are **real**; Excel is **simulated** with the seed CSV (D48). |
| Current user | `CURRENT_USER` in `mock/seed.ts` ("Jia Yin") | **Mock.** Used for "who" on overrides, Looks fine, known issues and tray moves (rule 10). |

## 2. Replacing `src/data/api.ts` with real calls

1. **Keep every exported signature and error class.** Screens only import from `api.ts` (CLAUDE.md rule 1) and rely on:
   `NotFoundError`, `DuplicateProjectNameError`, `ProjectExistsError`, `InvalidFileError`, `UnsupportedImportFileError`,
   `LastProviderError`, `DuplicateAccountError`, `InvalidSuiteError` (`errors.name` / `errors.idPrefix`),
   `SuiteNotEmptyError`, `DuplicateTestIdError`, `AiTurnRunningError`. Throw these for the same situations; screens show
   their messages and choose "not found" vs "Retry" from the class (03 § Not found).
2. **The data layer owns these decisions** (callers never set them), so the real backend must make them too:
   - Test version and script reset from what changed: `saveTest` uses `changeEffect` in `lib/suiteRules.ts`
     (BR-VERSION-01, BR-SCRIPT-02, BR-DATA-07).
   - Library only: everything that lists, counts or runs tests uses `location: 'suites'` (`listLibraryTests`,
     BR-EXPLORE-07). Tray and discarded AI cases never reach Suites, runs or counts.
   - Run number, frozen test list and environment snapshot on `startRun` (BR-RUN-01, BR-ENV-04).
   - Who and when on human decisions: `Result.overrides[]`, `ResultStep.visual.dismissed`, `TestCase.knownIssue.by`,
     `TestCase.locationChange` (CLAUDE.md rule 10). Replace `CURRENT_USER` with the real user.
   - Results are frozen records: write the optional evidence fields when the result is created; leave them empty if the
     engine doesn't provide them, and the UI shows "Not recorded" (D58).
3. **Live runs**: `subscribeRun(runId, cb)` must deliver `progress` (the `Run`), `narration` and `result` events
   (`EngineEvent` in `runEngine.ts`). The Runs list and Live run merge them into what they loaded.
4. **Remove the prototype-only exports** with the mock: `loadSampleData`, `sampleImportFileForPrototype`,
   `setRunSpeedForTests`, `setAiTurnDelayForTests` (and the "Load sample data" button, Global settings › Advanced).
5. **Delete `src/data/mock/`** once nothing imports it. `api*.test.ts` and `seed.test.ts` test the mock; keep the
   `api.slice*.test.ts` files as a behaviour spec and point them at a test backend, or rewrite them against it.
   `src/lib/*.test.ts` stay as they are.
6. **Electron**: the UI has no Node APIs and no server (downloads use `src/app/download.ts`, copying uses
   `src/app/clipboard.ts`); keep it that way, or route file access through the data layer.

## 3. Data layer functions

"Stable" = shape as in 07, built and used by the screens. "**Shape to confirm**" = built and used, but its parameters or
return value were decided by the prototype and need the backend's agreement.

| Function | Returns | Status | Notes |
|---|---|---|---|
| **Global settings** | | | |
| `getGlobalSettings()` | `GlobalSettings` | Stable | Loaded once at start-up. Secrets never returned. |
| `saveGlobalSettings(settings, { typeSafeKey? })` | `GlobalSettings` | **Shape to confirm** | Secrets write-only (BR-PROVIDER-01). |
| `saveProvider(input, secrets)` | `AiProvider` | **Shape to confirm** | Add or edit; empty secrets keep the saved ones; no partial AWS keys. |
| `removeProvider(id)` | `{ switched: ModelSwitch[] }` | **Shape to confirm** | Never the last one; projects switch model (BR-PROVIDER-02/03). |
| `listModels(kind)` | `string[]` | **Shape to confirm** | Mock: fixed list per provider. |
| `backUpEverything()` / `restoreFromBackup(file)` | `Blob` / `void` | **Shape to confirm** | 2.3 › Data. |
| `resetSettings()` / `factoryReset()` | `GlobalSettings` / `void` | **Shape to confirm** | 2.3 › Data. |
| **Projects** | | | |
| `listProjects()` / `getProject(id)` | `Project[]` / `Project` | Stable | |
| `createProject(input)` / `updateProject(project)` / `deleteProject(id)` | `Project` / `Project` / `void` | Stable | Unique names (BR-PROJECT-01); removing an environment or app removes its accounts. |
| `exportProject(id, { includePasswords })` | `Blob` | Stable | Passwords readable unless excluded (D37, open question 21). |
| `importProject(file, onExisting?)` | `Project` | Stable | `ProjectExistsError` without a choice (BR-PROJECT-02). |
| `loadSampleData()` | `void` | Prototype only | Remove with the mock. |
| **Knowledge** | | | |
| `listAccounts` / `saveAccount(account, password?)` / `deleteAccount` | | `saveAccount`: **shape to confirm** | Password write-only; role + app + environment unique (BR-ENV-03). |
| `revealAccountPassword(accountId)` | `string` | **Shape to confirm** | Only on an explicit "Show password" click (D40). |
| `listKnowledge` / `saveKnowledge(item, file?)` / `deleteKnowledge` | | `saveKnowledge`: **shape to confirm** | Mock keeps metadata only; a new file sets `uploadedAt`. |
| **Suites and tests** | | | |
| `listSuites` / `createSuite` / `renameSuite` / `deleteSuite` | | `createSuite`: **shape to confirm** | BR-SUITE-01/02 (D43). |
| `listLibraryTests(projectId, { search?, latestStatus? })` | `TestCase[]` | Stable | **The only way to list tests** (BR-EXPLORE-07). |
| `getTest(id)` | `TestCase` | Stable | Any location (library, tray, discarded). |
| `saveTest(test)` | `TestCase` | Stable | Sets version and script from what changed. |
| `createTest(input)` | `TestCase` | **Shape to confirm** | 3.2 New test (D52). |
| `cloneTests(ids)` / `moveTests(ids, suiteId)` | `TestCase[]` | Stable | BR-CLONE (D41), BR-TEST-05 (D42). |
| `deleteTests(ids)` / `restoreTests(tests)` | `TestCase[]` | `restoreTests`: **shape to confirm** | Undo (BR-TEST-06, D46). |
| `listLatestResults(projectId)` | `Record<testId, Result>` | **Shape to confirm** | Highest run number per test. |
| `getLatestResult(testId)` / `getTestHistory(testId)` | `Result \| null` / `Result[]` | Stable | History newest first. |
| `suggestTestDataRows(testId, techniques, hint?)` | `{ rows, basedOn }` | **Shape to confirm** | Simulated AI (BR-DATA-06). |
| **Import** | | | |
| `importCheck(projectId, file)` | `ImportCheck` | **Shape to confirm** | Columns, duplicates, previews per choice (D50, D52). |
| `importCommit(projectId, file, choice)` | `ImportResult` | **Shape to confirm** | BR-IMPORT-05/06/09. |
| `importTemplate()` | `Blob` (CSV) | Stable | BR-IMPORT-01. |
| `sampleImportFileForPrototype()` | `File` | Prototype only | |
| **Runs** | | | |
| `planRun(testIds, { forceAi, browsers })` | `PlannedTest[]` | **Shape to confirm** | Mode, reason, browsers per test (BR-RUN-02/13). |
| `runPreflight(projectId, environmentId, model)` | `PreflightCheck[]` | **Shape to confirm** | Pass / warn / block (BR-RUN-09, D57). Mock decides from settings and URLs. |
| `startRun(options)` | `Run` | Stable | Library tests only. |
| `pauseRun` / `resumeRun` / `stopRun` / `skipTest` | `Run` | Stable | BR-RUN-10/14/15. |
| `subscribeRun(runId, cb)` | unsubscribe function | Stable | Live events (§2.3). |
| `listRuns` / `getRun` | `Run[]` / `Run` | Stable | Newest first. |
| `listResults(runId, filters?)` | `Result[]` | Stable | BR-LIST-03 filters; the screen adds Not run rows for tests without a result. |
| `getResult(id)` | `Result` | Stable | |
| `setRunSpeedForTests(ms)` | | Test only | |
| **Results actions** | | | |
| `overrideResult(resultId, input)` | `Result` | Stable | Appends to `overrides[]`; newest applies (D62). |
| `markKnownIssue(testIds, input)` | `TestCase[]` | Stable | Stores who and when. |
| `buildBugReport(resultId, { visualStepIndex? })` | `BugReport` | **Shape to confirm** | Editable fields; `formatBugReport` in `lib/resultRules.ts` makes the text (D60). |
| `dismissVisualFlag(resultId, stepIndex, dismissed)` | `Result` | **Shape to confirm** | Looks fine / Undo (D59). |
| **AI explore and Ready for Suites** | | | |
| `listChats(projectId)` / `getChat(id)` | `Chat[]` / `Chat` | Stable | Newest first. |
| `createChat(projectId, firstMessage)` | `Chat` | **Shape to confirm** | First Send of a new chat. |
| `sendChatMessage(chatId, text)` | `Chat` | Stable | One turn at a time (`AiTurnRunningError`). Mock turn simulated (D66). |
| `setAiTurnDelayForTests(ms)` | | Test only | |
| `listTrayCases(projectId)` / `listDiscardedCases(projectId)` | `TestCase[]` | Stable | Only the AI explore screens may call these (checked by a test). |
| `updateTrayCase(test)` | `TestCase` | **Shape to confirm** | Small fields only, no version (BR-EXPLORE-08). |
| `resolveDuplicate(testId, choice)` | `TestCase` | Stable | `discard` applies at once. |
| `discardCases(testIds)` | `TestCase[]` | Stable | BR-EXPLORE-09. |
| `restoreToTray(testIds)` | `TestCase[]` | **Shape to confirm** | Restore, and Undo of Discard / Move (replaced tests get their previous version back). |
| `moveToSuites(testIds)` | `{ moved, replaced, blocked }` | **Shape to confirm** | BR-EXPLORE-05. |

## 4. Open questions for engine developers (`10-open-questions.md`)

| # | Question (short) | Assumed | Affects |
|---|---|---|---|
| 1 | Does a script replay verify the expected result? (critical) | Yes | BR-SCRIPT-03 · 5.1 mode reasons, 6.1 Script results |
| 2 | One runner for recorded scripts and AI-explore tests? | Yes | BR-EXPLORE-06 · Checked AI cases keep their script |
| 3 | Failed replay falls back to an AI run that records a new script? | Yes | BR-RUN-07 · "Script re-recorded" chip (6.1) |
| 4 | Auto-retry only for system causes? | Yes | BR-RUN-06 |
| 5 | Pre-flight check feasible? | Yes | BR-RUN-09, D57 · 5.1 Start run |
| 6 | Progress saved per test so runs resume? | Yes | BR-RUN-10 · 5.3, Overview banner |
| 7 | Auto-pause on provider outage / unresponsive site? | Proposed | BR-RUN-11 · 5.3 pause reasons |
| 8 | Other browsers replay a new script in the same run? | Yes | BR-RUN-03 · 6.1 browser marks |
| 9 | Scripts independent of environment (base URL swapped)? | Yes | BR-ENV-02 |
| 10 | `{field}` placeholders linked to recorded inputs? | Yes | BR-DATA-* · 3.1 Test data, Data rows |
| 11 | Visual comparison without serial runs; stable step identity? | No serial constraint | BR-VISUAL-* · 6.2, 3.1 Visual check |
| 12 | Narration panel beside the test browser? | Yes (headless off) | 5.2 |
| 13 | Signals for each failure reason | As in BR-REASON | BR-REASON-* · 6.1 failure card |
| 14 | Duplicate data in multi-browser runs | Unique values per execution | — |
| 15 | Duplicate detection for AI cases: method? | AI comparison | BR-EXPLORE-04 · 3.5 |
| 16 | Screenshot storage and retention | Latest 10 runs per test | BR-VISUAL-02 · 6.1, 6.2 |
| 17 | Browser Use + Jev: what it does, its settings | Optional cost saving | 1.1, 2.3 |
| 18 | Where cost is computed; live during a run? | Yes | BR-RUN-05 · 5.2 cost so far, 6.1 |
| 19 | Result storage: own model, Allure optional export | Own model | 07 |
| 20 | Users choose the viewport? | No: 1920×1080 for every run | BR-VISUAL-02, D27 · 6.2, 6.4 |
| 21 | Encrypt exported project files? | No (plain file, warning) | D37 · 2.2 Export |
| 22 | How to read Excel imports | CSV only; Excel simulated | BR-IMPORT-01, D48 · 3.3 |
| 23 | Can the engine return changed screenshot regions? | Optional `changedRegions` | BR-VISUAL-02/03, D64 · 6.2 |

## 5. Known limitations of the prototype

- **No AI anywhere.** AI explore turns are simulated and labelled "Simulated (prototype)": every Send writes the same 3
  AI cases (D66). "Suggest rows" uses fixed techniques. Run outcomes are simulated: a test repeats its previous failure,
  a never-run Needs fixing case fails, everything else passes.
- **No browser automation.** Screenshots are grey placeholders; the Live run "browser" is a placeholder; Save
  screenshots saves placeholder images. Changed areas use `changedRegions` when present, else fixed placeholder
  positions (D64).
- **Evidence is generated.** Actions, locators, URLs, AI thoughts, tokens and logs are fake but consistent (D58).
- **Import:** CSV is read for real; Excel is simulated with the sample CSV and labelled "Prototype" (D48).
- **Fixed viewport:** every run is 1920×1080 (D27).
- **Pre-flight** decisions are simulated from the settings (provider key, environment URLs).
- **One user.** "Who" is always `CURRENT_USER`; there are no accounts, roles or sharing (handover is export/import).
- **Storage:** everything lives in the browser's `localStorage` (`qai.mockDb`); clearing site data resets to the seed.
  A seed change (`SEED_VERSION`) also resets it.
- **Parked items** (`09-parked.md`) are not built, e.g. "View plan" / plan checklist (Sprint 3 item 3-03), pin a
  reference, more filters, Overview metrics, ClickUp integration.
- **Visual design is interim** (08): tokens and components will be restyled in the design phase.

## 6. Running, testing and dev switches

```
npm install
npm run dev        # http://localhost:5173 (Vite)
npm run test       # Vitest: src/lib rules + data-layer behaviour tests
npm run typecheck
npm run build      # typecheck + production build
```

- **First launch** shows Welcome (no AI provider in the sample data). Any provider and key works in the mock.
- **Load sample data**: Global settings › Advanced › turn on Developer mode › Load sample data (replaces all projects,
  keeps settings). To start completely fresh, clear the site's local storage.
- **Dev switches** (browser console, dev server only):
  ```js
  const s = await import('/src/data/mock/store.ts');
  s.setMockLatency(2000);   // every call waits 2 s → loading states (default 200–500 ms)
  s.setMockFailure(true);   // every call fails like a lost connection → error states with Retry
  s.setMockFailure(false); s.setMockLatency(200, 500);
  ```
  Both last for the browser tab (session storage), so start-up states can be seen after a reload.
- **Sample run #14** runs slowly on purpose (about 30 minutes) so the Running state stays visible (07 § Sample data).
- **Line endings** are LF for every text file (`.gitattributes`).

## 7. Screenshots (`reference/prototype-screens/`)

Default state of every screen and dialog, fresh sample data, 1440 px wide, named by screen ID (03):
1-1 Welcome · 1-2 Projects · 1-3 New project · 1-4 Overview · 2-1 Knowledge · 2-2 Project settings · 2-3 Global settings ·
3-1 Suites (and test detail: Definition, Test data, Visual check, History) · 3-2 New test, Edit test · 3-3 Import ·
3-4 AI explore (new chat, a chat) · 3-5 Ready for Suites · 5-1 Run dialog · 5-2 Live run · 5-3 Paused / interrupted run ·
5-4 Runs · 6-1 Run results (default, and a failed result) · 6-2 Visual compare · 6-3 Override · 6-4 Bug report.
Unlike `reference/wireframes/`, these show the built prototype; where they differ from a wireframe, the docs and the
prototype win.
