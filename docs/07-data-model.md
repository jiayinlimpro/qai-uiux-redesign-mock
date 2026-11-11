# 07 · Data model, data layer and sample data

Designed for QAI's concepts, **not** for any engine or report format. Engine developers map their output into these types.
Implement exactly in `src/data/types.ts`. IDs are strings. Dates are ISO strings. Money is a number in USD.

## Entities
```ts
type ID = string;

interface AiProvider { id: ID; kind: 'openai'|'anthropic'|'gemini'|'deepseek'|'kimi'|'siraya'|'openai_compatible'|'aws_bedrock';
  label: string; defaultModel: string; baseUrl?: string; region?: string; hasSecret: boolean } // secrets never exposed to UI
interface CostSaving { enabled: boolean; typeSafeModel: string; reasoning: 'none'|'low'|'medium'|'high'; hasKey: boolean } // Browser Use + Jev
interface GlobalSettings { providers: AiProvider[]; costSaving: CostSaving; theme: 'system'|'light'|'dark'; developerMode: boolean }

interface Project { id: ID; name: string; createdAt: string; defaultModel: string;
  environments: Environment[];            // ordered, user-named
  platforms: Platform[];
  settings: ProjectSettings }
interface Environment { id: ID; name: string }                 // "Dev", "UAT", "SIT"...
interface Platform { id: ID; name: string; urls: Record<ID /*environmentId*/, string | null> }
interface ProjectSettings { visualComparison: boolean; browserExtensionPath?: string;
  runDefaults: { headless: boolean; parallel: boolean; workers: number; maxAiSteps: number; maxActionsPerStep: number } }

interface Account { id: ID; projectId: ID; role: string; platformId: ID; environmentId: ID; username: string; hasPassword: boolean }
type Scope = { kind: 'project' } | { kind: 'suite'; suiteId: ID } | { kind: 'test'; testId: ID };
interface KnowledgeItem { id: ID; projectId: ID; kind: 'document'|'skill';
  docType?: 'frs'|'user_stories'|'other'; skillKind?: 'instructions'|'codebase'|'reference';
  name: string; scope: Scope; usedBy?: ('runs'|'ai_explore')[]; uploadedAt: string }

interface Suite { id: ID; projectId: ID; name: string; idPrefix: string }        // "09 Contact Us", "CNT"
interface TestCase { id: ID; projectId: ID; suiteId: ID | null;                   // null = Not in a suite
  location: 'tray'|'suites'|'discarded';   // D65: 'suites' = the library; AI cases start in 'tray' (Ready for Suites); 'discarded' via Discard (any AI case, BR-EXPLORE-09)
  locationChange?: { by: string; at: string; replacedTestId?: ID };   // last move / discard / replace: who and when (rule 10); Undo puts it back
  testId: string;                // display ID, e.g. "CNT-04"; AI cases get a T- ID when moved (empty while in the tray or discarded)
  title: string; description?: string; preconditions?: string;
  steps: string[]; expectedResult?: string; expectedKeywords?: string; startPage?: string; browserPreference?: Browser[];
  linkedKnowledge: ID[];
  testData?: TestData;
  version: number; source: 'import'|'written'|'ai_explore'|'clone';
  clonedFromId?: ID;             // source 'clone': the original (internal id), shown as "Clone of <ID>"; not used for ordering (D41)
  isNew: boolean;                // BR-TEST-04
  aiValidationStatus?: 'not_checked'|'checked'|'needs_fixing';   // AI cases only (BR-EXPLORE-03); 'needs_fixing' → badge in Suites until the first run (BR-EXPLORE-05)
  aiOrigin?: { chatId: ID; messageIndex: number };                // AI cases: the chat and its cases card (Open in chat / View in AI explore)
  duplicateOf?: ID; duplicateChoice?: 'keep_both'|'replace'|'discard';   // tray: possible duplicate of a library test; must be chosen before moving (BR-EXPLORE-04)
  script: { state: 'none'|'recorded'|'reset'|'failed_ai'; fromRunId?: ID };
  visual: { excluded: boolean; ignoreAreas: { id: ID; stepIndex: number; label: string;
    rect?: { x: number; y: number; width: number; height: number } }[] };   // rect: share of the screenshot (0–1); absent = "Not drawn yet" (D45)
  knownIssue?: { note?: string; ticketRef?: string; markedAt: string; by?: string };   // by: who marked it (CLAUDE.md rule 10)
  createdAt: string; updatedAt: string }
interface TestData { fields: { name: string; type: 'text'|'select'|'checkbox'|'date'; options?: string[] }[];
  rows: { id: ID; index: number; values: Record<string, string>; expected: 'accepted'|'rejected'; pageShows?: string; note?: string;
          use: boolean; generated: boolean; variedField?: string }[] }   // index 1 = recorded row

type Browser = 'chrome'|'firefox'|'webkit';
type RunState = 'running'|'paused'|'interrupted'|'completed';
type Status = 'passed'|'failed'|'couldnt_complete'|'not_run';
type FailReason = 'product_bug'|'needs_confirmation'|'test_data_problem'|'test_case_unclear'|'blocked';
type CcReason = 'environment_down'|'service_problem'|'ai_couldnt_finish';
type Mode = 'ai'|'script'|'data_rows';

interface Viewport { width: number; height: number }
interface EnvironmentSnapshot { name: string; platforms: { platformId: ID; name: string; url: string | null }[] }   // BR-ENV-04
interface Run { id: ID; projectId: ID; number: number; environmentId: ID; browsers: Browser[];
  viewport: Viewport;                   // default 1920×1080; target = browser + viewport (BR-VISUAL-02)
  environment: EnvironmentSnapshot;     // name + platform URLs as used by this run; history shows it even after a rename/delete (BR-ENV-04, D36)
  model: string; forceAi: boolean;
  state: RunState; scopeLabel: string; testIds: ID[];
  progress: { done: number; total: number; currentTestId?: ID };
  pauseReason?: 'app_closed'|'provider_unavailable'|'environment_unresponsive'|'preflight_blocked';
  advanced?: { headless: boolean; parallel: boolean; workers: number; maxAiSteps: number; maxActionsPerStep: number }; // run dialog › Advanced
  stoppedAt?: { done: number; total: number; at: string };   // Stop: state Completed, shown "Stopped at done/total"; cannot resume (D55)
  startedAt: string; finishedAt?: string; durationMs?: number; cost: number }   // durationMs: active time (pauses excluded)
interface Result { id: ID; runId: ID; testId: ID; testVersion: number; mode: Mode;
  testSnapshot: { testId: string; title: string };   // display ID + title when it ran; shown if the test is deleted (D46)
  status: Status;                       // effective status (after the latest override)
  reason?: FailReason | CcReason;
  aiVerdict: { status: Status; reason?: FailReason | CcReason; confidence: 'high'|'medium'|'low' };
  perBrowser: { browser: Browser; status: Status }[];
  dataRows?: { rowId: ID; status: Status }[];
  failure?: { stepIndex: number; expected: string; found: string };
  steps: ResultStep[]; cost: number; durationMs: number;
  flags: { worthALook?: string; scriptReRecorded?: boolean; visualChanges?: number };
  note?: string;                        // e.g. "Skipped by user", "No allowed browser selected (test allows Chrome, Safari)"
  overrides?: { status: 'passed'|'failed'; reason: string; proofName: string; by: string; at: string }[];   // history, oldest first; the newest applies (D62)
  // Optional evidence, written when the result is created; empty → "Not recorded" (D58, CLAUDE.md rule 10)
  stepsSource?: 'test'|'ai_derived';    // the test's own numbered steps, or derived by the AI from a single paragraph
  usage?: { inputTokens: number; outputTokens: number };
  knowledgeUsed?: ID[];                 // knowledge items the run gave the AI for this test
  logs?: { at: string; level: 'info'|'warn'|'error'; text: string }[] }
interface ResultStep { index: number; text: string; status: Status; durationMs: number; screenshotId?: ID;
  actions: { text: string; raw: string; locator?: string }[]; check?: { expected: string; found: string; ok: boolean };
  aiReasoning?: string;                 // one line, always shown
  aiThought?: string;                   // full AI thought, shown with "Show technical details" (D58)
  url?: string;                         // page URL at the end of the step (D58)
  visual?: { previousScreenshotId?: ID; changedAreas: number;
    changedRegions?: { x: number; y: number; w: number; h: number }[];   // where they changed (share of the screenshot, 0–1); absent → placeholder outlines (D64, open question 23)
    dismissed?: { by: string; at: string } } }   // "Looks fine" in Visual compare: kept, not counted as a flag (D59)

interface Chat { id: ID; projectId: ID; title: string; updatedAt: string; running: boolean; messages: ChatMessage[] }
type ChatMessage =
  | { kind: 'user'; text: string }
  | { kind: 'ai'; text: string }
  | { kind: 'plan'; suites: number; scenarios: number; pagesExplored: number; usedKnowledge: ID[] }
  | { kind: 'cases'; testIds: ID[] };   // the AI cases this turn wrote (TestCase ids); each shows its status and location (D65; replaces tests_ready + Proposal)
```

## Data layer (`src/data/api.ts`) — the only functions screens use
```
getGlobalSettings / saveGlobalSettings(settings, { typeSafeKey? })   // secrets are write-only (BR-PROVIDER-01)
saveProvider(provider, { apiKey?, accessKeyId?, secretAccessKey? }) / removeProvider(id) → { switched[] } / listModels(providerKind)
                                                                     // Slice 2, shape to confirm (BR-PROVIDER-02/03)
backUpEverything / restoreFromBackup(file) / resetSettings / factoryReset                         // Slice 2, shape to confirm (2.3 › Data)
listProjects / getProject / createProject / updateProject / deleteProject
exportProject(projectId, { includePasswords = true })               // D37: passwords in readable form unless excluded
importProject(file, onExisting?: 'replace' | 'copy')                 // rejects ProjectExistsError when no choice given (BR-PROJECT-02)
                                                                     // create/update/import reject DuplicateProjectNameError (BR-PROJECT-01)
loadSampleData()                                                     // PROTOTYPE ONLY (Global settings › Advanced, developer mode); remove with the mock
listAccounts / saveAccount(account, password?) / deleteAccount     // password write-only; empty keeps it; BR-ENV-03 unique role+platform+env
revealAccountPassword(accountId)                                    // Slice 3, shape to confirm: only on an explicit "Show password" click (2.4)
listKnowledge / saveKnowledge(item, file?) / deleteKnowledge        // a new file sets uploadedAt; delete unlinks it from tests
updateProject(project)                                              // removing an environment or platform deletes its accounts; runs keep their record
listSuites / createSuite(projectId, name, idPrefix) / renameSuite(suiteId, name, idPrefix) / deleteSuite(suiteId)   // BR-SUITE; deleteSuite only when empty
listLibraryTests(projectId, { search?, latestStatus? })              // BR-EXPLORE-07: the ONE function for library tests (location 'suites'); replaces listTests.
                                                                     // Every Suites list, filter, run picker, run scope, count and Overview card uses it
getTest / cloneTests(ids) / moveTests(ids, suiteId|null)
deleteTests(ids) → deleted tests / restoreTests(tests)                // Undo (BR-TEST-06); restoreTests: shape to confirm
saveTest(test)                                                      // the data layer sets version + script from what changed (BR-VERSION-01, BR-SCRIPT-02, BR-DATA-07)
getLatestResult(testId) / getTestHistory(testId) / listLatestResults(projectId) → { testId: Result }   // listLatestResults: Slice 4, shape to confirm
suggestTestDataRows(testId, techniques, hint?) → { rows, basedOn }  // simulated AI (BR-DATA-06), rows go to the caller's draft; shape to confirm
importCheck(projectId, file) → { fileName, rowsRead, recognised[], ignored[], missingRequired, duplicates[], repeatedInFile[],
                                 rowsWithoutSteps, previews: { update | skip | import_as_new → per-suite create/update counts } }
importCommit(projectId, file, duplicateChoice) → { created, updated, skipped, suitesCreated }   // BR-IMPORT-05/06; Slice 5, shape to confirm
importTemplate() → CSV file (BR-IMPORT-01)
createTest(input) → TestCase                                         // 3.2 New test: v1, source Written, no script; Slice 5, shape to confirm
planRun(testIds, { forceAi, browsers }) → per-test { testId, mode, reason, browsers, notRunReason? }   // BR-RUN-02, BR-RUN-13; run dialog
runPreflight(projectId, environmentId, model) → [{ id, label, status: pass | warn | block, detail? }]  // BR-RUN-09, D57
startRun({ projectId, testIds, environmentId, browsers, model, forceAi, advanced }) → Run   // new number, environment snapshot
pauseRun / resumeRun / stopRun(runId) → Run · skipTest(runId, testId) → Run   // BR-RUN-10/14/15
listRuns / getRun / listResults(runId, filters?) / getResult     // filters: status, reason, mode, search, worthALook (BR-LIST-03);
                                                                     // tests of the run without a result are Not run (the screen adds them, D55)
overrideResult(resultId, { status, reason, proofName }) → Result    // adds to Result.overrides with by + at; the newest applies; AI verdict kept (BR-ACTION-01, BR-STATUS-05, D62)
markKnownIssue(testIds, { note?, ticketRef? }) → TestCase[]          // stores by + markedAt; no new version (BR-ACTION-02)
buildBugReport(resultId, { visualStepIndex? }) → BugReport           // { title, environment, steps[], expected, actual, screenshots[] },
                                                                     // editable; formatBugReport (lib) makes the Copy text (BR-ACTION-03, D60)
dismissVisualFlag(resultId, stepIndex, dismissed) → Result           // 6.2 Looks fine / Undo, stores by + at (D59); shape to confirm
listChats(projectId) (newest first) / getChat
createChat(projectId, firstMessage) → Chat                           // New chat: the first Send creates it; shape to confirm
sendChatMessage(chatId, text) → Chat                                 // one AI turn at a time (AiTurnRunningError, BR-EXPLORE-02); mock: simulated turn,
                                                                     // 3 canned AI cases in the tray after a few seconds, labelled simulated (D66)
listTrayCases(projectId) → TestCase[]                                // Ready for Suites: location 'tray', from all chats (D65)
updateTrayCase(test) → TestCase                                      // inline edit of small fields; no version (BR-EXPLORE-08)
resolveDuplicate(testId, 'keep_both'|'replace'|'discard') → TestCase // 'discard' = discardCases([testId]) (BR-EXPLORE-04)
discardCases(testIds) → TestCase[]                                   // any AI case, single or bulk: location 'discarded', by + at (BR-EXPLORE-09)
listDiscardedCases(projectId) → TestCase[]                           // tray › Show discarded
restoreToTray(testIds) → TestCase[]                                  // Restore to tray, and Undo of Discard or Move to Suites (replaced tests get their previous version back)
moveToSuites(testIds) → { moved: TestCase[]; replaced: TestCase[]; blocked: { testId, reason }[] }   // BR-EXPLORE-05; shape to confirm
subscribeRun(runId, cb)   // live progress + narration events (mock: timer-driven)
```
Dev helpers in the mock store: `setMockLatency(min, max)` and `setMockFailure(on)` (every call fails like a lost connection) let checks show each screen's loading and error states; they last for the browser tab (session storage), so app-start states can be checked after a reload. Mock-only store fields (not domain types): `accountPasswords`, `replacedTests` (a library test before an AI case replaced it, for Undo, D65), `simulatedTurns` (chat → when the simulated reply is due, so a turn keeps going after a reload, D66). Mock implementation: in-memory store seeded from fixtures; persist to localStorage; simulate latency (200–500 ms) and a live run via timers (`src/data/mock/runEngine.ts`: one tick per 500 ms, AI steps take 3 ticks, replay steps 1; a run that was running keeps going after a reload). Results carry mock technical evidence (`src/data/mock/evidence.ts`: plain-language actions with raw action + locator, page URL per step, the AI's full thought on AI steps, tokens from the cost, knowledge in scope, a short log; D58). Simulated outcome: a test whose previous result was Failed or Couldn't complete repeats it; a never-run Likely bug test fails as a product bug; everything else passes. Cost: AI run $0.05–$0.24, each replay $0.02.

## Sample data (one consistent world)
Fake data, not a source of truth: it may change, as long as it stays consistent with the business rules (D24).
Implemented in `src/data/mock/seed.ts` as a **timeline** (import → runs #1–#14 and test edits in date order), so script state, run mode, versions and visual history follow BR-RUN-02, BR-SCRIPT-01/02, BR-VERSION-01 and BR-VISUAL-02 automatically. `seed.test.ts` checks the facts below and the rules.

Seed from `fixtures/qcfixer-tests-seed.csv` (83 tests in 12 categories → 12 suites; `category` → suite name; `task_id` prefix → suite idPrefix). CSV tasks are single paragraphs, so each imported test has one step; results show AI-derived intent steps (screens/07-results.md).
- **Project** "qcfixer.com"; environments Dev, UAT, Prod; platforms "Customer website" (UAT https://uat.qcfixer.com, Prod https://www.qcfixer.com, Dev empty) and "Admin portal" (UAT only). Accounts: Admin (Admin portal, UAT), Registered customer (Customer website, UAT), both with a (fake) password the mock keeps outside the domain types. Default model `gpt-4.1`; run defaults: workers 2, max AI steps 40, max actions 10.
- **Knowledge** (qcfixer.com): documents "Contact form FRS.pdf" (FRS, Suite: 09 Contact Us; covers the enquiry form only, not how the phone number is linked, so CNT-04 stays Needs confirmation, BR-REASON-05) and "Customer website user stories.docx" (User stories, Project-wide); skills "testing-rules.md" (Instructions, Project-wide, Runs + AI explore) and "qcfixer-web" (Codebase, Suite: 01 Navigation, AI explore). The "Contact Us · explore on UAT" plan cites the Contact form FRS.
- **Second project** "Client HRMS" (SIT, UAT, Prod; platform "HR portal") with no suites and no runs (empty states).
- **Global settings**: no AI provider, so first launch shows Welcome.
- **Tests**: all 83 from the CSV, source `import`. Scripts follow from the runs: 72 `recorded`, 8 `failed_ai` (last AI run failed), FTR-02 and GEN-02 `none` (AI couldn't finish), CNT-03 `reset`. Edits: CNT-03 v2 (20 Oct, expected result) and v3 (3 Nov, test data); CNT-04 v2 (20 Oct, the paragraph split into 3 numbered steps; expected result unchanged from the CSV). Tests that have never run (T-01, T-02) show Not run (BR-STATUS-01). Every test has a `location`: the 83 CSV tests and T-01/T-02 are `suites` (the library). Two AI cases moved from Ready for Suites into Not in a suite, both New, prefix `T-` (BR-TEST-01), from chat "Homepage and Contact Us": T-01 "Message field enforces length limit" (Checked, so its script is `recorded` from AI explore, BR-EXPLORE-06) and T-02 "Back to top button returns to the top" (Needs fixing: Not run, "Needs fixing" badge, `aiOrigin` → that chat's cases card, BR-EXPLORE-05). **Ready for Suites** (location `tray`, from chat "Contact Us · explore on UAT"): 5 AI cases — "Contact form blocks empty submission" (Checked, possible duplicate of CNT-02, not resolved yet), "Contact form accepts a valid enquiry" (Checked), "Form keeps entered values after an error" (Not checked), "Office address opens a map" (Needs fixing), "Opening hours are shown" (Not checked, **no steps**, so it shows "Missing: steps" and cannot move). No discarded case in the sample.
- **Test data** on CNT-03: fields {name}, {email}, {topic: select}; 5 rows (row 1 recorded; rows 2–4 vary email/email/name; row 5 varies topic).
- **Runs** (all UAT, Chrome, unless noted): #1–#6 first AI runs suite by suite (Sept); #7 01 Navigation on **Prod** in Chrome/Firefox/Safari (WebKit), read-only tests only (no form submissions or data entry on Prod; checked by `seed.test.ts`); #8 CNT-04 (AI: Needs confirmation, overridden to Passed: one entry in `overrides`); #9 01 Navigation replays; #10 Data Consistency / Portfolio / News Feed re-check; #11 CNT-04 only, failed; **#12 completed, All tests (83): 72 passed · 8 failed · 3 couldn't complete, cost $3.47**; #13 interrupted (QAI closed) at 34/83 (31 passed, 3 failed: SVC-17, HOME-01, HOME-02; 49 not run; $1.12); #14 running (09 Contact Us, 4 tests, 2 done, CNT-03 running as Data rows); #14 runs slowly on purpose (`SEED_RUN_PACE` in seed.ts: about 30 minutes to complete) so the Running state stays visible for demos; checks that need the seed's fixed results stop #14 first. Script replays cost $0.02; run cost = sum of result costs. Every run's viewport is 1920×1080 (D27), and every run stores its environment snapshot (name + platform URLs, BR-ENV-04).
- **Run #12 non-passed results** (exactly these): failed — ABT-03 Product bug, FTR-04 Product bug, PRT-01 Product bug (portfolio never loads), CNT-04 Needs confirmation (phone link consistently opens WhatsApp instead of tel:, no linked document; BR-REASON-05), NWS-02 Test case unclear, CONS-02 Test case unclear, PRT-02/PRT-03 Blocked (by PRT-01, noted in the step's AI reasoning); couldn't complete — FTR-02 AI couldn't finish, GEN-02 AI couldn't finish (low confidence), WA-02 Environment down. Every one has a failure summary (step, expected, found). Worth a look: CNT-03 (passed using 38 of 40 AI steps), CNT-04 ("The behaviour looks deliberate; confirm the expected result before reporting a bug", Needs confirmation), GEN-02 (low confidence). Every seeded result has the D58 evidence (steps source, actions with locators, URLs, AI thoughts on AI steps, tokens, knowledge used, logs); script replays have no AI thought.
- **CNT-04 full evidence** (use for the detailed result): 3 steps; step 2 failed: expected `tel:` link, found `https://wa.link/mgz96d`; actions "Found phone '+60123933860' on the page", "Read its link target"; raw `click(index=218)`, `evaluate(...)`; cost $0.07; duration 2m 54s; history: #12 v2 failed, #11 v2 failed, #8 v1 passed (overridden; AI verdict Needs confirmation), #5 v1 couldn't complete (service problem).
- **Visual**: NAV-01 step 2 in #12 has 3 changed areas vs the previous UAT replay, Run #9, with their `changedRegions` (the places later ignored); afterwards ignore areas were added on NAV-01 step 2: "Hero rotating word", "Statistics counters", "Team carousel". Replays without an earlier replay on the same environment and browser have no comparison ("No previous run to compare").
- **Chats**: "Contact Us · explore on UAT": user message, plan card (2 suites, 5 scenarios, 4 pages), cases card with the 5 AI cases now in Ready for Suites. "Footer links · explore on UAT": AI turn still running (Running badge). "Homepage and Contact Us · explore on UAT": cases card with T-01 and T-02, both moved (links to the tests in Suites). "Ready for Suites (5)" in the sidebar (D65).
All counts in the UI are computed from this data (CLAUDE.md rule 5).
