export type SaveStatus = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/** Small polite live message under a section: "Saved.", errors, hints. Always rendered so screen readers hear changes. */
export function StatusLine({ status }: { status: SaveStatus }) {
  const tone = status?.tone === 'error' ? 'text-failed-text' : status?.tone === 'info' ? 'text-cc-text' : 'text-passed-text';
  return (
    <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-label font-normal ${tone}`}>
      {status?.text ?? ''}
    </p>
  );
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
