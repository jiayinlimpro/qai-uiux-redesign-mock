import type { KnowledgeItem, Result, Run, TestCase } from '@/data/types';
import { formatCost, formatTime } from '@/lib/format';
import { browserLabels, modeLabels, scriptLabels } from '@/lib/labels';
import { versionLine } from '@/lib/resultRules';
import { cn } from '@/lib/utils';

const NOT_RECORDED = 'Not recorded';

/**
 * 6.1 › Technical: Script & versions · AI thoughts · Usage (tokens, cost) · Knowledge used · Logs.
 * Evidence the engine didn't write shows "Not recorded" (D58, CLAUDE.md rule 10).
 */
export function TechnicalTab({ result, run, test, knowledge, runs }: { result: Result; run: Run; test: TestCase | null; knowledge: KnowledgeItem[]; runs: Run[] }) {
  const scriptRun = test?.script.fromRunId ? runs.find((r) => r.id === test.script.fromRunId) : undefined;
  const thoughts = result.steps.filter((s) => s.aiThought);
  return (
    <div className="flex flex-col gap-4">
      <Section title="Script and versions">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-text-muted">Mode</dt>
          <dd>{modeLabels[result.mode]}</dd>
          <dt className="text-text-muted">Test version</dt>
          <dd>{versionLine(result.testVersion, test?.version ?? null)}</dd>
          <dt className="text-text-muted">Script now</dt>
          <dd>{test ? `${scriptLabels[test.script.state]}${scriptRun ? ` (from Run #${scriptRun.number})` : ''}` : 'The test was deleted'}</dd>
          <dt className="text-text-muted">Model</dt>
          <dd>{run.model}{run.forceAi ? ' · Force AI on' : ''}</dd>
          <dt className="text-text-muted">Browsers</dt>
          <dd>
            {result.perBrowser.map((b) => browserLabels[b.browser]).join(', ')} · {run.viewport.width}×{run.viewport.height}
          </dd>
          <dt className="text-text-muted">Environment</dt>
          <dd>
            {run.environment.name}
            {run.environment.platforms.filter((a) => a.url).map((a) => ` · ${a.name} ${a.url}`).join('')}
          </dd>
        </dl>
      </Section>

      <Section title="AI thoughts">
        {thoughts.length === 0 ? (
          <p className="text-text-muted">{result.mode === 'script' ? `${NOT_RECORDED} (a script replay runs without AI)` : NOT_RECORDED}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {thoughts.map((s) => (
              <li key={s.index}>
                <span className="font-semibold">Step {s.index}.</span> {s.aiThought}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Usage">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-text-muted">Tokens</dt>
          <dd className={cn(!result.usage && 'text-text-muted')}>
            {result.usage ? `${result.usage.inputTokens.toLocaleString('en')} input · ${result.usage.outputTokens.toLocaleString('en')} output` : NOT_RECORDED}
          </dd>
          <dt className="text-text-muted">Cost</dt>
          <dd>{formatCost(result.cost)}</dd>
        </dl>
      </Section>

      <Section title="Knowledge used">
        {!result.knowledgeUsed ? (
          <p className="text-text-muted">{NOT_RECORDED}</p>
        ) : result.knowledgeUsed.length === 0 ? (
          <p className="text-text-muted">None</p>
        ) : (
          <ul className="ml-4 list-disc">
            {result.knowledgeUsed.map((id) => {
              const k = knowledge.find((x) => x.id === id);
              return <li key={id}>{k ? k.name : 'A knowledge item that was removed since'}</li>;
            })}
          </ul>
        )}
      </Section>

      <Section title="Logs">
        {!result.logs || result.logs.length === 0 ? (
          <p className="text-text-muted">{NOT_RECORDED}</p>
        ) : (
          <ol className="rounded-control border border-border bg-bg p-3 font-mono text-label font-normal">
            {result.logs.map((l, i) => (
              <li key={i} className={cn(l.level === 'error' && 'text-failed-text', l.level === 'warn' && 'text-cc-text')}>
                {formatTime(l.at)} {l.level.toUpperCase()} {l.text}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
