/**
 * Metadata attached to routes (react-router `handle`), read by the project shell
 * for the active sidebar item and the breadcrumb (docs/03-navigation.md).
 */
export type ProjectSection = 'overview' | 'suites' | 'runs' | 'knowledge' | 'project-settings';

export interface RouteHandle {
  /** Sidebar item highlighted and second breadcrumb crumb. */
  section?: ProjectSection;
  /** Fixed last crumb, e.g. "Edit test". Data-dependent crumbs (e.g. "Run #12") use useItemCrumb. */
  crumb?: string;
}

export const sectionLabels: Record<ProjectSection, string> = {
  overview: 'Overview',
  suites: 'Suites',
  runs: 'Runs',
  knowledge: 'Knowledge',
  'project-settings': 'Project settings',
};

/** The deepest route's values win (a child can refine its parent). */
export function resolveHandle(handles: unknown[]): RouteHandle {
  const out: RouteHandle = {};
  for (const h of handles) {
    if (!h || typeof h !== 'object') continue;
    const { section, crumb } = h as RouteHandle;
    if (section) out.section = section;
    if (crumb) out.crumb = crumb;
  }
  return out;
}
