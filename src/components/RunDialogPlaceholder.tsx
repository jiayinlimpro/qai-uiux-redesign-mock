import type { TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { plural } from '@/lib/format';

/** Stand-in for 5.1 Run dialog (built in Slice 6): shows what would be run. */
export function RunDialogPlaceholder({ tests, onClose }: { tests: Pick<TestCase, 'id' | 'testId' | 'title'>[]; onClose: () => void }) {
  return (
    <Dialog title={`Run ${plural(tests.length, 'test')}`} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <p className="text-text-muted">Dialog 5.1 · placeholder, built in Slice 6. It will show the mode (AI or Script) and the reason for every test before starting.</p>
      <ul className="mt-3 max-h-64 list-disc overflow-auto pl-5">
        {tests.map((t) => (
          <li key={t.id}>
            {t.testId} {t.title}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
