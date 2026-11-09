import { matchPath } from 'react-router-dom';
import { paths, to } from './routes';

const pathOnly = (url: string) => url.split('?')[0]!;

describe('routes (D26)', () => {
  it('every builder produces a path its pattern matches', () => {
    const cases: [string, string][] = [
      [paths.overview, to.overview('p-1')],
      [paths.projectSettings, to.projectSettings('p-1')],
      [paths.knowledge, to.knowledge('p-1')],
      [paths.suites, to.suites('p-1')],
      [paths.suiteTest, to.suiteTest('p-1', 't-cnt-04', 'history')],
      [paths.importTests, to.importTests('p-1')],
      [paths.newTest, to.newTest('p-1')],
      [paths.editTest, to.editTest('p-1', 't-cnt-04')],
      [paths.explore, to.explore('p-1')],
      [paths.exploreChat, to.exploreChat('p-1', 'chat-1', 2)],
      [paths.runs, to.runs('p-1')],
      [paths.run, to.run('p-1', 'run-12', 'res-12-cnt-04')],
    ];
    for (const [pattern, url] of cases) expect(matchPath(pattern, pathOnly(url))).not.toBeNull();
  });

  it('adds query parameters only when given', () => {
    expect(to.run('p-1', 'run-12')).toBe('/p/p-1/runs/run-12');
    expect(to.run('p-1', 'run-12', 'res-1')).toBe('/p/p-1/runs/run-12?result=res-1');
    expect(to.suiteTest('p-1', 't-1', 'test-data')).toBe('/p/p-1/suites/t-1?tab=test-data');
    expect(to.exploreChat('p-1', 'chat-3', 2)).toBe('/p/p-1/explore/chat-3?message=2');
  });

  it('encodes ids', () => {
    expect(to.overview('a/b')).toBe('/p/a%2Fb');
  });
});
