/**
 * Knowledge rules (screens/03-knowledge.md) and Project settings checks (screens/02-project.md).
 */
import type { Account, KnowledgeItem, ProjectSettings, Run, Scope, Suite, TestCase } from '@/data/types';

// ---------- scope ("Applies to") ----------
/** "Project-wide" / "Suite: 09 Contact Us" / "Test: CNT-04 Contact phone and email links". */
export function scopeLabel(scope: Scope, suites: Pick<Suite, 'id' | 'name'>[], tests: Pick<TestCase, 'id' | 'testId' | 'title'>[]): string {
  if (scope.kind === 'project') return 'Project-wide';
  if (scope.kind === 'suite') return `Suite: ${suites.find((s) => s.id === scope.suiteId)?.name ?? 'removed suite'}`;
  const t = tests.find((x) => x.id === scope.testId);
  return `Test: ${t ? `${t.testId} ${t.title}` : 'removed test'}`;
}

export const documentTypes: { value: NonNullable<KnowledgeItem['docType']>; label: string }[] = [
  { value: 'frs', label: 'FRS' },
  { value: 'user_stories', label: 'User stories' },
  { value: 'other', label: 'Other' },
];

export const skillKinds: { value: NonNullable<KnowledgeItem['skillKind']>; label: string }[] = [
  { value: 'instructions', label: 'Instructions' },
  { value: 'codebase', label: 'Codebase' },
  { value: 'reference', label: 'Reference' },
];

export const usedByLabels: Record<'runs' | 'ai_explore', string> = { runs: 'Runs', ai_explore: 'AI explore' };

// ---------- skills (legacy rules kept, legacy manual § 4) ----------
const INSTRUCTION_EXTENSIONS = ['.md', '.txt', '.pdf', '.docx'];

/** A folder is Codebase; a .md/.txt/.pdf/.docx file is Instructions; any other single file is Reference. */
export function skillKindFor(name: string, isFolder: boolean): NonNullable<KnowledgeItem['skillKind']> {
  if (isFolder) return 'codebase';
  const lower = name.toLowerCase();
  return INSTRUCTION_EXTENSIONS.some((ext) => lower.endsWith(ext)) ? 'instructions' : 'reference';
}

const SKIPPED_FOLDERS = ['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage', 'vendor', '__pycache__', '.venv', 'venv', 'target', 'bin', 'obj'];
const SECRET_FILE = /(^|\/)(\.env(\..*)?|id_rsa|id_ed25519)$|\.(pem|key|p12|pfx|keystore)$/i;
const BINARY_OR_LOG = /\.(exe|dll|so|dylib|bin|class|jar|zip|tar|gz|7z|rar|iso|log)$/i;

/**
 * Folder loads skip dependency and build folders (e.g. node_modules, .git, dist), binaries, logs and files that may
 * contain secrets (e.g. .env, *.pem, *.key). `path` is relative to the loaded folder, with "/" separators.
 */
export function skipReason(path: string): 'dependency_or_build' | 'secret' | 'binary_or_log' | null {
  const parts = path.split('/');
  if (parts.slice(0, -1).some((p) => SKIPPED_FOLDERS.includes(p.toLowerCase()))) return 'dependency_or_build';
  if (SECRET_FILE.test(path)) return 'secret';
  if (BINARY_OR_LOG.test(path)) return 'binary_or_log';
  return null;
}

export const SKILL_FOLDER_LIMITS = { files: 5000, bytes: 100 * 1024 * 1024 };

export type SkipReason = NonNullable<ReturnType<typeof skipReason>>;
export const skipReasonLabels: Record<SkipReason, string> = {
  dependency_or_build: 'dependency or build folder',
  secret: 'may contain secrets',
  binary_or_log: 'binary or log file',
};

export interface FolderSummary {
  kept: number;
  skipped: number;
  overLimit: boolean;
  /** What was skipped, for the expandable list: a skipped folder once ("node_modules/"), other files by path. */
  skippedEntries: { path: string; reason: SkipReason }[];
}

/** What a folder load keeps and skips, and whether the kept part is over the 5000 files / 100 MB limit. */
export function summarizeSkillFolder(files: { path: string; size: number }[]): FolderSummary {
  const kept = files.filter((f) => skipReason(f.path) === null);
  const bytes = kept.reduce((sum, f) => sum + f.size, 0);
  const entries = new Map<string, SkipReason>();
  for (const f of files) {
    const reason = skipReason(f.path);
    if (!reason) continue;
    if (reason === 'dependency_or_build') {
      const parts = f.path.split('/');
      const i = parts.findIndex((p, idx) => idx < parts.length - 1 && SKIPPED_FOLDERS.includes(p.toLowerCase()));
      entries.set(`${parts.slice(0, i + 1).join('/')}/`, reason);
    } else entries.set(f.path, reason);
  }
  return {
    kept: kept.length,
    skipped: files.length - kept.length,
    overLimit: kept.length > SKILL_FOLDER_LIMITS.files || bytes > SKILL_FOLDER_LIMITS.bytes,
    skippedEntries: [...entries].map(([path, reason]) => ({ path, reason })).sort((a, b) => a.path.localeCompare(b.path)),
  };
}

// ---------- documents (D39): an FRS is treated as authoritative (BR-REASON-05), so only readable formats ----------
const MB = 1024 * 1024;
const DOCUMENT_LIMITS: Record<string, number> = {
  '.pdf': 20 * MB,
  '.docx': 20 * MB,
  '.xlsx': 20 * MB,
  '.md': 2 * MB,
  '.txt': 2 * MB,
  '.csv': 2 * MB,
  '.json': 2 * MB,
  '.png': 20 * MB, // images: no limit given in the decision; the 20 MB limit of binary documents is used (to confirm)
  '.jpg': 20 * MB,
};
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_LIMITS).join(',');

/** Accepted: .pdf .docx .md .txt .xlsx .csv .json .png .jpg; 20 MB for pdf/docx/xlsx, 2 MB for text files. */
export function checkDocumentFile(name: string, size: number): { ok: true } | { ok: false; message: string } {
  const ext = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  const limit = DOCUMENT_LIMITS[ext];
  if (limit === undefined) return { ok: false, message: `${name} can't be uploaded: use a .pdf, .docx, .md, .txt, .xlsx, .csv, .json, .png or .jpg file.` };
  if (size > limit) return { ok: false, message: `${name} is too large: the limit for ${ext} files is ${limit / MB} MB.` };
  return { ok: true };
}

// ---------- browser extension folder (2.2) ----------
export const EXTENSION_SUBFOLDERS = ['chrome', 'firefox', 'safari'] as const;

/**
 * Checks a chosen extension folder. `paths` are the picked files' relative paths ("my-ext/chrome/manifest.json").
 * Returns the folder name and which of the chrome / firefox / safari sub-folders are missing.
 */
export function checkExtensionFolder(paths: string[]): { folder: string; missing: string[] } {
  const folder = paths[0]?.split('/')[0] ?? '';
  const present = new Set(paths.map((p) => p.split('/')[1]?.toLowerCase()).filter((x): x is string => Boolean(x)));
  return { folder, missing: EXTENSION_SUBFOLDERS.filter((s) => !present.has(s)) };
}

// ---------- accounts (BR-ENV-03) ----------
/**
 * BR-ENV-03: accounts are resolved by role + app + environment, so that combination must be unique.
 * Returns the other account with the same combination, if any (role compared case-insensitively).
 */
export function duplicateAccount(
  accounts: Pick<Account, 'id' | 'role' | 'appId' | 'environmentId'>[],
  candidate: Pick<Account, 'role' | 'appId' | 'environmentId'> & { id?: string },
): Pick<Account, 'id' | 'role' | 'appId' | 'environmentId'> | undefined {
  const role = candidate.role.trim().toLowerCase();
  return accounts.find(
    (a) => a.id !== candidate.id && a.role.trim().toLowerCase() === role && a.appId === candidate.appId && a.environmentId === candidate.environmentId,
  );
}

// ---------- removing environments and apps (2.1) ----------
/** What depends on an environment: removing one that has accounts or runs asks for confirmation. */
export function environmentUsage(environmentId: string, accounts: Pick<Account, 'environmentId'>[], runs: Pick<Run, 'environmentId'>[]) {
  return {
    accounts: accounts.filter((a) => a.environmentId === environmentId).length,
    runs: runs.filter((r) => r.environmentId === environmentId).length,
  };
}

export function appAccountCount(appId: string, accounts: Pick<Account, 'appId'>[]): number {
  return accounts.filter((a) => a.appId === appId).length;
}

// ---------- run defaults (2.2, BR-RUN-12) ----------
export type RunDefaults = ProjectSettings['runDefaults'];
export interface RunDefaultsForm { headless: boolean; parallel: boolean; workers: string; maxAiSteps: string; maxActionsPerStep: string }

/** BR-RUN-12 limits (D38): workers 1–8, max AI steps 1–500 (warning above 100), max actions per step 1–50. */
export const RUN_DEFAULT_LIMITS = { workers: 8, maxAiSteps: 500, maxActionsPerStep: 50 } as const;
export const AI_STEPS_WARNING_ABOVE = 100;

/** Shown (not blocking) when max AI steps is above 100. */
export function aiStepsWarning(raw: string): string | undefined {
  const n = Number(raw.trim());
  return /^\d+$/.test(raw.trim()) && n > AI_STEPS_WARNING_ABOVE && n <= RUN_DEFAULT_LIMITS.maxAiSteps ? 'Higher values increase AI cost per test.' : undefined;
}

/** Whole numbers within the limits. Returns errors by field, or the parsed values. */
export function parseRunDefaults(form: RunDefaultsForm): { ok: true; value: RunDefaults } | { ok: false; errors: Partial<Record<'workers' | 'maxAiSteps' | 'maxActionsPerStep', string>> } {
  const errors: Partial<Record<'workers' | 'maxAiSteps' | 'maxActionsPerStep', string>> = {};
  const num = (key: 'workers' | 'maxAiSteps' | 'maxActionsPerStep') => {
    const raw = form[key].trim();
    const n = Number(raw);
    const max = RUN_DEFAULT_LIMITS[key];
    if (!/^\d+$/.test(raw) || n < 1 || n > max) errors[key] = `Enter a whole number from 1 to ${max}.`;
    return n;
  };
  const value = { headless: form.headless, parallel: form.parallel, workers: num('workers'), maxAiSteps: num('maxAiSteps'), maxActionsPerStep: num('maxActionsPerStep') };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
