import { createContext, useContext } from 'react';
import type { ID, KnowledgeItem, Result, Run, Status, Suite, TestCase } from '@/data/types';
import type { ToastMessage } from '@/components/ui/toast';

export interface SuitesData {
  suites: Suite[];
  tests: TestCase[];
  /** Latest result per test id (BR-STATUS-01); absent = never run. */
  latest: Record<ID, Result>;
  runs: Run[];
  knowledge: KnowledgeItem[];
}

export interface SuitesContextValue extends SuitesData {
  reload: () => void;
  statusOf: (testId: ID) => Status;
  /** Selected test ids (checkboxes). */
  selection: Set<ID>;
  setSelection: (next: Set<ID>) => void;
  /** Rows to highlight briefly (e.g. new copies after Clone). */
  highlight: Set<ID>;
  clone: (testIds: ID[]) => Promise<void>;
  openMove: (testIds: ID[]) => void;
  openRun: (testIds: ID[]) => void;
  showToast: (t: Omit<ToastMessage, 'id'>) => void;
}

export const SuitesContext = createContext<SuitesContextValue | null>(null);

export function useSuites(): SuitesContextValue {
  const v = useContext(SuitesContext);
  if (!v) throw new Error('useSuites must be used inside SuitesScreen');
  return v;
}
