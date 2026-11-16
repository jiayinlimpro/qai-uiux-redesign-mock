import { useState, type ReactNode } from 'react';
import { deleteSuite } from '@/data/api';
import type { Suite } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { errorText } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useSuites } from './suitesContext';

/** Suite row menu › Delete suite: only an empty suite (BR-SUITE-02); otherwise "Move or delete its tests first." */
export function useDeleteSuite(): [(suite: Suite, testCount: number) => Promise<void>, ReactNode] {
  const s = useSuites();
  const [confirm, dialog] = useConfirm();
  const [blocked, setBlocked] = useState<Suite | null>(null);

  async function run(suite: Suite, testCount: number) {
    if (testCount > 0) {
      setBlocked(suite);
      return;
    }
    if (!(await confirm({ title: `Delete ${suite.name}?`, danger: true, confirmLabel: 'Delete suite', body: <p>The suite is empty. This can’t be undone.</p> }))) return;
    try {
      await deleteSuite(suite.id);
      s.reload();
      s.showToast({ text: `Deleted ${suite.name}` });
    } catch (e) {
      s.showToast({ text: errorText(e) });
    }
  }

  const element = (
    <>
      {dialog}
      {blocked && (
        <Dialog title={`${blocked.name} can’t be deleted`} size="sm" onClose={() => setBlocked(null)} footer={<Button onClick={() => setBlocked(null)}>OK</Button>}>
          <p>It still has tests. Move or delete its tests first.</p>
        </Dialog>
      )}
    </>
  );
  return [run, element];
}
