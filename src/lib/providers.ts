/**
 * AI provider form rules (screens/01-global.md 1.1 Welcome, 2.3 Global settings › AI providers).
 * Provider-specific fields: API key (all except AWS Bedrock); Base URL (OpenAI-compatible);
 * Region + Access key ID + Secret access key (AWS Bedrock). Model: a list from the provider, a text model id for AWS Bedrock.
 */
import type { AiProvider } from '@/data/types';

export type ProviderKind = AiProvider['kind'];

export const providerKinds: { kind: ProviderKind; label: string }[] = [
  { kind: 'openai', label: 'OpenAI' },
  { kind: 'anthropic', label: 'Anthropic' },
  { kind: 'gemini', label: 'Google Gemini' },
  { kind: 'deepseek', label: 'DeepSeek' },
  { kind: 'kimi', label: 'Kimi' },
  { kind: 'siraya', label: 'Siraya' },
  { kind: 'openai_compatible', label: 'OpenAI-compatible' },
  { kind: 'aws_bedrock', label: 'AWS Bedrock' },
];

export function providerLabel(kind: ProviderKind): string {
  return providerKinds.find((p) => p.kind === kind)?.label ?? kind;
}

export interface ProviderFields {
  apiKey: boolean;
  baseUrl: boolean;
  aws: boolean; // region + access key ID + secret access key
  modelInput: 'select' | 'text';
}

export function fieldsFor(kind: ProviderKind): ProviderFields {
  const aws = kind === 'aws_bedrock';
  return { apiKey: !aws, baseUrl: kind === 'openai_compatible', aws, modelInput: aws ? 'text' : 'select' };
}

export interface ProviderForm {
  kind: ProviderKind | '';
  apiKey: string;
  baseUrl: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultModel: string;
}

export const emptyProviderForm: ProviderForm = {
  kind: '',
  apiKey: '',
  baseUrl: '',
  region: '',
  accessKeyId: '',
  secretAccessKey: '',
  defaultModel: '',
};

/**
 * Required fields filled (1.1: "Continue disabled until required fields filled").
 * When editing a provider whose secret is already saved, empty secret fields mean "keep the saved one".
 */
export function isProviderFormComplete(form: ProviderForm, opts: { secretSaved?: boolean } = {}): boolean {
  if (!form.kind) return false;
  const f = fieldsFor(form.kind);
  const filled = (v: string) => v.trim() !== '';
  const secretOk = (v: string) => filled(v) || opts.secretSaved === true;
  if (f.apiKey && !secretOk(form.apiKey)) return false;
  if (f.baseUrl && !filled(form.baseUrl)) return false;
  if (f.aws && (!filled(form.region) || !secretOk(form.accessKeyId) || !secretOk(form.secretAccessKey))) return false;
  // Never save partial secrets: the two AWS keys are replaced together or not at all.
  if (f.aws && filled(form.accessKeyId) !== filled(form.secretAccessKey)) return false;
  return filled(form.defaultModel);
}

/** Browser Use + Jev fields are required only when ticked (1.1, 2.3). */
export interface CostSavingForm {
  enabled: boolean;
  typeSafeKey: string;
  typeSafeModel: string;
  reasoning: 'none' | 'low' | 'medium' | 'high';
}

export function isCostSavingComplete(form: CostSavingForm, opts: { keySaved?: boolean } = {}): boolean {
  if (!form.enabled) return true;
  return (form.typeSafeKey.trim() !== '' || opts.keySaved === true) && form.typeSafeModel.trim() !== '';
}

/** The model list needs the API key first; AWS Bedrock uses a typed model ID instead (1.1). */
export function canLoadModels(form: ProviderForm, opts: { secretSaved?: boolean } = {}): boolean {
  if (!form.kind || fieldsFor(form.kind).modelInput !== 'select') return false;
  return form.apiKey.trim() !== '' || opts.secretSaved === true;
}

// ---------- removing a provider (BR-PROVIDER-02, BR-PROVIDER-03) ----------
// BR-PROVIDER-02: the last AI provider cannot be removed (QAI needs one to run and create tests).
export function canRemoveProvider(providerCount: number): boolean {
  return providerCount > 1;
}

export interface ProviderModels<P> {
  provider: P;
  models: string[];
}

/**
 * BR-PROVIDER-03: a project whose default model comes only from the removed provider switches to the default model
 * of the first remaining provider, and the user is told. A model that a remaining provider also offers is kept.
 */
export function projectsToSwitch<Proj extends { defaultModel: string }, P extends { defaultModel: string }>(
  projects: Proj[],
  removed: ProviderModels<P>,
  remaining: ProviderModels<P>[],
): { project: Proj; newModel: string }[] {
  const target = remaining[0]?.provider.defaultModel;
  if (!target) return [];
  const removedModels = new Set([removed.provider.defaultModel, ...removed.models]);
  const stillOffered = new Set(remaining.flatMap((r) => [r.provider.defaultModel, ...r.models]));
  return projects
    .filter((p) => removedModels.has(p.defaultModel) && !stillOffered.has(p.defaultModel))
    .map((project) => ({ project, newModel: target }));
}

export const reasoningOptions: { value: CostSavingForm['reasoning']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
