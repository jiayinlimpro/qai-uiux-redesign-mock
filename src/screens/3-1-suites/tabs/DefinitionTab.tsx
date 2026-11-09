import { useState } from 'react';
import type { KnowledgeItem, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { errorText } from '@/components/StatusLine';
import { useSuites } from '../suitesContext';
import type { SaveTest } from '../TestDetail';

/** Knowledge that applies to a test through its scope: project-wide, its suite, or the test itself. */
function viaScope(k: KnowledgeItem, test: TestCase): string | null {
  if (k.scope.kind === 'project') return 'project-wide';
  if (k.scope.kind === 'suite' && k.scope.suiteId === test.suiteId) return 'via suite';
  if (k.scope.kind === 'test' && k.scope.testId === test.id) return 'this test';
  return null;
}

/** Definition tab: Preconditions · Steps · Expected result · Expected keywords · Linked knowledge (chips + Link…). */
export function DefinitionTab({ test, save }: { test: TestCase; save: SaveTest }) {
  const s = useSuites();
  const [linking, setLinking] = useState(false);
  const applying = s.knowledge.filter((k) => viaScope(k, test) || test.linkedKnowledge.includes(k.id));

  return (
    <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5">
      <section>
        <h3 className="text-label text-text-muted">Preconditions</h3>
        <p className="mt-1 whitespace-pre-line">{test.preconditions?.trim() || 'None'}</p>
      </section>
      <section>
        <h3 className="text-label text-text-muted">Steps</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          {test.steps.map((step, i) => (
            <li key={i} className="whitespace-pre-line">
              {step}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="text-label text-text-muted">Expected result</h3>
        <p className="mt-1 whitespace-pre-line">{test.expectedResult?.trim() || <span className="text-text-muted">Not given</span>}</p>
      </section>
      {test.expectedKeywords?.trim() && (
        <section>
          <h3 className="text-label text-text-muted">Text that must appear</h3>
          <p className="mt-1 font-mono">{test.expectedKeywords}</p>
        </section>
      )}
      <section>
        <h3 className="text-label text-text-muted">Linked knowledge</h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {applying.map((k) => (
            <Chip key={k.id}>
              {k.name}
              <span className="ml-1 text-text-muted">· {test.linkedKnowledge.includes(k.id) ? 'linked' : viaScope(k, test)}</span>
            </Chip>
          ))}
          {applying.length === 0 && <span className="text-text-muted">None</span>}
          <Button size="sm" onClick={() => setLinking(true)}>
            Link…
          </Button>
        </div>
      </section>
      {linking && <LinkKnowledgeDialog test={test} save={save} onClose={() => setLinking(false)} />}
    </div>
  );
}

/** Link documents and skills to this test. Items that already apply through their scope are shown, not editable here. */
function LinkKnowledgeDialog({ test, save, onClose }: { test: TestCase; save: SaveTest; onClose: () => void }) {
  const s = useSuites();
  const [linked, setLinked] = useState<Set<string>>(new Set(test.linkedKnowledge));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function apply() {
    setSaving(true);
    try {
      const saved = await save((t) => ({ ...t, linkedKnowledge: [...linked] }));
      s.showToast({ text: saved.version !== test.version ? `Linked knowledge saved as v${saved.version}` : 'Linked knowledge saved' });
      onClose();
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="Link knowledge"
      onClose={onClose}
      onSubmit={() => void apply()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      {s.knowledge.length === 0 ? (
        <p className="text-text-muted">This project has no documents or skills yet. Add them in Knowledge.</p>
      ) : (
        <fieldset>
          <legend className="mb-2 text-text-muted">Linking a document or skill makes the AI use it for this test. Saving creates a new version (no script reset).</legend>
          <ul className="space-y-2">
            {s.knowledge.map((k) => {
              const scope = viaScope(k, test);
              return (
                <li key={k.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={Boolean(scope) || linked.has(k.id)}
                      disabled={Boolean(scope)}
                      onChange={(e) =>
                        setLinked((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(k.id);
                          else next.delete(k.id);
                          return next;
                        })
                      }
                    />
                    <span>{k.name}</span>
                    <span className="text-label font-normal text-text-muted">
                      {k.kind === 'document' ? 'Document' : 'Skill'}
                      {scope ? ` · applies ${scope === 'this test' ? 'to this test' : scope} (set in Knowledge)` : ''}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="mt-3 text-failed-text">
          {error}
        </p>
      )}
    </Dialog>
  );
}
