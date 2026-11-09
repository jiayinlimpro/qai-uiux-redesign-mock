import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

/**
 * Runs an async data-layer call and tracks loading / error / ready (CLAUDE.md rule 6).
 * Re-runs when `deps` change or `retry()` is called; ignores answers that arrive after a newer call started.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: DependencyList,
  /** keepPrevious: a re-run (e.g. retry() after a save) keeps showing the last data instead of "loading". */
  opts: { keepPrevious?: boolean } = {},
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((prev) => (opts.keepPrevious && prev.status === 'ready' ? prev : { status: 'loading' }));
    fn().then(
      (data) => current && setState({ status: 'ready', data }),
      (error: unknown) => current && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the dependency list
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
