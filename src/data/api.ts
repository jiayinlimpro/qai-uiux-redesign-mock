/**
 * Data layer: the ONLY functions screens may call (CLAUDE.md rule 1, docs/07-data-model.md § Data layer).
 * All functions are async and return domain types. Today they read a mock store; developers replace the bodies
 * with real calls and keep the signatures.
 *
 * Slice 0: read functions work against the seed. Functions a later slice needs reject with NotBuiltYetError
 * naming that slice. Parameter/return shapes not defined in 07 are marked "shape to confirm".
 */
import type {
  Account,
  Browser,
  CcReason,
  Chat,
  FailReason,
  GlobalSettings,
  ID,
  KnowledgeItem,
  Mode,
  Project,
  Result,
  Run,
  Status,
  Suite,
  TestCase,
} from './types';
import { delay, getDb } from './mock/store';

export class NotFoundError extends Error {
  constructor(what: string, id: ID) {
    super(`${what} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class NotBuiltYetError extends Error {
  constructor(fn: string, slice: number) {
    super(`${fn} is not built yet (Slice ${slice})`);
    this.name = 'NotBuiltYetError';
  }
}

/** Return a copy so screens can never mutate the store. */
async function respond<T>(value: () => T): Promise<T> {
  await delay();
  return structuredClone(value());
}

async function notBuilt(fn: string, slice: number): Promise<never> {
  await delay();
  throw new NotBuiltYetError(fn, slice);
}

function find<T extends { id: ID }>(list: T[], id: ID, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new NotFoundError(what, id);
  return item;
}

// ---------- parameter types (shape to confirm in the slice that uses them) ----------
export interface TestListFilters { search?: string; latestStatus?: Status }
export type ImportDuplicateChoice = 'update' | 'skip' | 'import_as_new'; // BR-IMPORT-06
export interface ImportCheck { rowsRead: number; recognised: string[]; ignored: string[]; duplicates: string[] }
export interface RunOptions {
  projectId: ID;
  testIds: ID[];
  environmentId: ID;
  browsers: Browser[];
  model: string;
  forceAi: boolean;
}
export interface PlannedTest { testId: ID; mode: Mode; reason: string } // BR-RUN-02
export interface ResultFilters {
  status?: Status;
  reason?: FailReason | CcReason;
  mode?: Mode;
  search?: string;
  worthALook?: boolean;
}
export interface OverrideInput { status: 'passed' | 'failed'; reason: string; proofName: string }
export interface KnownIssueInput { note?: string; ticketRef?: string }
export type RunEvent =
  | { kind: 'progress'; run: Run }
  | { kind: 'narration'; text: string }
  | { kind: 'result'; result: Result };

// ---------- global ----------
export async function getGlobalSettings(): Promise<GlobalSettings> {
  return respond(() => getDb().globalSettings);
}
export async function saveGlobalSettings(_settings: GlobalSettings): Promise<GlobalSettings> {
  return notBuilt('saveGlobalSettings', 2);
}

// ---------- projects ----------
export async function listProjects(): Promise<Project[]> {
  return respond(() => getDb().projects);
}
export async function getProject(projectId: ID): Promise<Project> {
  return respond(() => find(getDb().projects, projectId, 'Project'));
}
export async function createProject(_input: Pick<Project, 'name' | 'environments' | 'apps' | 'defaultModel'>): Promise<Project> {
  return notBuilt('createProject', 2);
}
export async function updateProject(_project: Project): Promise<Project> {
  return notBuilt('updateProject', 3);
}
export async function deleteProject(_projectId: ID): Promise<void> {
  return notBuilt('deleteProject', 2);
}
export async function exportProject(_projectId: ID): Promise<Blob> {
  return notBuilt('exportProject', 2);
}
export async function importProject(_file: File): Promise<Project> {
  return notBuilt('importProject', 2);
}

// ---------- accounts and knowledge ----------
export async function listAccounts(projectId: ID): Promise<Account[]> {
  return respond(() => getDb().accounts.filter((a) => a.projectId === projectId));
}
export async function saveAccount(_account: Account, _password?: string): Promise<Account> {
  return notBuilt('saveAccount', 3);
}
export async function deleteAccount(_accountId: ID): Promise<void> {
  return notBuilt('deleteAccount', 3);
}
export async function listKnowledge(projectId: ID): Promise<KnowledgeItem[]> {
  return respond(() => getDb().knowledge.filter((k) => k.projectId === projectId));
}
export async function saveKnowledge(_item: KnowledgeItem, _file?: File): Promise<KnowledgeItem> {
  return notBuilt('saveKnowledge', 3);
}
export async function deleteKnowledge(_itemId: ID): Promise<void> {
  return notBuilt('deleteKnowledge', 3);
}

// ---------- suites and tests ----------
export async function listSuites(projectId: ID): Promise<Suite[]> {
  return respond(() => getDb().suites.filter((s) => s.projectId === projectId));
}
export async function createSuite(_projectId: ID, _name: string, _idPrefix: string): Promise<Suite> {
  return notBuilt('createSuite', 4);
}
export async function renameSuite(_suiteId: ID, _name: string): Promise<Suite> {
  return notBuilt('renameSuite', 4);
}
export async function listTests(projectId: ID, filters: TestListFilters = {}): Promise<TestCase[]> {
  if (filters.latestStatus) return notBuilt('listTests (latestStatus filter)', 4);
  const q = filters.search?.trim().toLowerCase();
  return respond(() =>
    getDb().tests.filter(
      (t) => t.projectId === projectId && (!q || t.testId.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)),
    ),
  );
}
export async function getTest(testId: ID): Promise<TestCase> {
  return respond(() => find(getDb().tests, testId, 'Test'));
}
export async function saveTest(_test: TestCase, _opts: { reason: 'edit' }): Promise<TestCase> {
  return notBuilt('saveTest', 5);
}
export async function cloneTests(_testIds: ID[]): Promise<TestCase[]> {
  return notBuilt('cloneTests', 4);
}
export async function moveTests(_testIds: ID[], _suiteId: ID | null): Promise<TestCase[]> {
  return notBuilt('moveTests', 4);
}
export async function deleteTests(_testIds: ID[]): Promise<void> {
  return notBuilt('deleteTests', 4);
}
export async function getLatestResult(_testId: ID): Promise<Result | null> {
  return notBuilt('getLatestResult', 4);
}
export async function getTestHistory(_testId: ID): Promise<Result[]> {
  return notBuilt('getTestHistory', 4);
}

// ---------- import ----------
export async function importCheck(_file: File): Promise<ImportCheck> {
  return notBuilt('importCheck', 5);
}
export async function importCommit(_file: File, _duplicateChoice: ImportDuplicateChoice): Promise<TestCase[]> {
  return notBuilt('importCommit', 5);
}

// ---------- runs ----------
export async function planRun(_selection: ID[], _options: Omit<RunOptions, 'testIds'>): Promise<PlannedTest[]> {
  return notBuilt('planRun', 6);
}
export async function startRun(_options: RunOptions): Promise<Run> {
  return notBuilt('startRun', 6);
}
export async function pauseRun(_runId: ID): Promise<Run> {
  return notBuilt('pauseRun', 6);
}
export async function resumeRun(_runId: ID): Promise<Run> {
  return notBuilt('resumeRun', 6);
}
export async function stopRun(_runId: ID): Promise<Run> {
  return notBuilt('stopRun', 6);
}
export async function skipTest(_runId: ID, _testId: ID): Promise<Run> {
  return notBuilt('skipTest', 6);
}
/** Live progress + narration events. Returns an unsubscribe function. */
export function subscribeRun(_runId: ID, _cb: (event: RunEvent) => void): () => void {
  throw new NotBuiltYetError('subscribeRun', 6);
}
export async function listRuns(projectId: ID): Promise<Run[]> {
  return respond(() => getDb().runs.filter((r) => r.projectId === projectId).sort((a, b) => b.number - a.number));
}
export async function getRun(runId: ID): Promise<Run> {
  return respond(() => find(getDb().runs, runId, 'Run'));
}
export async function listResults(runId: ID, filters?: ResultFilters): Promise<Result[]> {
  if (filters && Object.keys(filters).length > 0) return notBuilt('listResults (filters)', 7);
  return respond(() => getDb().results.filter((r) => r.runId === runId));
}
export async function getResult(resultId: ID): Promise<Result> {
  return respond(() => find(getDb().results, resultId, 'Result'));
}

// ---------- result actions ----------
export async function overrideResult(_resultId: ID, _input: OverrideInput): Promise<Result> {
  return notBuilt('overrideResult', 7);
}
export async function markKnownIssue(_testIds: ID[], _input: KnownIssueInput): Promise<TestCase[]> {
  return notBuilt('markKnownIssue', 7);
}
export async function buildBugReport(_resultId: ID): Promise<string> {
  return notBuilt('buildBugReport', 7);
}

// ---------- AI explore ----------
export async function listChats(projectId: ID): Promise<Chat[]> {
  return respond(() => getDb().chats.filter((c) => c.projectId === projectId)); // BR-EXPLORE-01
}
export async function getChat(chatId: ID): Promise<Chat> {
  return respond(() => find(getDb().chats, chatId, 'Chat'));
}
export async function sendChatMessage(_chatId: ID, _text: string): Promise<Chat> {
  return notBuilt('sendChatMessage', 8);
}
export async function addProposals(_chatId: ID, _proposalIds: ID[]): Promise<TestCase[]> {
  return notBuilt('addProposals', 8);
}
