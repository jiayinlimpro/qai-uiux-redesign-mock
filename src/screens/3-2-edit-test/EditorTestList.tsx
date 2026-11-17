import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import type { Suite, TestCase } from '@/data/types';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { buildSuiteTree } from '@/lib/suiteRules';
import { cn } from '@/lib/utils';

/** 3.2 left pane: the library, compact, with the test being edited highlighted. Links open that test's editor. */
export function EditorTestList({ suites, tests, currentId }: { suites: Suite[]; tests: TestCase[]; currentId?: string }) {
  const project = useProject();
  const tree = buildSuiteTree(suites, tests, () => 'not_run', { search: '', status: 'all' });
  const current = tests.find((t) => t.id === currentId);
  const [open, setOpen] = useState<Set<string>>(new Set([current?.suiteId ?? 'none']));

  return (
    <nav aria-label="Tests" className="relative h-full overflow-auto bg-surface p-3">
      <h2 className="px-2 pb-2 text-label text-text-muted">Suites</h2>
      <ul>
        {tree.map((g) => {
          const key = g.suite?.id ?? 'none';
          const isOpen = open.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                aria-expanded={isOpen}
                className="flex w-full items-center gap-1 rounded-control px-2 py-1 text-left hover:bg-hover"
                onClick={() =>
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              >
                {isOpen ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />}
                <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="truncate font-medium">{g.name}</span>
              </button>
              {isOpen && (
                <ul className="ml-6">
                  {g.tests.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={to.editTest(project.id, t.id)}
                        aria-current={t.id === currentId ? 'page' : undefined}
                        className={cn('flex items-center gap-2 rounded-control px-2 py-1 text-dense', t.id === currentId ? 'bg-accent-soft font-semibold text-accent-soft-text' : 'hover:bg-hover')}
                      >
                        <span className={cn('shrink-0 font-mono text-label font-normal', t.id === currentId ? 'text-accent-soft-text' : 'text-text-muted')}>{t.testId}</span>
                        <span className="truncate">{t.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
