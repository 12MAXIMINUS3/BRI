import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';

/**
 * Automated accessibility check (WCAG 2.1 A/AA rules) on every public page.
 * jsdom has no layout engine, so colour contrast is checked separately
 * (see the theme tokens in index.css), not here.
 */
const PAGES: [string, RegExp | string][] = [
  ['/', /crafted around you/i],
  ['/categories', /one standard/i],
  ['/work', 'Our Work'],
  ['/work/walnut-dining-table', 'Walnut dining table'],
  ['/shop', 'Available Products'],
  ['/shop/oak-side-table', 'Oak side table'],
  ['/custom-order', 'Request a Custom Order'],
  ['/about', /about/i],
  ['/contact', 'Get in touch'],
  ['/sign-in', /sign in/i],
  ['/register', /create/i],
  ['/does-not-exist', 'Page not found'],
];

async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    preload: false, // jsdom can't load media; axe would wait on the background video
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: {
      'color-contrast': { enabled: false }, // needs real rendering
      region: { enabled: false }, // the test container isn't the full document
    },
  });
  return result.violations.map((v) => `${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`);
}

describe('accessibility', { timeout: 30_000 }, () => {
  it.each(PAGES)('%s has no detectable violations', async (path, heading) => {
    const { container } = renderRoute(path);
    await screen.findByRole('heading', { level: 1, name: heading });
    expect(await violations(container)).toEqual([]);
  });
});
