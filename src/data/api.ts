/**
 * Data layer: the ONLY functions screens may call (CLAUDE.md rule 1, docs/07-data-model.md § Data layer).
 * All functions are async and return domain types. Today they read a mock store; developers replace the bodies
 * with real calls and keep the signatures.
 *
 * Slice 0: read functions work against the seed. Functions a later slice needs reject with NotBuiltYetError
 * naming that slice. Parameter/return shapes not defined in 07 are marked "shape to confirm".
 */
import type {
  AiProvider,
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
  TestData,
} from './types';
import { delay, getDb, mutate, replaceDb } from './mock/store';
import { createSeed, type MockDb } from './mock/seed';
import { copyName, isProjectNameTaken, uniqueProjectName } from '@/lib/projectRules';
import { canRemoveProvider, projectsToSwitch } from '@/lib/providers';
import { duplicateAccount } from '@/lib/knowledge';
import { changeEffect, cloneTestCase, idAfterMove, matchesFilters, nextTestId, prefixOf, validateSuite } from '@/lib/suiteRules';
import { suggestRows, type Technique } from './mock/suggestRows';
import { readImportFile, sampleImportFile } from './mock/importFile';
import * as engine from './mock/runEngine';
import type { EngineEvent, Narration } from './mock/runEngine';
import { planTest, preflight, scopeLabel, type PreflightCheck, type TestPlan } from '@/lib/runPlan';
import { snapshotEnvironment } from '@/lib/runRules';
export { UnsupportedImportFileError } from './mock/importFile';
import { contentToSteps, normaliseHeader, parseBrowserList, planImport, readTemplateCsv, recognisedColumns, templateCsv, updateFromRow, type ImportPlan, type TemplateRow } from '@/lib/importRules';
import { defaultTitle } from '@/lib/editorRules';
import { appForStartPage, applyOverride, buildBugReportFor, canOverride, matchesResultFilters, NO_RESULT_FILTERS, setVisualDismissed, validateOverride, type BugReport, type ResultFilterState } from '@/lib/resultRules';
import { CURRENT_USER } from './mock/seed';
export type { BugReport };

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
/** Import file check (3.3 step 2). Shape to confirm. */
export interface ImportCheck {
  fileName: string;
  /** Prototype: an Excel file was read as the sample test set (no spreadsheet library in the prototype). */
  simulatedExcel: boolean;
  rowsRead: number;
  recognised: string[];
  ignored: string[];
  /** No task_content column → blocking error (BR-IMPORT-03). */
  missingRequired: boolean;
  /** Test IDs that already exist in the project (BR-IMPORT-06). */
  duplicates: string[];
  repeatedInFile: string[];
  rowsWithoutSteps: number;
  /** What each duplicate choice would do (step 3 Review). */
  previews: Record<ImportDuplicateChoice, ImportPreview>;
}
export interface ImportPreview {
  /** One line per suite (new or existing), then Not in a suite (name null). */
  suites: { name: string | null; isNew: boolean; create: number; update: number }[];
  skipped: number;
  /** Update only: fields that have a value now and an empty cell in the file, so they will be cleared (D50). */
  fieldsCleared: number;
}
export interface ImportResult { created: number; updated: number; skipped: number; suitesCreated: number }
export interface RunOptions {
  projectId: ID;
  testIds: ID[];
  environmentId: ID;
  browsers: Browser[];
  model: string;
  forceAi: boolean;
  /** Run dialog › Advanced, prefilled from Project settings › Run defaults. */
  advanced: NonNullable<Run['advanced']>;
}
/** BR-RUN-02 + D53: mode, reason and browsers per test; notRunReason when the test won't run. Shape to confirm. */
export type PlannedTest = TestPlan;
export interface ResultFilters {
  status?: Status;
  reason?: FailReason | CcReason;
  mode?: Mode;
  search?: string;
  worthALook?: boolean;
}
export interface OverrideInput { status: 'passed' | 'failed'; reason: string; proofName: string }
export interface KnownIssueInput { note?: string; ticketRef?: string }
/** Live run events: progress (the run), narration (what the AI is doing now, 5.2), result (a test finished). */
export type RunEvent = EngineEvent;
export type { Narration };

// ---------- global ----------
/** Secrets go in, never come out (07: "secrets never exposed to UI"). The mock only records that one was given. Shape to confirm. */
export interface ProviderSecrets { apiKey?: string; accessKeyId?: string; secretAccessKey?: string }
export type ProviderInput = Omit<AiProvider, 'id' | 'hasSecret'> & { id?: ID };

export async function getGlobalSettings(): Promise<GlobalSettings> {
  return respond(() => getDb().globalSettings);
}
/**
 * Saves cost saving, theme and developer mode. Providers are saved with saveProvider (they carry secrets).
 * `typeSafeKey` (Browser Use + Jev) is write-only. Shape to confirm.
 */
export async function saveGlobalSettings(settings: GlobalSettings, secrets: { typeSafeKey?: string } = {}): Promise<GlobalSettings> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const hasKey = db.globalSettings.costSaving.hasKey || Boolean(secrets.typeSafeKey?.trim());
      db.globalSettings = {
        providers: db.globalSettings.providers,
        costSaving: { ...settings.costSaving, hasKey },
        theme: settings.theme,
        developerMode: settings.developerMode,
      };
      return db.globalSettings;
    }),
  );
}
/** Adds a provider (no id) or updates one. Empty secrets keep the saved ones. Shape to confirm. */
export async function saveProvider(input: ProviderInput, secrets: ProviderSecrets): Promise<AiProvider> {
  await delay();
  const given = Object.values(secrets).some((s) => Boolean(s?.trim()));
  // Never save partial secrets: AWS Bedrock access key ID and secret access key are saved together or not at all.
  if (input.kind === 'aws_bedrock' && Boolean(secrets.accessKeyId?.trim()) !== Boolean(secrets.secretAccessKey?.trim())) {
    throw new Error('Enter both the access key ID and the secret access key.');
  }
  return structuredClone(
    mutate((db) => {
      const existing = input.id ? find(db.globalSettings.providers, input.id, 'Provider') : undefined;
      const provider: AiProvider = { ...input, id: existing?.id ?? newId('prov'), hasSecret: given || Boolean(existing?.hasSecret) };
      db.globalSettings.providers = existing
        ? db.globalSettings.providers.map((p) => (p.id === provider.id ? provider : p))
        : [...db.globalSettings.providers, provider];
      return provider;
    }),
  );
}
export interface ModelSwitch { projectId: ID; projectName: string; from: string; to: string }
/**
 * Removes a provider (with its secrets). BR-PROVIDER-02: never the last one.
 * BR-PROVIDER-03: projects whose default model only that provider offered switch to the first remaining provider's
 * default model; the switches are returned so the UI can tell the user. Shape to confirm.
 */
export async function removeProvider(providerId: ID): Promise<{ switched: ModelSwitch[] }> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const removed = find(db.globalSettings.providers, providerId, 'Provider');
      const remaining = db.globalSettings.providers.filter((p) => p.id !== providerId);
      if (!canRemoveProvider(db.globalSettings.providers.length)) throw new LastProviderError();
      const withModels = (p: AiProvider) => ({ provider: p, models: MOCK_MODELS[p.kind] });
      const switches = projectsToSwitch(db.projects, withModels(removed), remaining.map(withModels));
      const switched = switches.map(({ project, newModel }) => {
        const from = project.defaultModel;
        project.defaultModel = newModel;
        return { projectId: project.id, projectName: project.name, from, to: newModel };
      });
      db.globalSettings.providers = remaining;
      return { switched };
    }),
  );
}
export class LastProviderError extends Error {
  constructor() {
    super('The last AI provider cannot be removed.');
    this.name = 'LastProviderError';
  }
}
/**
 * Models offered by a provider. Real app: asked from the provider. Mock: a fixed list per provider.
 * AWS Bedrock uses a typed model id instead (1.1). Shape to confirm.
 */
export async function listModels(kind: AiProvider['kind']): Promise<string[]> {
  return respond(() => MOCK_MODELS[kind]);
}
const MOCK_MODELS: Record<AiProvider['kind'], string[]> = {
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],
  anthropic: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  kimi: ['kimi-k2'],
  siraya: ['siraya-chat'],
  openai_compatible: ['gpt-4.1', 'llama-3.3-70b-instruct', 'qwen2.5-72b-instruct'],
  aws_bedrock: [],
};

// ---------- data on this computer (2.3 › Data) — shape to confirm ----------
const BACKUP_FORMAT = 'qai-backup';
const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  providers: [],
  costSaving: { enabled: false, typeSafeModel: 'jev-latest', reasoning: 'none', hasKey: false },
  theme: 'system',
  developerMode: false,
};

/** Everything on this computer: settings and all projects. */
export async function backUpEverything(): Promise<Blob> {
  await delay();
  const { seedVersion: _v, ...data } = getDb();
  return jsonBlob({ format: BACKUP_FORMAT, version: 1, createdAt: new Date().toISOString(), data });
}
/** Replaces everything with the backup's contents. */
export async function restoreFromBackup(file: File): Promise<void> {
  await delay();
  const parsed = await readJson(file);
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT || !isRecord(parsed.data) || !Array.isArray(parsed.data.projects)) {
    throw new InvalidFileError('This file is not a QAI backup.');
  }
  const data = parsed.data as unknown as Omit<MockDb, 'seedVersion' | 'accountPasswords'> & { accountPasswords?: MockDb['accountPasswords'] };
  replaceDb({ ...data, accountPasswords: data.accountPasswords ?? {} }); // older backups have no password store
}
/** Global settings back to defaults (AI providers removed, so QAI shows Welcome). Projects are kept. */
export async function resetSettings(): Promise<GlobalSettings> {
  await delay();
  return structuredClone(
    mutate((db) => {
      db.globalSettings = structuredClone(DEFAULT_GLOBAL_SETTINGS);
      return db.globalSettings;
    }),
  );
}
/** Removes all projects and settings, like a fresh install. */
export async function factoryReset(): Promise<void> {
  await delay();
  replaceDb({
    globalSettings: structuredClone(DEFAULT_GLOBAL_SETTINGS),
    projects: [],
    accounts: [],
    knowledge: [],
    suites: [],
    tests: [],
    runs: [],
    results: [],
    chats: [],
    accountPasswords: {},
  });
}

// ---------- projects ----------
const PROJECT_FORMAT = 'qai-project';
const DEFAULT_PROJECT_SETTINGS: Project['settings'] = {
  visualComparison: true, // BR-VISUAL-01 default on
  runDefaults: { headless: false, parallel: false, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 }, // 2.2, BR-RUN-12
};

export async function listProjects(): Promise<Project[]> {
  return respond(() => getDb().projects);
}
export async function getProject(projectId: ID): Promise<Project> {
  return respond(() => find(getDb().projects, projectId, 'Project'));
}
export async function createProject(input: Pick<Project, 'name' | 'environments' | 'apps' | 'defaultModel'>): Promise<Project> {
  await delay();
  return structuredClone(
    mutate((db) => {
      assertNameFree(db, input.name);
      const project: Project = {
        id: newId('p'),
        name: input.name.trim(),
        createdAt: new Date().toISOString(),
        defaultModel: input.defaultModel,
        environments: input.environments.map((e) => ({ ...e, name: e.name.trim() })),
        apps: input.apps.map((a) => ({ ...a, name: a.name.trim() })),
        settings: structuredClone(DEFAULT_PROJECT_SETTINGS),
      };
      db.projects.push(project);
      return project;
    }),
  );
}
export async function updateProject(project: Project): Promise<Project> {
  await delay();
  return structuredClone(
    mutate((db) => {
      find(db.projects, project.id, 'Project');
      assertNameFree(db, project.name, project.id);
      const next = { ...structuredClone(project), name: project.name.trim() };
      const envIds = new Set(next.environments.map((e) => e.id));
      const appIds = new Set(next.apps.map((a) => a.id));
      next.apps = next.apps.map((a) => ({ ...a, urls: Object.fromEntries(Object.entries(a.urls).filter(([envId]) => envIds.has(envId))) }));
      // Removing an environment or app removes its accounts (2.1 asks for confirmation first). Runs keep their record.
      const gone = db.accounts.filter((a) => a.projectId === project.id && (!envIds.has(a.environmentId) || !appIds.has(a.appId)));
      for (const a of gone) delete db.accountPasswords[a.id];
      db.accounts = db.accounts.filter((a) => !gone.includes(a));
      db.projects = db.projects.map((p) => (p.id === project.id ? next : p));
      return next;
    }),
  );
}
/** Deletes the project and everything in it. */
export async function deleteProject(projectId: ID): Promise<void> {
  await delay();
  mutate((db) => {
    find(db.projects, projectId, 'Project');
    removeProjectData(db, projectId);
  });
}
function removeProjectData(db: MockDb, projectId: ID): void {
  const runIds = new Set(db.runs.filter((r) => r.projectId === projectId).map((r) => r.id));
  for (const a of db.accounts) if (a.projectId === projectId) delete db.accountPasswords[a.id];
  db.projects = db.projects.filter((p) => p.id !== projectId);
  db.accounts = db.accounts.filter((x) => x.projectId !== projectId);
  db.knowledge = db.knowledge.filter((x) => x.projectId !== projectId);
  db.suites = db.suites.filter((x) => x.projectId !== projectId);
  db.tests = db.tests.filter((x) => x.projectId !== projectId);
  db.runs = db.runs.filter((x) => x.projectId !== projectId);
  db.results = db.results.filter((x) => !runIds.has(x.runId));
  db.chats = db.chats.filter((x) => x.projectId !== projectId);
}
/** BR-PROJECT-01: project names are unique on this computer (case-insensitive). */
function assertNameFree(db: MockDb, name: string, exceptProjectId?: ID): void {
  const others = db.projects.filter((p) => p.id !== exceptProjectId).map((p) => p.name);
  if (isProjectNameTaken(name, others)) throw new DuplicateProjectNameError(name.trim());
}
/**
 * One file with the project's suites, tests, scripts, knowledge, accounts, runs, results and AI chats (2.2 › Data).
 * includePasswords (default true, D37): account passwords in readable form; without them the accounts arrive with no password.
 */
export async function exportProject(projectId: ID, opts: { includePasswords?: boolean } = {}): Promise<Blob> {
  const includePasswords = opts.includePasswords ?? true;
  await delay();
  const db = getDb();
  const project = find(db.projects, projectId, 'Project');
  const runIds = new Set(db.runs.filter((r) => r.projectId === projectId).map((r) => r.id));
  return jsonBlob({
    format: PROJECT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    accounts: db.accounts.filter((x) => x.projectId === projectId).map((a) => (includePasswords ? a : { ...a, hasPassword: false })),
    knowledge: db.knowledge.filter((x) => x.projectId === projectId),
    suites: db.suites.filter((x) => x.projectId === projectId),
    tests: db.tests.filter((x) => x.projectId === projectId),
    runs: db.runs.filter((x) => x.projectId === projectId),
    results: db.results.filter((x) => runIds.has(x.runId)),
    chats: db.chats.filter((x) => x.projectId === projectId),
    accountPasswords: db.accounts
      .filter((a) => includePasswords && a.projectId === projectId && db.accountPasswords[a.id] !== undefined)
      .map((a) => ({ accountId: a.id, password: db.accountPasswords[a.id]! })),
  });
}
/**
 * What to do when the exported project is already on this computer (BR-PROJECT-02):
 * 'replace' overwrites it (its local runs and changes are lost) · 'copy' adds it as "<name> (copy)" with new IDs.
 */
export type ExistingProjectChoice = 'replace' | 'copy';

/**
 * Adds an exported project (handover). If the project is already here and no choice is given, rejects with
 * ProjectExistsError so the UI can ask (BR-PROJECT-02). A different project whose name is taken gets "<name> (2)" (BR-PROJECT-01).
 */
export async function importProject(file: File, onExisting?: ExistingProjectChoice): Promise<Project> {
  await delay();
  const parsed = await readJson(file);
  if (!isRecord(parsed) || parsed.format !== PROJECT_FORMAT || !isRecord(parsed.project) || typeof parsed.project.id !== 'string') {
    throw new InvalidFileError('This file is not a QAI project export.');
  }
  let x = parsed as unknown as ProjectExport;
  return structuredClone(
    mutate((db) => {
      const existing = db.projects.find((p) => p.id === x.project.id);
      if (existing && !onExisting) throw new ProjectExistsError(existing.name);
      if (existing && onExisting === 'replace') {
        removeProjectData(db, existing.id);
      } else if (existing && onExisting === 'copy') {
        x = withNewIds(x);
        x.project.name = copyName(x.project.name, db.projects.map((p) => p.name));
      }
      const names = db.projects.map((p) => p.name);
      if (isProjectNameTaken(x.project.name, names)) x.project.name = uniqueProjectName(x.project.name, names);
      db.projects.push(x.project);
      db.accounts.push(...(x.accounts ?? []));
      db.knowledge.push(...(x.knowledge ?? []));
      db.suites.push(...(x.suites ?? []));
      db.tests.push(...(x.tests ?? []));
      db.runs.push(...(x.runs ?? []));
      db.results.push(...(x.results ?? []));
      db.chats.push(...(x.chats ?? []));
      for (const ap of x.accountPasswords ?? []) db.accountPasswords[ap.accountId] = ap.password;
      return x.project;
    }),
  );
}
interface ProjectExport {
  project: Project;
  accounts: Account[];
  knowledge: KnowledgeItem[];
  suites: Suite[];
  tests: TestCase[];
  runs: Run[];
  results: Result[];
  chats: Chat[];
  accountPasswords?: { accountId: ID; password: string }[];
}
/** A copy needs its own IDs: every entity ID is replaced everywhere it is referenced. */
function withNewIds(x: ProjectExport): ProjectExport {
  const suffix = crypto.randomUUID().slice(0, 6);
  const ids = new Map<string, string>();
  const entities = [[x.project], x.accounts ?? [], x.knowledge ?? [], x.suites ?? [], x.tests ?? [], x.runs ?? [], x.results ?? [], x.chats ?? []].flat() as { id: ID }[];
  for (const e of entities) ids.set(e.id, `${e.id}-${suffix}`);
  for (const chat of x.chats ?? []) {
    for (const m of chat.messages) if (m.kind === 'tests_ready') for (const pr of m.proposals) ids.set(pr.id, `${pr.id}-${suffix}`);
  }
  const remap = (v: unknown): unknown => {
    if (typeof v === 'string') return ids.get(v) ?? v;
    if (Array.isArray(v)) return v.map(remap);
    if (isRecord(v)) return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, remap(val)]));
    return v;
  };
  return remap(x) as ProjectExport;
}

/**
 * Prototype only (Global settings > Advanced, developer mode on): replaces all projects with the sample data.
 * Keeps global settings (AI providers etc.). Developers remove this together with the mock.
 */
export async function loadSampleData(): Promise<void> {
  await delay();
  const { seedVersion: _v, globalSettings: _g, ...sample } = createSeed();
  replaceDb({ ...sample, globalSettings: structuredClone(getDb().globalSettings) });
}

// ---------- file helpers ----------
export class InvalidFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFileError';
  }
}
export class DuplicateProjectNameError extends Error {
  constructor(public projectName: string) {
    super('A project with this name already exists. Choose another name.');
    this.name = 'DuplicateProjectNameError';
  }
}
export class ProjectExistsError extends Error {
  constructor(public projectName: string) {
    super(`"${projectName}" is already on this computer.`);
    this.name = 'ProjectExistsError';
  }
}
function jsonBlob(value: unknown): Blob {
  return new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
}
async function readJson(file: File): Promise<unknown> {
  try {
    return JSON.parse(await file.text()) as unknown;
  } catch {
    throw new InvalidFileError('This file could not be read.');
  }
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function newId(prefix: string): ID {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------- accounts and knowledge ----------
export async function listAccounts(projectId: ID): Promise<Account[]> {
  return respond(() => getDb().accounts.filter((a) => a.projectId === projectId));
}
export type AccountInput = Omit<Account, 'id' | 'hasPassword'> & { id?: ID };
/**
 * Adds (no id) or updates an account. `password` is write-only; empty keeps the saved one.
 * BR-ENV-03: role + app + environment must be unique (DuplicateAccountError). Shape to confirm.
 */
export async function saveAccount(input: AccountInput, password?: string): Promise<Account> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const existing = input.id ? find(db.accounts, input.id, 'Account') : undefined;
      const clash = duplicateAccount(db.accounts.filter((a) => a.projectId === input.projectId), { ...input, id: existing?.id });
      if (clash) throw new DuplicateAccountError();
      const id = existing?.id ?? newId('acc');
      if (password?.trim()) db.accountPasswords[id] = password;
      const account: Account = { ...input, role: input.role.trim(), username: input.username.trim(), id, hasPassword: db.accountPasswords[id] !== undefined };
      db.accounts = existing ? db.accounts.map((a) => (a.id === id ? account : a)) : [...db.accounts, account];
      return account;
    }),
  );
}
export async function deleteAccount(accountId: ID): Promise<void> {
  await delay();
  mutate((db) => {
    find(db.accounts, accountId, 'Account');
    db.accounts = db.accounts.filter((a) => a.id !== accountId);
    delete db.accountPasswords[accountId];
  });
}
/** Password shown on an explicit "Show password" click only (2.1); never part of listAccounts. Shape to confirm. */
export async function revealAccountPassword(accountId: ID): Promise<string> {
  await delay();
  find(getDb().accounts, accountId, 'Account');
  return getDb().accountPasswords[accountId] ?? '';
}
export class DuplicateAccountError extends Error {
  constructor() {
    super('An account for this role, app and environment already exists.');
    this.name = 'DuplicateAccountError';
  }
}
export async function listKnowledge(projectId: ID): Promise<KnowledgeItem[]> {
  return respond(() => getDb().knowledge.filter((k) => k.projectId === projectId));
}
export type KnowledgeInput = Omit<KnowledgeItem, 'id' | 'uploadedAt'> & { id?: ID };
/**
 * Adds (no id) or updates a document or skill. A new `file` (upload, Replace, Load skill) sets uploadedAt to now;
 * the mock keeps metadata only. Shape to confirm.
 */
export async function saveKnowledge(input: KnowledgeInput, file?: File | { name: string }): Promise<KnowledgeItem> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const existing = input.id ? find(db.knowledge, input.id, 'Knowledge item') : undefined;
      const item: KnowledgeItem = {
        ...input,
        name: input.name.trim(),
        id: existing?.id ?? newId('k'),
        uploadedAt: file || !existing ? new Date().toISOString() : existing.uploadedAt,
      };
      db.knowledge = existing ? db.knowledge.map((k) => (k.id === item.id ? item : k)) : [...db.knowledge, item];
      return item;
    }),
  );
}
/** Deletes a document or skill and unlinks it from tests. */
export async function deleteKnowledge(itemId: ID): Promise<void> {
  await delay();
  mutate((db) => {
    find(db.knowledge, itemId, 'Knowledge item');
    db.knowledge = db.knowledge.filter((k) => k.id !== itemId);
    for (const t of db.tests) t.linkedKnowledge = t.linkedKnowledge.filter((id) => id !== itemId);
  });
}

// ---------- suites and tests ----------
export async function listSuites(projectId: ID): Promise<Suite[]> {
  return respond(() => getDb().suites.filter((s) => s.projectId === projectId));
}
/** BR-SUITE-01: name and ID prefix validated (unique; prefix 1–6 capitals/digits, not "T"). Shape to confirm. */
export async function createSuite(projectId: ID, name: string, idPrefix: string): Promise<Suite> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const errors = validateSuite({ name, idPrefix }, db.suites.filter((s) => s.projectId === projectId));
      if (errors.name || errors.idPrefix) throw new InvalidSuiteError(errors);
      const suite: Suite = { id: newId('suite'), projectId, name: name.trim(), idPrefix: idPrefix.trim() };
      db.suites.push(suite);
      return suite;
    }),
  );
}
/** Rename a suite and/or change its prefix. Existing test IDs are kept; the prefix applies to new IDs (D43). */
export async function renameSuite(suiteId: ID, name: string, idPrefix: string): Promise<Suite> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const suite = find(db.suites, suiteId, 'Suite');
      const errors = validateSuite({ name, idPrefix }, db.suites.filter((s) => s.projectId === suite.projectId), suiteId);
      if (errors.name || errors.idPrefix) throw new InvalidSuiteError(errors);
      suite.name = name.trim();
      suite.idPrefix = idPrefix.trim();
      return suite;
    }),
  );
}
/** BR-SUITE-02: only an empty suite can be deleted ("Move or delete its tests first."). */
export async function deleteSuite(suiteId: ID): Promise<void> {
  await delay();
  mutate((db) => {
    find(db.suites, suiteId, 'Suite');
    if (db.tests.some((t) => t.suiteId === suiteId)) throw new SuiteNotEmptyError();
    db.suites = db.suites.filter((s) => s.id !== suiteId);
  });
}
export class InvalidSuiteError extends Error {
  constructor(public errors: { name?: string; idPrefix?: string }) {
    super(errors.name ?? errors.idPrefix ?? 'Invalid suite');
    this.name = 'InvalidSuiteError';
  }
}
export class SuiteNotEmptyError extends Error {
  constructor() {
    super('Move or delete its tests first.');
    this.name = 'SuiteNotEmptyError';
  }
}

export async function listTests(projectId: ID, filters: TestListFilters = {}): Promise<TestCase[]> {
  await delay();
  const db = getDb();
  const latest = latestResultsOf(db, projectId);
  const f = { search: filters.search ?? '', status: filters.latestStatus ?? ('all' as const) };
  return structuredClone(db.tests.filter((t) => t.projectId === projectId && matchesFilters(t, latest[t.id]?.status ?? 'not_run', f)));
}
export async function getTest(testId: ID): Promise<TestCase> {
  return respond(() => find(getDb().tests, testId, 'Test'));
}
/**
 * Saves a test. The data layer decides version and script from what changed (BR-VERSION-01, BR-SCRIPT-02, BR-DATA-07):
 * callers never set `version` or `script`. Test ID unique within the project (BR-TEST-01); steps required (BR-TEST-02).
 */
export async function saveTest(test: TestCase): Promise<TestCase> {
  await delay();
  return structuredClone(
    mutate((db) => applySave(db, test)),
  );
}
/** Version and script follow from what changed (shared by saveTest and import Update). */
function applySave(db: MockDb, test: TestCase): TestCase {
  const before = find(db.tests, test.id, 'Test');
  if (test.steps.every((s) => !s.trim())) throw new Error('A test needs at least one step.');
  assertTestIdFree(db, test.projectId, test.testId, test.id);
  const effect = changeEffect(before, test);
  const next: TestCase = {
    ...structuredClone(test),
    testId: test.testId.trim(),
    title: test.title.trim() || defaultTitle(test.steps), // BR-TEST-02
    version: before.version + (effect.bumpVersion ? 1 : 0),
    script: effect.resetScript && before.script.state === 'recorded' ? { state: 'reset' } : before.script,
    updatedAt: effect.bumpVersion ? new Date().toISOString() : before.updatedAt,
  };
  db.tests = db.tests.map((t) => (t.id === next.id ? next : t));
  return next;
}
function assertTestIdFree(db: MockDb, projectId: ID, testId: string, exceptId?: ID): void {
  if (db.tests.some((t) => t.projectId === projectId && t.id !== exceptId && t.testId.toLowerCase() === testId.trim().toLowerCase())) {
    throw new DuplicateTestIdError(testId.trim());
  }
}
export type NewTestInput = Pick<TestCase, 'projectId' | 'suiteId' | 'testId' | 'title' | 'steps' | 'linkedKnowledge'> &
  Partial<Pick<TestCase, 'description' | 'preconditions' | 'expectedResult' | 'expectedKeywords' | 'startPage' | 'browserPreference' | 'testData'>>;
/** New test written in QAI (3.2): v1, source Written, no script. ID unique (BR-TEST-01), steps required (BR-TEST-02). Shape to confirm. */
export async function createTest(input: NewTestInput): Promise<TestCase> {
  await delay();
  return structuredClone(
    mutate((db) => {
      if (input.steps.every((s) => !s.trim())) throw new Error('A test needs at least one step.');
      assertTestIdFree(db, input.projectId, input.testId);
      const now = new Date().toISOString();
      const test: TestCase = {
        ...structuredClone(input),
        id: newId('t'),
        testId: input.testId.trim(),
        title: input.title.trim() || defaultTitle(input.steps),
        steps: input.steps.map((x) => x.trim()).filter(Boolean),
        version: 1,
        source: 'written',
        isNew: false,
        script: { state: 'none' },
        visual: { excluded: false, ignoreAreas: [] },
        createdAt: now,
        updatedAt: now,
      };
      db.tests.push(test);
      return test;
    }),
  );
}
export class DuplicateTestIdError extends Error {
  constructor(public testId: string) {
    super(`Another test already uses the ID ${testId}.`);
    this.name = 'DuplicateTestIdError';
  }
}
/** BR-CLONE: copies get the next IDs of their suite's prefix and the same title. Returned in the order given. */
export async function cloneTests(testIds: ID[]): Promise<TestCase[]> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const now = new Date().toISOString();
      return testIds.map((id) => {
        const original = find(db.tests, id, 'Test');
        const suite = original.suiteId ? find(db.suites, original.suiteId, 'Suite') : null;
        const taken = db.tests.filter((t) => t.projectId === original.projectId).map((t) => t.testId);
        const copy = cloneTestCase(original, newId('t'), nextTestId(prefixOf(suite), taken), now);
        db.tests.push(copy);
        return copy;
      });
    }),
  );
}
/** Moves tests to a suite or to Not in a suite (null). T- tests get the destination prefix (BR-TEST-05). No version change. */
export async function moveTests(testIds: ID[], suiteId: ID | null): Promise<TestCase[]> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const suite = suiteId ? find(db.suites, suiteId, 'Suite') : null;
      return testIds.map((id) => {
        const t = find(db.tests, id, 'Test');
        const taken = db.tests.filter((x) => x.projectId === t.projectId && x.id !== t.id).map((x) => x.testId);
        t.testId = idAfterMove(t, suite, taken);
        t.suiteId = suiteId;
        return t;
      });
    }),
  );
}
/**
 * Deletes tests and returns them (for Undo). Their past results stay in their runs and keep showing the test through
 * the result's snapshot (BR-TEST-06). Knowledge scoped to a deleted test keeps its scope, so Undo restores everything.
 */
export async function deleteTests(testIds: ID[]): Promise<TestCase[]> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const ids = new Set(testIds);
      const removed = db.tests.filter((t) => ids.has(t.id));
      db.tests = db.tests.filter((t) => !ids.has(t.id));
      return removed;
    }),
  );
}
/** Undo of deleteTests: puts the tests back as they were. A display ID taken meanwhile gets the next free one. Shape to confirm. */
export async function restoreTests(tests: TestCase[]): Promise<TestCase[]> {
  await delay();
  return structuredClone(
    mutate((db) =>
      tests.map((t) => {
        if (db.tests.some((x) => x.id === t.id)) return find(db.tests, t.id, 'Test');
        const suite = t.suiteId ? (db.suites.find((x) => x.id === t.suiteId) ?? null) : null;
        const taken = db.tests.filter((x) => x.projectId === t.projectId).map((x) => x.testId);
        const restored: TestCase = {
          ...structuredClone(t),
          suiteId: suite ? suite.id : null,
          testId: taken.some((id) => id.toLowerCase() === t.testId.toLowerCase()) ? nextTestId(prefixOf(suite), taken) : t.testId,
        };
        db.tests.push(restored);
        return restored;
      }),
    ),
  );
}
/** Latest result of every test in the project, by test id (BR-STATUS-01: highest run number). Tests never run are absent. Shape to confirm. */
export async function listLatestResults(projectId: ID): Promise<Record<ID, Result>> {
  return respond(() => latestResultsOf(getDb(), projectId));
}
export async function getLatestResult(testId: ID): Promise<Result | null> {
  return respond(() => {
    const db = getDb();
    const t = find(db.tests, testId, 'Test');
    return latestResultsOf(db, t.projectId)[testId] ?? null;
  });
}
/** Every result of a test, newest run first. */
export async function getTestHistory(testId: ID): Promise<Result[]> {
  return respond(() => {
    const db = getDb();
    const number = new Map(db.runs.map((r) => [r.id, r.number]));
    return db.results.filter((r) => r.testId === testId).sort((a, b) => (number.get(b.runId) ?? 0) - (number.get(a.runId) ?? 0));
  });
}
function latestResultsOf(db: MockDb, projectId: ID): Record<ID, Result> {
  const number = new Map(db.runs.filter((r) => r.projectId === projectId).map((r) => [r.id, r.number]));
  const out: Record<ID, Result> = {};
  for (const r of db.results) {
    const n = number.get(r.runId);
    if (n === undefined) continue;
    const prev = out[r.testId];
    if (!prev || n > (number.get(prev.runId) ?? 0)) out[r.testId] = r;
  }
  return out;
}
/**
 * Suggest test data rows (BR-DATA-06), simulated AI. Uses the linked FRS if the test has one in scope, else the hint.
 * Returns new rows (generated: true) for the caller's draft; nothing is saved. Shape to confirm.
 */
export async function suggestTestDataRows(testId: ID, techniques: Technique[], hint?: string): Promise<{ rows: Omit<TestData['rows'][number], 'index'>[]; basedOn: string | null }> {
  await delay();
  await delay(); // AI takes a moment
  const db = getDb();
  const test = find(db.tests, testId, 'Test');
  if (!test.testData) return { rows: [], basedOn: null };
  const frs = db.knowledge.find(
    (k) =>
      k.projectId === test.projectId &&
      k.docType === 'frs' &&
      (test.linkedKnowledge.includes(k.id) || (k.scope.kind === 'suite' && k.scope.suiteId === test.suiteId) || (k.scope.kind === 'test' && k.scope.testId === test.id)),
  );
  return structuredClone({ rows: suggestRows(test.testData, techniques, () => newId('row')), basedOn: frs?.name ?? (hint?.trim() ? 'your hint' : null) });
}

// ---------- import (BR-IMPORT) ----------
async function readPlanInput(projectId: ID, file: File) {
  const { text, simulatedExcel } = await readImportFile(file);
  const parsed = readTemplateCsv(text);
  const db = getDb();
  return {
    parsed,
    simulatedExcel,
    tests: db.tests.filter((t) => t.projectId === projectId),
    suites: db.suites.filter((x) => x.projectId === projectId),
  };
}
/** Fields an Update clears: empty cells over existing values, and an empty category cell over a suite (D50). */
function clearedBy(plan: ImportPlan, tests: TestCase[]): number {
  let n = 0;
  for (const r of plan.rows) {
    if (r.action !== 'update') continue;
    const current = tests.find((t) => t.id === r.existingId);
    if (!current) continue;
    n += updateFromRow(current, r.row).cleared.length;
    if (r.categoryInFile && r.suite === null && current.suiteId !== null) n++;
  }
  return n;
}
function previewOf(plan: ImportPlan, suites: Suite[], tests: TestCase[] = []): ImportPreview {
  const lines = new Map<string, ImportPreview['suites'][number]>();
  const key = (name: string | null) => (name === null ? '' : name.toLowerCase());
  for (const r of plan.rows) {
    if (r.action === 'skip') continue;
    const k = key(r.suite);
    const existing = r.suite ? suites.find((x) => x.name.toLowerCase() === k) : undefined;
    const line = lines.get(k) ?? { name: existing?.name ?? r.suite, isNew: r.suite !== null && !existing, create: 0, update: 0 };
    if (r.action === 'create') line.create++;
    else line.update++;
    lines.set(k, line);
  }
  const sorted = [...lines.values()].sort((a, b) => (a.name === null ? 1 : b.name === null ? -1 : a.name.localeCompare(b.name, undefined, { numeric: true })));
  return { suites: sorted, skipped: plan.rows.filter((r) => r.action === 'skip').length, fieldsCleared: clearedBy(plan, tests) };
}
/** Step 2 file check: columns, rows, duplicates, and what each duplicate choice would do. Wrong type → UnsupportedImportFileError. */
export async function importCheck(projectId: ID, file: File): Promise<ImportCheck> {
  await delay();
  const { parsed, simulatedExcel, tests, suites } = await readPlanInput(projectId, file);
  const recognised = recognisedColumns(parsed.header);
  const missingRequired = !parsed.header.some((h) => normaliseHeader(h) === 'task_content');
  const plan = (choice: ImportDuplicateChoice) => planImport(parsed.rows, tests, suites, choice);
  const base = plan('update');
  return {
    fileName: file.name,
    simulatedExcel,
    rowsRead: parsed.rowsRead,
    recognised,
    ignored: parsed.ignoredColumns,
    missingRequired,
    duplicates: [...new Set(base.duplicates)],
    repeatedInFile: base.repeatedInFile,
    rowsWithoutSteps: base.rowsWithoutSteps,
    previews: {
      update: previewOf(base, suites, tests),
      skip: previewOf(plan('skip'), suites),
      import_as_new: previewOf(plan('import_as_new'), suites),
    },
  };
}
/** Step 3 Import: creates suites from categories, creates / updates / skips tests per the duplicate choice (BR-IMPORT-05/06). */
export async function importCommit(projectId: ID, file: File, duplicateChoice: ImportDuplicateChoice): Promise<ImportResult> {
  await delay();
  const { parsed } = await readPlanInput(projectId, file);
  if (!parsed.header.some((h) => normaliseHeader(h) === 'task_content')) throw new InvalidFileError('The file has no task_content column.');
  return mutate((db) => {
    const suites = db.suites.filter((x) => x.projectId === projectId);
    const plan = planImport(parsed.rows, db.tests.filter((t) => t.projectId === projectId), suites, duplicateChoice);
    const suiteIdByName = new Map(suites.map((x) => [x.name.toLowerCase(), x.id]));
    for (const ns of plan.newSuites) {
      const suite: Suite = { id: newId('suite'), projectId, name: ns.name, idPrefix: ns.idPrefix };
      db.suites.push(suite);
      suiteIdByName.set(ns.name.toLowerCase(), suite.id);
    }
    const suiteIdOf = (name: string | null) => (name ? (suiteIdByName.get(name.toLowerCase()) ?? null) : null);
    const fields = (row: TemplateRow) => {
      const steps = contentToSteps(row.task_content ?? '');
      const browsers = parseBrowserList(row.browser_type);
      return {
        steps,
        ...(row.title ? { title: row.title } : {}),
        ...(row.description ? { description: row.description } : {}),
        ...(row.preconditions ? { preconditions: row.preconditions } : {}),
        ...(row.expected_result ? { expectedResult: row.expected_result } : {}),
        ...(row.expected_keywords ? { expectedKeywords: row.expected_keywords } : {}),
        ...(row.base_url ? { startPage: row.base_url } : {}),
        ...(browsers ? { browserPreference: browsers } : {}),
      };
    };
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();
    for (const r of plan.rows) {
      if (r.action === 'create') {
        const f = fields(r.row);
        db.tests.push({
          id: newId('t'),
          projectId,
          suiteId: suiteIdOf(r.suite),
          testId: r.testId,
          title: f.title ?? defaultTitle(f.steps),
          ...f,
          linkedKnowledge: [],
          version: 1,
          source: 'import',
          isNew: false,
          script: { state: 'none' },
          visual: { excluded: false, ignoreAreas: [] },
          createdAt: now,
          updatedAt: now,
        });
        created++;
      } else if (r.action === 'update') {
        const current = find(db.tests, r.existingId, 'Test');
        // Update (D50): a missing column keeps the value, an empty cell clears it; same for the category (→ Not in a suite).
        const { next } = updateFromRow(current, r.row);
        const suiteId = r.suite ? suiteIdOf(r.suite) : r.categoryInFile ? null : current.suiteId;
        applySave(db, { ...next, steps: contentToSteps(r.row.task_content ?? ''), suiteId });
        updated++;
      }
    }
    return { created, updated, skipped: plan.rows.filter((r) => r.action === 'skip').length, suitesCreated: plan.newSuites.length };
  });
}
/** The import template as a CSV file (BR-IMPORT-01). */
export async function importTemplate(): Promise<Blob> {
  return new Blob([templateCsv()], { type: 'text/csv' });
}
/** Prototype only: the sample CSV, to try Import without a file of your own. */
export function sampleImportFileForPrototype(): File {
  return sampleImportFile();
}

// ---------- runs ----------
/** How each test will run (BR-RUN-02, D53). Shape to confirm. */
export async function planRun(testIds: ID[], options: { forceAi: boolean; browsers: Browser[] }): Promise<PlannedTest[]> {
  return respond(() => {
    const db = getDb();
    const number = (id: ID) => db.runs.find((r) => r.id === id)?.number;
    return testIds.map((id) => planTest(find(db.tests, id, 'Test'), { forceAi: options.forceAi, browsers: options.browsers, runNumber: number }));
  });
}
/** Pre-flight check after Start run (BR-RUN-09) [DEV-CONFIRM]. Simulated; shape to confirm. */
export async function runPreflight(projectId: ID, environmentId: ID, model: string): Promise<PreflightCheck[]> {
  await delay();
  await delay();
  const db = getDb();
  const project = find(db.projects, projectId, 'Project');
  const providers = db.globalSettings.providers;
  const offered = providers.flatMap((p) => [p.defaultModel, ...MOCK_MODELS[p.kind]]);
  return structuredClone(preflight(project, environmentId, model, providers, offered));
}
/** Starts a run: new run number, frozen test list, environment snapshot (BR-RUN-01, BR-ENV-04). */
export async function startRun(options: RunOptions): Promise<Run> {
  await delay();
  const run = mutate((db) => {
    const project = find(db.projects, options.projectId, 'Project');
    if (options.testIds.length === 0) throw new Error('Select at least one test.');
    if (options.browsers.length === 0) throw new Error('Select at least one browser.');
    const projectRuns = db.runs.filter((r) => r.projectId === options.projectId);
    const tests = db.tests.filter((t) => t.projectId === options.projectId);
    const suites = db.suites.filter((x) => x.projectId === options.projectId);
    const r: Run = {
      id: newId('run'),
      projectId: options.projectId,
      number: projectRuns.reduce((n, x) => Math.max(n, x.number), 0) + 1,
      environmentId: options.environmentId,
      browsers: [...options.browsers],
      viewport: { width: 1920, height: 1080 }, // D27
      environment: snapshotEnvironment(project, options.environmentId),
      model: options.model,
      forceAi: options.forceAi,
      state: 'running',
      scopeLabel: scopeLabel(options.testIds, tests, suites),
      testIds: [...options.testIds],
      progress: { done: 0, total: options.testIds.length },
      advanced: { ...options.advanced },
      startedAt: new Date().toISOString(),
      durationMs: 0,
      cost: 0,
    };
    db.runs.push(r);
    return r;
  });
  engine.ensureEngine();
  return structuredClone(run);
}
export async function pauseRun(runId: ID): Promise<Run> {
  await delay();
  engine.pause(runId);
  return structuredClone(find(getDb().runs, runId, 'Run'));
}
/** Resume a paused or interrupted run from the next test (BR-RUN-10). A stopped run cannot be resumed (D55). */
export async function resumeRun(runId: ID): Promise<Run> {
  await delay();
  engine.resume(runId);
  return structuredClone(find(getDb().runs, runId, 'Run'));
}
/** Stop: Completed with stoppedAt; remaining tests Not run (D55). */
export async function stopRun(runId: ID): Promise<Run> {
  await delay();
  engine.stop(runId);
  return structuredClone(find(getDb().runs, runId, 'Run'));
}
/** Skip the running test: Not run, "Skipped by user"; the run continues (D54). */
export async function skipTest(runId: ID, testId: ID): Promise<Run> {
  await delay();
  engine.skip(runId, testId);
  return structuredClone(find(getDb().runs, runId, 'Run'));
}
/** Live progress + narration + result events. Returns an unsubscribe function. */
export function subscribeRun(runId: ID, cb: (event: RunEvent) => void): () => void {
  return engine.subscribe(runId, cb);
}
/** Tests only: speed of the simulated run. */
export function setRunSpeedForTests(ms: number): void {
  engine.setMockRunSpeed(ms);
}
export async function listRuns(projectId: ID): Promise<Run[]> {
  engine.ensureEngine(); // a run that was running keeps going after a reload
  return respond(() => getDb().runs.filter((r) => r.projectId === projectId).sort((a, b) => b.number - a.number));
}
export async function getRun(runId: ID): Promise<Run> {
  engine.ensureEngine();
  return respond(() => find(getDb().runs, runId, 'Run'));
}
/**
 * Results of a run (one per test that ended). Tests of the run without a result are Not run (BR-STATUS-01, D55);
 * the screen adds them. Filters follow BR-LIST-03 (status, reason, mode, search by ID/title, Worth a look).
 */
export async function listResults(runId: ID, filters: ResultFilters = {}): Promise<Result[]> {
  return respond(() => {
    const db = getDb();
    const f: ResultFilterState = { ...NO_RESULT_FILTERS, ...filters };
    return db.results
      .filter((r) => r.runId === runId)
      .filter((r) => {
        const t = db.tests.find((x) => x.id === r.testId);
        const name = t ? { displayId: t.testId, title: t.title } : { displayId: r.testSnapshot.testId, title: r.testSnapshot.title };
        return matchesResultFilters({ status: r.status, reason: r.reason, mode: r.mode, worthALook: r.flags.worthALook, ...name }, f);
      });
  });
}
export async function getResult(resultId: ID): Promise<Result> {
  return respond(() => find(getDb().results, resultId, 'Result'));
}

// ---------- result actions ----------
/** BR-ACTION-01 / BR-STATUS-05: new status with reason + proof; the AI verdict is kept; who and when are stored. */
export async function overrideResult(resultId: ID, input: OverrideInput): Promise<Result> {
  await delay();
  const errors = validateOverride(input);
  if (errors.reason || errors.proof) throw new Error(errors.reason ?? errors.proof);
  return structuredClone(
    mutate((db) => {
      const r = find(db.results, resultId, 'Result');
      if (!canOverride(r)) throw new Error('A Not run result has no verdict to override.');
      const next = applyOverride(r, input, CURRENT_USER, new Date().toISOString());
      db.results = db.results.map((x) => (x.id === resultId ? next : x));
      return next;
    }),
  );
}
/** BR-ACTION-02 / BR-STATUS-06: single or bulk; optional note and ticket reference; stored with who and when. Not a new version. */
export async function markKnownIssue(testIds: ID[], input: KnownIssueInput): Promise<TestCase[]> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const at = new Date().toISOString();
      return testIds.map((id) => {
        const t = find(db.tests, id, 'Test');
        t.knownIssue = { ...(input.note?.trim() ? { note: input.note.trim() } : {}), ...(input.ticketRef?.trim() ? { ticketRef: input.ticketRef.trim() } : {}), markedAt: at, by: CURRENT_USER };
        return t;
      });
    }),
  );
}
/**
 * BR-ACTION-03: the bug report of a result, as editable fields (the dialog formats them for Copy with formatBugReport).
 * `visualStepIndex`: a report of the visual change at that step (6.2 Mark as bug). Shape to confirm (D60).
 */
export async function buildBugReport(resultId: ID, opts: { visualStepIndex?: number } = {}): Promise<BugReport> {
  return respond(() => {
    const db = getDb();
    const result = find(db.results, resultId, 'Result');
    const run = find(db.runs, result.runId, 'Run');
    const test = db.tests.find((t) => t.id === result.testId);
    const project = db.projects.find((p) => p.id === run.projectId);
    const app = appForStartPage(test?.startPage, project?.apps ?? []);
    const step = opts.visualStepIndex !== undefined ? result.steps.find((s) => s.index === opts.visualStepIndex) : undefined;
    const previous = step?.visual?.previousScreenshotId ? db.results.find((r) => r.steps.some((s) => s.screenshotId === step.visual!.previousScreenshotId)) : undefined;
    return buildBugReportFor({
      result,
      test: test ? { testId: test.testId, title: test.title, ...(test.expectedResult ? { expectedResult: test.expectedResult } : {}) } : result.testSnapshot,
      ...(app ? { appName: app.name } : {}),
      run,
      ...(opts.visualStepIndex !== undefined
        ? { visualStep: { index: opts.visualStepIndex, ...(previous ? { previousRunNumber: db.runs.find((x) => x.id === previous.runId)?.number } : {}) } }
        : {}),
    });
  });
}
/**
 * 6.2 Looks fine (dismissed = true) or its Undo (false). The flag stays on the step with who and when; flag counts
 * leave it out (D59). Shape to confirm.
 */
export async function dismissVisualFlag(resultId: ID, stepIndex: number, dismissed: boolean): Promise<Result> {
  await delay();
  return structuredClone(
    mutate((db) => {
      const r = find(db.results, resultId, 'Result');
      const next = setVisualDismissed(r, stepIndex, dismissed ? { by: CURRENT_USER, at: new Date().toISOString() } : null);
      db.results = db.results.map((x) => (x.id === resultId ? next : x));
      return next;
    }),
  );
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
