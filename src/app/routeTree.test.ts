import { matchRoutes, type RouteObject } from 'react-router-dom';
import { routeTree } from './routeTree';
import { resolveHandle } from './routeHandle';
import { paths, to } from './routes';

function allPaths(routes: RouteObject[]): string[] {
  return routes.flatMap((r) => [...(r.path ? [r.path] : []), ...allPaths(r.children ?? [])]);
}

/** Which element renders last for a URL, and the resolved handle (section + crumb). */
function resolve(url: string) {
  const matches = matchRoutes(routeTree, url.split('?')[0]!);
  if (!matches) return null;
  const leaf = matches[matches.length - 1]!.route;
  return { leafPath: leaf.path ?? '(index)', ...resolveHandle(matches.map((m) => m.route.handle)) };
}

describe('route tree (docs/03-navigation.md)', () => {
  it('wires every path in routes.ts', () => {
    const wired = allPaths(routeTree);
    for (const p of Object.values(paths)) expect(wired).toContain(p);
  });

  it('marks the right sidebar section and crumb for each project screen', () => {
    const P = 'p-qcfixer';
    expect(resolve(to.overview(P))).toMatchObject({ leafPath: '(index)', section: 'overview' });
    expect(resolve(to.suites(P))).toMatchObject({ section: 'suites' });
    expect(resolve(to.suiteTest(P, 't-cnt-04', 'history'))).toMatchObject({ leafPath: paths.suiteTest, section: 'suites' });
    expect(resolve(to.newTest(P))).toMatchObject({ section: 'suites', crumb: 'New test' });
    expect(resolve(to.editTest(P, 't-cnt-04'))).toMatchObject({ section: 'suites', crumb: 'Edit test' });
    expect(resolve(to.runs(P))).toMatchObject({ section: 'runs' });
    expect(resolve(to.run(P, 'run-12', 'res-1'))).toMatchObject({ leafPath: paths.run, section: 'runs' });
    expect(resolve(to.knowledge(P))).toMatchObject({ section: 'knowledge' });
    expect(resolve(to.projectSettings(P))).toMatchObject({ section: 'project-settings' });
  });

  it('opens Import as a dialog over Suites, not as a test called "import"', () => {
    expect(resolve(to.importTests('p-1'))).toMatchObject({ leafPath: paths.importTests, section: 'suites' });
  });

  it('serves AI explore outside the project shell (no sidebar section)', () => {
    const explore = resolve(to.exploreChat('p-1', 'chat-3', 2));
    expect(explore).toMatchObject({ leafPath: paths.exploreChat });
    expect(explore?.section).toBeUndefined();
  });

  it('sends unknown addresses to Not found', () => {
    expect(resolve('/nothing/here')).toMatchObject({ leafPath: '*' });
  });
});

describe('resolveHandle', () => {
  it('lets the deepest route win and ignores routes without a handle', () => {
    expect(resolveHandle([undefined, { section: 'suites' }, { crumb: 'Edit test' }])).toEqual({ section: 'suites', crumb: 'Edit test' });
  });
});
