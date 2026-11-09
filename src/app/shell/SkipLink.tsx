/** Keyboard users can jump past the sidebar to the screen content. */
export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        // Hash routing owns the URL hash, so move focus instead of navigating.
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}
      className="sr-only z-50 rounded-control bg-surface px-3 py-2 text-accent focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
    >
      Skip to content
    </a>
  );
}
