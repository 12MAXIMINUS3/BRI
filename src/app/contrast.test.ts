import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * WCAG colour contrast for the text/background pairs the site uses, read from
 * the theme tokens in index.css. AA requires 4.5:1 for body text and 3:1 for
 * large text and focus outlines.
 */
const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
const token = (name: string) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match?.[1]) throw new Error(`Missing colour token ${name}`);
  return match[1];
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = ['ink-950', 'ink-900', 'ink-850', 'ink-800'];

// [text, minimum ratio, what it's used for]
const TEXT: [string, number, string][] = [
  ['ivory-50', 4.5, 'headings and main text'],
  ['ivory-200', 4.5, 'body text'],
  ['ivory-300', 4.5, 'secondary text'],
  ['mist-400', 4.5, 'hints and labels'],
  ['mist-500', 4.5, 'placeholders and small print'],
  ['gold-300', 4.5, 'links and active navigation'],
  ['gold-400', 4.5, 'eyebrows and accents'],
  ['gold-500', 3, 'focus outlines and borders that convey state'],
];

describe('colour contrast', () => {
  for (const [text, min, use] of TEXT) {
    it.each(BACKGROUNDS)(`${text} (${use}) on %s meets ${min}:1`, (bg) => {
      expect(contrast(token(text), token(bg))).toBeGreaterThanOrEqual(min);
    });
  }

  it('dark text on gold buttons meets 4.5:1', () => {
    expect(contrast(token('ink-950'), token('gold-500'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ink-950'), token('gold-400'))).toBeGreaterThanOrEqual(4.5);
  });
});
