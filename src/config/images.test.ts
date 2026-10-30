import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE_PHOTOS } from './images';

describe('SITE_PHOTOS', () => {
  it.each(Object.entries(SITE_PHOTOS))('%s points to a file in public/ and has a description', (_key, { src, alt }) => {
    expect(src.startsWith('/')).toBe(true);
    expect(existsSync(join(process.cwd(), 'public', src))).toBe(true);
    expect(alt.trim().length).toBeGreaterThan(3);
  });
});
