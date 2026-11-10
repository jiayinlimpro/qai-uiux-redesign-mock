/**
 * Domain types. Implemented exactly as docs/07-data-model.md § Entities.
 * Engine developers map their output into these types. Do not change without updating 07 and the decision log.
 * IDs are strings. Dates are ISO strings. Money is a number in USD.
 */

export type ID = string;

export interface AiProvider { id: ID; kind: 'openai'|'anthropic'|'gemini'|'deepseek'|'kimi'|'siraya'|'openai_compatible'|'aws_bedrock';
  label: string; defaultModel: string; baseUrl?: string; region?: string; hasSecret: boolean } // secrets never exposed to UI
export interface CostSaving { enabled: boolean; typeSafeModel: string; reasoning: 'none'|'low'|'medium'|'high'; hasKey: boolean } // Browser Use + Jev
export interface GlobalSettings { providers: AiProvider[]; costSaving: CostSaving; theme: 'system'|'light'|'dark'; developerMode: boolean }

export interface Project { id: ID; name: string; createdAt: string; defaultModel: string;
  environments: Environment[];            // ordered, user-named
  apps: App[];
  settings: ProjectSettings }
export interface Environment { id: ID; name: string }                 // "Dev", "UAT", "SIT"...
export interface App { id: ID; name: string; urls: Record<ID /*environmentId*/, string | null> }
export interface ProjectSettings { visualComparison: boolean; browserExtensionPath?: string;
  runDefaults: { headless: boolean; parallel: boolean; workers: number; maxAiSteps: number; maxActionsPerStep: number } }

export interface Account { id: ID; projectId: ID; role: string; appId: ID; environmentId: ID; username: string; hasPassword: boolean }
export type Scope = { kind: 'project' } | { kind: 'suite'; suiteId: ID } | { kind: 'test'; testId: ID };
export interface KnowledgeItem { id: ID; projectId: ID; kind: 'document'|'skill';
  docType?: 'frs'|'user_stories'|'other'; skillKind?: 'instructions'|'codebase'|'reference';
  name: string; scope: Scope; usedBy?: ('runs'|'ai_explore')[]; uploadedAt: string }

export interface Suite { id: ID; projectId: ID; name: string; idPrefix: string }        // "09 Contact Us", "CNT"
export interface TestCase { id: ID; projectId: ID; suiteId: ID | null;                   // null = Not in a suite
  testId: string;                // display ID, e.g. "CNT-04"
  title: string; description?: string; preconditions?: string;
  steps: string[]; expectedResult?: string; expectedKeywords?: string; startPage?: string; browserPreference?: Browser[];
  linkedKnowledge: ID[];
  testData?: TestData;
  version: number; source: 'import'|'written'|'ai_explore'|'clone';
  clonedFromId?: ID;             // source 'clone': the original (internal id), shown as "Clone of <ID>"; not used for ordering (D41)
  isNew: boolean;                // BR-TEST-04
  aiExploreFinding?: { kind: 'likely_bug'; chatId: ID; messageIndex: number }; // BR-EXPLORE-05: badge until the test's first run
  script: { state: 'none'|'recorded'|'reset'|'failed_ai'; fromRunId?: ID };
  visual: { excluded: boolean; ignoreAreas: { id: ID; stepIndex: number; label: string;
    rect?: { x: number; y: number; width: number; height: number } }[] };   // rect: share of the screenshot (0–1); absent = "Not drawn yet" (D45)
  knownIssue?: { note?: string; ticketRef?: string; markedAt: string; by?: string };   // by: who marked it (CLAUDE.md rule 10)
  createdAt: string; updatedAt: string }
export interface TestData { fields: { name: string; type: 'text'|'select'|'checkbox'|'date'; options?: string[] }[];
  rows: { id: ID; index: number; values: Record<string, string>; expected: 'accepted'|'rejected'; pageShows?: string; note?: string;
          use: boolean; generated: boolean; variedField?: string }[] }   // index 1 = recorded row

export type Browser = 'chrome'|'firefox'|'webkit';
export type RunState = 'running'|'paused'|'interrupted'|'completed';
export type Status = 'passed'|'failed'|'couldnt_complete'|'not_run';
export type FailReason = 'product_bug'|'needs_confirmation'|'test_data_problem'|'test_case_unclear'|'blocked';
export type CcReason = 'environment_down'|'service_problem'|'ai_couldnt_finish';
export type Mode = 'ai'|'script'|'data_rows';

export interface Viewport { width: number; height: number }
/** What the run's environment was when the run started (BR-ENV-04). */
export interface EnvironmentSnapshot { name: string; apps: { appId: ID; name: string; url: string | null }[] }
export interface Run { id: ID; projectId: ID; number: number; environmentId: ID; browsers: Browser[];
  viewport: Viewport;                   // default 1920×1080; target = browser + viewport (BR-VISUAL-02)
  environment: EnvironmentSnapshot;     // name + app URLs as used by this run; history shows it even after a rename/delete (BR-ENV-04, D36)
  model: string; forceAi: boolean;
  state: RunState; scopeLabel: string; testIds: ID[];
  progress: { done: number; total: number; currentTestId?: ID };
  pauseReason?: 'app_closed'|'provider_unavailable'|'environment_unresponsive'|'preflight_blocked';
  advanced?: { headless: boolean; parallel: boolean; workers: number; maxAiSteps: number; maxActionsPerStep: number }; // run dialog › Advanced
  stoppedAt?: { done: number; total: number; at: string };   // Stop: state Completed, shown "Stopped at done/total"; cannot resume (D55)
  startedAt: string; finishedAt?: string; durationMs?: number; cost: number }   // durationMs: active time (pauses excluded)
export interface Result { id: ID; runId: ID; testId: ID; testVersion: number; mode: Mode;
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
export interface ResultStep { index: number; text: string; status: Status; durationMs: number; screenshotId?: ID;
  actions: { text: string; raw: string; locator?: string }[]; check?: { expected: string; found: string; ok: boolean };
  aiReasoning?: string;                 // one line, always shown
  aiThought?: string;                   // full AI thought, shown with "Show technical details" (D58)
  url?: string;                         // page URL at the end of the step (D58)
  visual?: { previousScreenshotId?: ID; changedAreas: number;
    changedRegions?: { x: number; y: number; w: number; h: number }[];   // where they changed (share of the screenshot, 0–1); absent → placeholder outlines (D64)
    dismissed?: { by: string; at: string } } }   // "Looks fine" in Visual compare: kept, not counted as a flag (D59)

export interface Chat { id: ID; projectId: ID; title: string; updatedAt: string; running: boolean; messages: ChatMessage[] }
export type ChatMessage =
  | { kind: 'user'; text: string }
  | { kind: 'ai'; text: string }
  | { kind: 'plan'; suites: number; scenarios: number; pagesExplored: number; usedKnowledge: ID[] }
  | { kind: 'tests_ready'; proposals: Proposal[] };
export interface Proposal { id: ID; title: string; steps: string[]; expectedResult: string;
  validation: 'validated'|'likely_bug'|'needs_attention';
  duplicateOf?: ID; duplicateChoice?: 'keep_both'|'replace'|'skip'; ticked: boolean;
  outcome?: { kind: 'added'; testId: ID } | { kind: 'replaced'; testId: ID } | { kind: 'skipped' } } // set by Add (D29)
