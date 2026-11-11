/**
 * Mock evidence (prototype only): the optional technical evidence a real engine writes when a result is created
 * (D58): plain-language actions with raw action + locator, page URL per step, the AI's full thought, token usage
 * and logs. Shared by the seed and the mock run engine so both look alike. Deterministic: no randomness.
 * Developers delete this file with the mock; the real engine provides these values (or leaves them empty → "Not recorded").
 */
import type { Browser, CcReason, FailReason, Mode, Result, ResultStep, Status, TestCase } from '../types';
import { browserLabels, modeLabels, reasonLabels, statusLabels } from '@/lib/labels';

/**
 * 6.1: when a test is a single paragraph, the AI derives intent steps from it.
 * Simulated by splitting on sentence ends (an ellipsis "..." is not a sentence end).
 */
export function deriveSteps(paragraph: string): string[] {
  // A sentence end inside quoted text ('Need Help? Chat with us') does not end the step.
  const KEEP = '\u0000';
  const guarded = paragraph.replace(/(^|[\s(])'[^']*'/g, (m) => m.replace(/([.!?])\s/g, `$1${KEEP}`));
  return guarded
    .split(/(?<=[^.][.!?])\s+(?=[A-Z'"(])/)
    .map((s) => s.split(KEEP).join(' ').trim())
    .filter(Boolean);
}

/** The steps a result shows, and where they came from (Result.stepsSource, D58). */
export function intentSteps(t: Pick<TestCase, 'steps'>): { steps: string[]; source: NonNullable<Result['stepsSource']> } {
  if (t.steps.length > 1) return { steps: t.steps, source: 'test' };
  const derived = deriveSteps(t.steps[0] ?? '');
  return derived.length > 1 ? { steps: derived, source: 'ai_derived' } : { steps: t.steps, source: 'test' };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const quotedIn = (text: string) => [...text.matchAll(/'([^']{2,40})'/g)].map((m) => m[1]!);
const isMenuName = (s: string) => /^[A-Z][A-Za-z]*( [A-Z][A-Za-z]*){0,3}$/.test(s);

/** Start URL of a test in a run: the environment's URL of the platform, with the path of the test's start page. */
export function startUrl(t: Pick<TestCase, 'startPage'>, platformUrl: string | null): string {
  const base = (platformUrl ?? 'https://app.example.test').replace(/\/$/, '');
  try {
    return t.startPage ? `${base}${new URL(t.startPage).pathname}` : `${base}/`;
  } catch {
    return `${base}/`;
  }
}

/** Plain-language actions for a step, with the raw browser action and the element locator. At most 3. */
export function actionsFor(text: string, url: string): ResultStep['actions'] {
  const out: ResultStep['actions'] = [];
  const lower = text.toLowerCase();
  if (/^(open|go to|on) the homepage|^open the homepage/.test(lower)) out.push({ text: `Opened ${url}`, raw: `go_to_url("${url}")` });
  for (const item of quotedIn(text).slice(0, 2)) {
    if (/click|open|choose|select|go to/.test(lower)) {
      out.push({ text: `Clicked '${item}'`, raw: `click(text="${item}")`, locator: `role=link[name="${item}"]` });
    }
  }
  if (/fill|type|enter|put /.test(lower)) out.push({ text: 'Typed the values into the form fields', raw: 'input_text(index=12, text=…)', locator: 'form input, form textarea' });
  if (/wait|load/.test(lower)) out.push({ text: 'Waited for the page to finish loading', raw: 'wait_for_load_state("networkidle")' });
  if (out.length < 3) out.push({ text: 'Read the page to check the step', raw: 'extract_content(goal="check the step")', locator: 'main' });
  return out.slice(0, 3);
}

/** Page URL after each step: clicking a menu name ('About Us') goes to its page (/about-us/). */
export function urlsFor(steps: string[], start: string): string[] {
  const origin = new URL(start).origin;
  let current = start;
  return steps.map((text) => {
    const menu = quotedIn(text).find(isMenuName);
    if (menu && /click|open|go to/i.test(text) && !/homepage/i.test(menu)) current = `${origin}/${slug(menu)}/`;
    return current;
  });
}

/** The AI's full thought for a step it ran (AI runs only; a script replay has no AI). */
export function aiThoughtFor(step: Pick<ResultStep, 'index' | 'text' | 'status' | 'actions' | 'check' | 'aiReasoning' | 'url'>, stepCount: number): string {
  const did = step.actions.map((a) => a.text.charAt(0).toLowerCase() + a.text.slice(1)).join(', then ');
  const head = `Step ${step.index} of ${stepCount}: “${step.text}” I am on ${step.url ?? 'the page'}. I ${did || 'looked at the page'}.`;
  if (step.check && !step.check.ok) return `${head} The check did not hold: expected ${step.check.expected}, found ${step.check.found}. ${step.aiReasoning ?? ''}`.trim();
  if (step.status === 'passed') return `${head} The page matches what the step describes, so I moved on to the next step.`;
  if (step.status === 'couldnt_complete') return `${head} I could not reach a verdict for this step. ${step.aiReasoning ?? ''}`.trim();
  return head;
}

/** Tokens behind an AI cost (input $2 / output $8 per million, 70/30 split). A passing script replay uses no AI. */
export function usageFor(cost: number, mode: Mode, browsers: number, status: Status): Result['usage'] {
  const aiCost = mode === 'script' ? (status === 'passed' ? 0 : Math.max(0, cost - 0.02 * browsers)) : cost;
  return { inputTokens: Math.round((aiCost * 0.7) / 2e-6), outputTokens: Math.round((aiCost * 0.3) / 8e-6) };
}

/** A short run log for one result: start, each step that ran, the verdict. */
export function logsFor(opts: {
  startedAt: string;
  mode: Mode;
  browsers: Browser[];
  viewport: string;
  environment: string;
  steps: Pick<ResultStep, 'index' | 'status' | 'durationMs' | 'check'>[];
  status: Status;
  reason?: FailReason | CcReason;
  note?: string;
}): NonNullable<Result['logs']> {
  let t = Date.parse(opts.startedAt);
  const at = () => new Date(t).toISOString();
  const logs: NonNullable<Result['logs']> = [
    { at: at(), level: 'info', text: `Started ${modeLabels[opts.mode]} on ${opts.browsers.map((b) => browserLabels[b]).join(', ')} ${opts.viewport} (${opts.environment})` },
  ];
  for (const s of opts.steps) {
    if (s.status === 'not_run') continue;
    t += s.durationMs;
    if (s.status === 'passed') logs.push({ at: at(), level: 'info', text: `Step ${s.index} passed` });
    else if (s.status === 'failed') logs.push({ at: at(), level: 'error', text: `Step ${s.index} failed${s.check ? `: expected ${s.check.expected}, found ${s.check.found}` : ''}` });
    else logs.push({ at: at(), level: 'warn', text: `Step ${s.index} couldn't complete${s.check ? `: ${s.check.found}` : ''}` });
  }
  if (opts.note) logs.push({ at: at(), level: 'warn', text: opts.note });
  logs.push({ at: at(), level: opts.status === 'failed' ? 'error' : opts.status === 'passed' ? 'info' : 'warn', text: `Result: ${statusLabels[opts.status]}${opts.reason ? ` (${reasonLabels[opts.reason]})` : ''}` });
  return logs;
}
