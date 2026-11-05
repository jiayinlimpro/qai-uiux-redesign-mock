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
  apps: App[];
  settings: ProjectSettings }
interface Environment { id: ID; name: string }                 // "Dev", "UAT", "SIT"...
interface App { id: ID; name: string; urls: Record<ID /*environmentId*/, string | null> }
interface ProjectSettings { visualComparison: boolean; browserExtensionPath?: string;
  runDefaults: { headless: boolean; parallel: boolean; workers: number; maxAiSteps: number; maxActionsPerStep: number } }

interface Account { id: ID; projectId: ID; role: string; appId: ID; environmentId: ID; username: string; hasPassword: boolean }
type Scope = { kind: 'project' } | { kind: 'suite'; suiteId: ID } | { kind: 'test'; testId: ID };
interface KnowledgeItem { id: ID; projectId: ID; kind: 'document'|'skill';
  docType?: 'frs'|'user_stories'|'other'; skillKind?: 'instructions'|'codebase'|'reference';
  name: string; scope: Scope; usedBy?: ('runs'|'ai_explore')[]; uploadedAt: string }

interface Suite { id: ID; projectId: ID; name: string; idPrefix: string }        // "09 Contact Us", "CNT"
interface TestCase { id: ID; projectId: ID; suiteId: ID | null;                   // null = Not in a suite
  testId: string;                // display ID, e.g. "CNT-04"
  title: string; description?: string; preconditions?: string;
  steps: string[]; expectedResult?: string; expectedKeywords?: string; startPage?: string; browserPreference?: Browser[];
  linkedKnowledge: ID[];
  testData?: TestData;
  version: number; source: 'import'|'written'|'ai_explore'|'clone';
  isNew: boolean;                // BR-TEST-04
  script: { state: 'none'|'recorded'|'reset'|'failed_ai'; fromRunId?: ID };
  visual: { excluded: boolean; ignoreAreas: { id: ID; stepIndex: number; label: string }[] };
  knownIssue?: { note?: string; ticketRef?: string; markedAt: string };
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

interface Run { id: ID; projectId: ID; number: number; environmentId: ID; browsers: Browser[]; model: string; forceAi: boolean;
  state: RunState; scopeLabel: string; testIds: ID[];
  progress: { done: number; total: number; currentTestId?: ID };
  pauseReason?: 'app_closed'|'provider_unavailable'|'environment_unresponsive'|'preflight_blocked';
  startedAt: string; finishedAt?: string; durationMs?: number; cost: number }
interface Result { id: ID; runId: ID; testId: ID; testVersion: number; mode: Mode;
  status: Status;                       // effective status (after override)
  reason?: FailReason | CcReason;
  aiVerdict: { status: Status; reason?: FailReason | CcReason; confidence: 'high'|'medium'|'low' };
  perBrowser: { browser: Browser; status: Status }[];
  dataRows?: { rowId: ID; status: Status }[];
  failure?: { stepIndex: number; expected: string; found: string };
  steps: ResultStep[]; cost: number; durationMs: number;
  flags: { worthALook?: string; scriptReRecorded?: boolean; visualChanges?: number };
  override?: { status: 'passed'|'failed'; reason: string; proofName: string; by: string; at: string } }
interface ResultStep { index: number; text: string; status: Status; durationMs: number; screenshotId?: ID;
  actions: { text: string; raw: string }[]; check?: { expected: string; found: string; ok: boolean };
  aiReasoning?: string; visual?: { previousScreenshotId?: ID; changedAreas: number } }

interface Chat { id: ID; projectId: ID; title: string; updatedAt: string; running: boolean; messages: ChatMessage[] }
type ChatMessage =
  | { kind: 'user'; text: string }
  | { kind: 'ai'; text: string }
  | { kind: 'plan'; suites: number; scenarios: number; pagesExplored: number; usedKnowledge: ID[] }
  | { kind: 'tests_ready'; proposals: Proposal[] };
interface Proposal { id: ID; title: string; steps: string[]; expectedResult: string;
  validation: 'validated'|'likely_bug'|'needs_attention';
  duplicateOf?: ID; duplicateChoice?: 'keep_both'|'replace'|'skip'; ticked: boolean }
```

## Data layer (`src/data/api.ts`) — the only functions screens use
```
getGlobalSettings / saveGlobalSettings
listProjects / getProject / createProject / updateProject / deleteProject / exportProject / importProject
listAccounts / saveAccount / deleteAccount
listKnowledge / saveKnowledge / deleteKnowledge
listSuites / createSuite / renameSuite
listTests(projectId, { search?, latestStatus? }) / getTest / saveTest(test, { reason: 'edit' }) / cloneTests(ids) / moveTests(ids, suiteId|null) / deleteTests(ids)
getLatestResult(testId) / getTestHistory(testId)
importCheck(file) → { rowsRead, recognised[], ignored[], duplicates[] } / importCommit(file, duplicateChoice)
planRun(selection, options) → per-test { mode, reason }      // BR-RUN-02, used by the run dialog
startRun(options) → Run / pauseRun / resumeRun / stopRun / skipTest
listRuns / getRun / listResults(runId, filters) / getResult
overrideResult / markKnownIssue / buildBugReport(resultId) → text
listChats / getChat / sendChatMessage / addProposals(chatId, proposalIds) → TestCase[]
subscribeRun(runId, cb)   // live progress + narration events (mock: timer-driven)
```
Mock implementation: in-memory store seeded from fixtures; persist to localStorage; simulate latency (200–500 ms) and a live run via timers.

## Sample data (one consistent world)
Seed from `fixtures/qcfixer-tests-seed.csv` (83 tests in 12 categories → 12 suites; `category` → suite name; `task_id` prefix → suite idPrefix).
- **Project** "qcfixer.com"; environments Dev, UAT, Prod; apps "Customer website" (Prod URL https://www.qcfixer.com, others empty) and "Admin portal" (all empty). Accounts: Admin (Admin portal, UAT), Registered customer (Customer website, UAT).
- **Second project** "[Client HRMS]" with no runs (for the Projects list).
- **Tests**: all 83 from the CSV, source `import`, v1, script `recorded` for passed ones, except: CNT-03 v3 (script `reset`), CNT-04 v2 (script `failed_ai`), plus two AI explore tests in Not in a suite: CNT-05 "Message field enforces length limit" (not run, isNew) and FTR-10 "Footer social links open profiles" (failed, Product bug, isNew).
- **Test data** on CNT-03: fields {name}, {email}, {topic: select}; 5 rows (row 1 recorded; rows 2–4 vary email/email/name; row 5 varies topic).
- **Runs**: #11 completed (CNT-04 only, failed); **#12 completed, all suites, UAT, 83 tests: 72 passed · 8 failed · 3 couldn't complete, cost $3.47**; #13 interrupted at 34/83 (31 passed, 3 failed, 49 not run, $1.12); #14 running (09 Contact Us, 4 tests, test 3 of 4).
- **Run #12 non-passed results** (exactly these): failed — ABT-03 Product bug, FTR-04 Product bug, CNT-04 Needs confirmation, NWS-02 Test case unclear, CONS-02 Test case unclear, PRT-01/PRT-02/PRT-03 Blocked (root PRT-01); couldn't complete — FTR-02 AI couldn't finish, GEN-02 AI couldn't finish, WA-02 Environment down. Worth a look: CNT-03 (passed using 38 of 40 AI steps), CNT-04, GEN-02.
- **CNT-04 full evidence** (use for the detailed result): 3 steps; step 2 failed: expected `tel:` link, found `https://wa.link/mgz96d`; actions "Found phone '+60123933860' on the page", "Read its link target"; raw `click(index=218)`, `evaluate(...)`; cost $0.07; duration 2m 54s; history: #12 v2 failed, #11 v2 failed, #9 v1 passed (overridden), #8 v1 couldn't complete (service problem).
- **Visual**: NAV-01 step 2 has 3 changed areas vs Run #11; ignore areas on NAV-01: "Hero rotating word", "Statistics counters", "Team carousel".
- **Chat** "Contact Us · explore on UAT": user message, plan card (2 suites, 5 scenarios, 4 pages), tests ready card with 5 proposals (1.1 duplicate of CNT-02, 2.1 Likely bug, 2.2 Needs attention unticked).
All counts in the UI are computed from this data (CLAUDE.md rule 5).
