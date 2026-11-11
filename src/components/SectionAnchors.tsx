/** Anchor chips at the top of a long settings-style page (Knowledge, Environments). */
export function SectionAnchors({ label, anchors }: { label: string; anchors: { id: string; label: string }[] }) {
  return (
    <nav aria-label={label} className="mt-3 flex flex-wrap gap-2">
      {anchors.map((a) => (
        <button
          key={a.id}
          type="button"
          className="rounded-pill border border-border bg-surface px-3 py-1 text-label font-normal text-accent hover:bg-accent-soft"
          onClick={() => {
            // Hash routing owns the URL hash, so scroll and move focus instead of using #anchors.
            document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById(`${a.id}-title`)?.focus({ preventScroll: true });
          }}
        >
          {a.label}
        </button>
      ))}
    </nav>
  );
}
