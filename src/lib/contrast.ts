/** WCAG 2.x contrast between two #rrggbb colours (1 to 21). Used to check the design tokens in both themes (D79). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1]!, 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Custom properties declared in one CSS block, e.g. `--text: #1a1d23;` → { text: '#1a1d23' }. */
export function readTokens(cssBlock: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const m of cssBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) tokens[m[1]!] = m[2]!.trim();
  return tokens;
}
