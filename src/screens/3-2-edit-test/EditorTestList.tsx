import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
                className="flex w-full items-center gap-1 rounded-control px-2 py-1 text-left hover:bg-bg"
                onClick={() =>
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              >
                {isOpen ? <ChevronDown aria-hidden="true" className="h-4 w-4" /> : <ChevronRight aria-hidden="true" className="h-4 w-4" />}
                <span className="truncate">{g.name}</span>
              </button>
              {isOpen && (
                <ul className="ml-5">
                  {g.tests.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={to.editTest(project.id, t.id)}
                        aria-current={t.id === currentId ? 'page' : undefined}
                        className={cn('flex gap-2 rounded-control px-2 py-1 text-base', t.id === currentId ? 'bg-accent-soft font-semibold text-accent-soft-text' : 'hover:bg-bg')}
                      >
                        <span className="shrink-0 text-text-muted">{t.testId}</span>
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
