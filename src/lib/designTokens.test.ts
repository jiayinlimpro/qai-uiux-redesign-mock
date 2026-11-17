import css from '../index.css?raw';
import { contrastRatio, readTokens } from './contrast';

/**
 * The design tokens meet WCAG 2.2 AA in both themes (CLAUDE.md rule 7, docs/08-design-system.md, D79):
 * text 4.5:1 against every surface it sits on; icons, dots, chart marks, input edges and the focus ring 3:1.
 */
function block(selector: RegExp): Record<string, string> {
  const m = selector.exec(css);
  if (!m) throw new Error(`No CSS block for ${selector}`);
  return readTokens(m[1]!);
}
const light = block(/:root\s*\{([^}]*)\}/);
const dark = block(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/);

const TEXT = 4.5;
const MARK = 3;
/** [foreground, background, minimum] */
const pairs: [string, string, number][] = [
  ...['bg', 'surface', 'surface-muted', 'surface-raised'].flatMap((bg): [string, string, number][] => [
    ['text', bg, TEXT],
    ['text-muted', bg, TEXT],
    ['accent', bg, TEXT], // links
    ['failed-text', bg, TEXT],
    ['cc-text', bg, TEXT],
    ['passed-text', bg, TEXT],
  ]),
  ['accent-contrast', 'accent-fill', TEXT], // primary buttons
  ['accent-contrast', 'accent-fill-hover', TEXT], // primary buttons, hovered
  ['text', 'hover', TEXT], // hovered rows and buttons
  ['text-muted', 'hover', TEXT],
  ['accent', 'hover', TEXT],
  ['accent-soft-text', 'accent-soft', TEXT], // selected rows, active nav, info chips
  ['text', 'accent-soft', TEXT], // other text on a selected row
  ['text-muted', 'accent-soft', TEXT], // IDs on a selected row
  ['accent', 'accent-soft', TEXT], // a link on a selected row
  ['inverse-text', 'inverse', TEXT], // toasts, tooltips
  ['inverse-accent', 'inverse', TEXT], // Undo in a toast
  ['passed-text', 'passed-fill', TEXT],
  ['failed-text', 'failed-fill', TEXT],
  ['cc-text', 'cc-fill', TEXT],
  ['text-muted', 'cc-fill', TEXT], // notes inside a warning banner
  ...['bg', 'surface'].flatMap((bg): [string, string, number][] => [
    ['border-control', bg, MARK],
    ['accent', bg, MARK], // focus ring
    ['passed-dot', bg, MARK],
    ['failed-dot', bg, MARK],
    ['cc-dot', bg, MARK],
    ['notrun', bg, MARK],
    ['chart-passed', bg, MARK],
    ['chart-failed', bg, MARK],
    ['chart-cc', bg, MARK],
  ]),
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme tokens', (_name, tokens) => {
  it.each(pairs)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(tokens[fg], `--${fg} is not defined`).toBeDefined();
    expect(tokens[bg], `--${bg} is not defined`).toBeDefined();
    expect(contrastRatio(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
  });
});

it('the dark theme redefines every token of the light theme', () => {
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  });
});
