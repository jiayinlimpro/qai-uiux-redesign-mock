import {
  canLoadModels,
  canRemoveProvider,
  emptyProviderForm,
  fieldsFor,
  isCostSavingComplete,
  isProviderFormComplete,
  projectsToSwitch,
} from './providers';

describe('canLoadModels (model list needs the API key)', () => {
  const f = { ...emptyProviderForm, kind: 'openai' as const };
  it('waits for the key, or a saved key', () => {
    expect(canLoadModels(f)).toBe(false);
    expect(canLoadModels({ ...f, apiKey: 'sk' })).toBe(true);
    expect(canLoadModels(f, { secretSaved: true })).toBe(true);
  });
  it('never loads for AWS Bedrock (typed model ID)', () => {
    expect(canLoadModels({ ...f, kind: 'aws_bedrock', apiKey: 'x' })).toBe(false);
  });
});

describe('BR-PROVIDER-02 last provider', () => {
  it('cannot be removed', () => {
    expect(canRemoveProvider(1)).toBe(false);
    expect(canRemoveProvider(2)).toBe(true);
  });
});

describe('BR-PROVIDER-03 projects switch to another provider', () => {
  const openai = { provider: { defaultModel: 'gpt-4.1' }, models: ['gpt-4.1', 'gpt-4o'] };
  const anthropic = { provider: { defaultModel: 'claude-sonnet-5-5' }, models: ['claude-sonnet-5-5'] };
  const compat = { provider: { defaultModel: 'llama' }, models: ['gpt-4.1', 'llama'] };
  const projects = [
    { name: 'qc', defaultModel: 'gpt-4.1' },
    { name: 'shop', defaultModel: 'gpt-4o' },
    { name: 'hr', defaultModel: 'claude-sonnet-5-5' },
  ];
  it('switches projects on the removed provider to the first remaining default model', () => {
    expect(projectsToSwitch(projects, openai, [anthropic]).map((x) => [x.project.name, x.newModel])).toEqual([
      ['qc', 'claude-sonnet-5-5'],
      ['shop', 'claude-sonnet-5-5'],
    ]);
  });
  it('keeps a model that another provider still offers', () => {
    expect(projectsToSwitch(projects, openai, [compat, anthropic]).map((x) => x.project.name)).toEqual(['shop']);
  });
});

describe('provider fields (1.1)', () => {
  it('asks for the right fields per provider', () => {
    expect(fieldsFor('openai')).toEqual({ apiKey: true, baseUrl: false, aws: false, modelInput: 'select' });
    expect(fieldsFor('openai_compatible')).toEqual({ apiKey: true, baseUrl: true, aws: false, modelInput: 'select' });
    expect(fieldsFor('aws_bedrock')).toEqual({ apiKey: false, baseUrl: false, aws: true, modelInput: 'text' });
  });
});

describe('isProviderFormComplete (Continue disabled until required fields filled)', () => {
  const openai = { ...emptyProviderForm, kind: 'openai' as const, apiKey: 'sk-1', defaultModel: 'gpt-4.1' };
  it('needs a provider, key and model', () => {
    expect(isProviderFormComplete(emptyProviderForm)).toBe(false);
    expect(isProviderFormComplete(openai)).toBe(true);
    expect(isProviderFormComplete({ ...openai, apiKey: ' ' })).toBe(false);
    expect(isProviderFormComplete({ ...openai, defaultModel: '' })).toBe(false);
  });
  it('needs a base URL for OpenAI-compatible', () => {
    expect(isProviderFormComplete({ ...openai, kind: 'openai_compatible' })).toBe(false);
    expect(isProviderFormComplete({ ...openai, kind: 'openai_compatible', baseUrl: 'http://localhost:8000/v1' })).toBe(true);
  });
  it('needs region and both access keys for AWS Bedrock, not an API key', () => {
    const aws = { ...emptyProviderForm, kind: 'aws_bedrock' as const, region: 'us-east-1', accessKeyId: 'AK', secretAccessKey: 'S', defaultModel: 'm' };
    expect(isProviderFormComplete(aws)).toBe(true);
    expect(isProviderFormComplete({ ...aws, region: '' })).toBe(false);
    expect(isProviderFormComplete({ ...aws, secretAccessKey: '' })).toBe(false);
  });
  it('keeps a saved secret when editing', () => {
    expect(isProviderFormComplete({ ...openai, apiKey: '' }, { secretSaved: true })).toBe(true);
  });
  it('never accepts half of a new AWS key pair, even with saved keys', () => {
    const aws = { ...emptyProviderForm, kind: 'aws_bedrock' as const, region: 'us-east-1', defaultModel: 'm' };
    expect(isProviderFormComplete(aws, { secretSaved: true })).toBe(true);
    expect(isProviderFormComplete({ ...aws, accessKeyId: 'NEW' }, { secretSaved: true })).toBe(false);
    expect(isProviderFormComplete({ ...aws, accessKeyId: 'NEW', secretAccessKey: 'NEW' }, { secretSaved: true })).toBe(true);
  });
});

describe('isCostSavingComplete (Browser Use + Jev)', () => {
  const off = { enabled: false, typeSafeKey: '', typeSafeModel: 'jev-latest', reasoning: 'none' as const };
  it('needs nothing when not ticked', () => expect(isCostSavingComplete(off)).toBe(true));
  it('needs the TypeSafe key and model when ticked', () => {
    expect(isCostSavingComplete({ ...off, enabled: true })).toBe(false);
    expect(isCostSavingComplete({ ...off, enabled: true, typeSafeKey: 'k' })).toBe(true);
    expect(isCostSavingComplete({ ...off, enabled: true }, { keySaved: true })).toBe(true);
    expect(isCostSavingComplete({ ...off, enabled: true, typeSafeKey: 'k', typeSafeModel: '' })).toBe(false);
  });
});
