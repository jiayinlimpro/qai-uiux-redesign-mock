import type { DependencyList, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '@/app/hooks/useAsync';
import { ErrorState, LoadingState } from './StateViews';

export interface PlaceholderLink {
  label: string;
  to: string;
  state?: unknown;
}

interface PlaceholderScreenProps {
  /** Screen ID from docs/03-navigation.md, e.g. "3.1". */
  screenId: string;
  title: string;
  /** Build slice that replaces this placeholder (docs/11-build-plan.md). */
  slice: number;
  /** Extra facts from the address (selected tab, result…), so navigation can be checked. */
  details?: ReactNode;
  /** Temporary links so every route can be reached before the real screens exist. */
  links?: PlaceholderLink[];
  /** Child route content (e.g. a dialog route placeholder). */
  children?: ReactNode;
}

/** Slice 1 stand-in for a screen. Replaced screen by screen in later slices. */
export function PlaceholderScreen({ screenId, title, slice, details, links, children }: PlaceholderScreenProps) {
  return (
    <div className="p-6">
      <h1 className="text-h1">{title}</h1>
      <p className="mt-1 text-text-muted">
        Screen {screenId} · placeholder, built in Slice {slice}
      </p>
      {details && <div className="mt-3 text-text-muted">{details}</div>}
      {links && links.length > 0 && <PlaceholderLinks links={links} />}
      {children}
    </div>
  );
}

export function PlaceholderLinks({ links, heading = 'Go to (temporary links)' }: { links: PlaceholderLink[]; heading?: string }) {
  return (
    <section className="mt-6 max-w-xl rounded-card border border-dashed border-border bg-surface p-4" aria-label={heading}>
      <h2 className="text-label text-text-muted">{heading}</h2>
      <ul className="mt-2 space-y-1">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} state={l.state} className="rounded-control text-accent underline-offset-2 hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Temporary links built from data (projects, tests, runs, chats), with loading and error states. */
export function AsyncPlaceholderLinks<T>({ load, deps, toLinks, what }: { load: () => Promise<T>; deps: DependencyList; toLinks: (data: T) => PlaceholderLink[]; what: string }) {
  const state = useAsync(load, deps);
  if (state.status === 'loading') return <LoadingState label={`Loading ${what}…`} />;
  if (state.status === 'error') return <ErrorState title={`Couldn't load ${what}`} message={state.error.message} onRetry={state.retry} />;
  return <PlaceholderLinks links={toLinks(state.data)} />;
}

/** Stand-in for a dialog route (1.3 New project, 3.3 Import): shown inside its parent screen. */
export function PlaceholderDialog({ screenId, title, slice, closeTo }: { screenId: string; title: string; slice: number; closeTo: string }) {
  return (
    <section aria-label={title} className="mt-6 max-w-xl rounded-card border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-h2">{title}</h2>
      <p className="mt-1 text-text-muted">
        Dialog {screenId} · placeholder, built in Slice {slice}
      </p>
      <Link to={closeTo} className="mt-4 inline-block rounded-control text-accent hover:underline">
        Close
      </Link>
    </section>
  );
}
