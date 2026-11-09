/**
 * Project rules: New project validation (screens/01-global.md 1.3) and the Projects table summary (1.2).
 */
import type { Run, Status } from '@/data/types';
import { countRunStatuses } from './status';

// ---------- 1.3 New project ----------
export interface NewProjectEnvironment { id: string; name: string }
export interface NewProjectApp { id: string; name: string; urls: Record<string, string> }
export interface NewProjectForm { name: string; environments: NewProjectEnvironment[]; apps: NewProjectApp[] }

export interface NewProjectErrors {
  name?: string;
  environments?: string; // whole-grid message, e.g. "Add at least one environment"
  environmentNames: Record<string, string>; // by environment id
  appNames: Record<string, string>; // by app id
}

const norm = (s: string) => s.trim().toLowerCase();

/** An app row with no name and no URLs is an unused row: it is dropped, not an error. */
export function isEmptyAppRow(app: NewProjectApp): boolean {
  return app.name.trim() === '' && Object.values(app.urls).every((u) => u.trim() === '');
}

/**
 * Validation (1.3): name required and not used by another project (BR-PROJECT-01);
 * environment names required and unique; at least one environment.
 */
export function validateNewProject(form: NewProjectForm, existingNames: string[] = []): NewProjectErrors {
  const errors: NewProjectErrors = { environmentNames: {}, appNames: {} };
  const nameError = projectNameError(form.name, existingNames);
  if (nameError) errors.name = nameError;
  if (form.environments.length === 0) errors.environments = 'Add at least one environment.';
  const seen = new Map<string, number>();
  for (const env of form.environments) seen.set(norm(env.name), (seen.get(norm(env.name)) ?? 0) + 1);
  for (const env of form.environments) {
    if (env.name.trim() === '') errors.environmentNames[env.id] = 'Enter an environment name.';
    else if ((seen.get(norm(env.name)) ?? 0) > 1) errors.environmentNames[env.id] = 'Environment names must be different.';
  }
  for (const app of form.apps) {
    if (!isEmptyAppRow(app) && app.name.trim() === '') errors.appNames[app.id] = 'Enter an app name.';
  }
  return errors;
}

export function hasErrors(e: NewProjectErrors): boolean {
  return Boolean(e.name || e.environments) || Object.keys(e.environmentNames).length > 0 || Object.keys(e.appNames).length > 0;
}

// ---------- project names (BR-PROJECT-01, BR-PROJECT-02) ----------
// BR-PROJECT-01: project names are unique on this computer, ignoring case and surrounding spaces.
export function isProjectNameTaken(name: string, existingNames: string[]): boolean {
  return existingNames.some((n) => norm(n) === norm(name));
}

/** Inline message for a project name field, or undefined when the name is fine (BR-PROJECT-01). */
export function projectNameError(name: string, existingNames: string[]): string | undefined {
  if (name.trim() === '') return 'Enter a project name.';
  if (isProjectNameTaken(name, existingNames)) return 'A project with this name already exists. Choose another name.';
  return undefined;
}

/** BR-PROJECT-02: "Import as a copy" names the copy "<name> (copy)", then "(copy 2)", "(copy 3)"… if taken. */
export function copyName(name: string, existingNames: string[]): string {
  const base = `${name.trim()} (copy)`;
  if (!isProjectNameTaken(base, existingNames)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${name.trim()} (copy ${i})`;
    if (!isProjectNameTaken(candidate, existingNames)) return candidate;
  }
}

/** BR-PROJECT-01 on import: a different project whose name is taken becomes "<name> (2)", "(3)"… */
export function uniqueProjectName(name: string, existingNames: string[]): string {
  if (!isProjectNameTaken(name, existingNames)) return name.trim();
  for (let i = 2; ; i++) {
    const candidate = `${name.trim()} (${i})`;
    if (!isProjectNameTaken(candidate, existingNames)) return candidate;
  }
}

// ---------- 1.2 Projects table ----------
/** Highest run number, any state ("Last run": number + state). */
export function lastRun(runs: Run[]): Run | undefined {
  return runs.reduce<Run | undefined>((best, r) => (!best || r.number > best.number ? r : best), undefined);
}

/** Highest-numbered Completed run (same source as Overview "Last completed run"). */
export function lastCompletedRun(runs: Run[]): Run | undefined {
  return lastRun(runs.filter((r) => r.state === 'completed'));
}

export type NeedsAttention =
  | { kind: 'no_completed_run' }
  | { kind: 'all_passed' }
  | { kind: 'issues'; failed: number; couldntComplete: number };

/**
 * "Needs attention" (1.2): failed and couldn't-complete counts of the last completed run, or "All passed".
 * Uses the effective status (after override, BR-STATUS-05).
 */
export function needsAttention(run: Run | undefined, results: { testId: string; status: Status }[]): NeedsAttention {
  if (!run) return { kind: 'no_completed_run' };
  const c = countRunStatuses(run.testIds, results);
  return c.failed + c.couldnt_complete === 0 ? { kind: 'all_passed' } : { kind: 'issues', failed: c.failed, couldntComplete: c.couldnt_complete };
}

/** Typed-name delete confirmation (1.2): exact match, ignoring surrounding spaces. */
export function deleteConfirmed(projectName: string, typed: string): boolean {
  return typed.trim() === projectName;
}
