import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  /** Omitted for the last crumb (the current page). */
  to?: string;
}

/** `project / section / item`; every crumb except the last is a link (docs/03-navigation.md). */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-base">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${i}-${item.label}`}>
              {i > 0 && (
                <li aria-hidden="true" className="text-text-muted">
                  /
                </li>
              )}
              <li className="min-w-0 truncate">
                {last || !item.to ? (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'font-semibold text-text' : 'text-text-muted'}>
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.to} className="rounded-control text-text-muted hover:text-text hover:underline">
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
