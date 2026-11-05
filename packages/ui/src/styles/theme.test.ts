import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = import.meta.dirname;
const tokensCss = readFileSync(resolve(dir, '../../tokens/tokens.css'), 'utf8');
const themeCss = readFileSync(resolve(dir, 'theme.css'), 'utf8');
const tokensJson = JSON.parse(readFileSync(resolve(dir, '../../tokens/tokens.json'), 'utf8')) as {
  themes: Record<'light' | 'dark' | 'holo', { color: Record<string, string> }>;
};

describe('Luz de Puna theme', () => {
  it('imports the design tokens as the single source of truth', () => {
    expect(themeCss).toMatch(/@import\s+["']\.\.\/\.\.\/tokens\/tokens\.css["']/);
  });

  it('only references --rk-* variables that tokens.css defines', () => {
    const defined = new Set([...tokensCss.matchAll(/(--rk-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = [...themeCss.matchAll(/var\((--rk-[a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(40);
    const missing = used.filter((name) => !defined.has(name));
    expect(missing).toEqual([]);
  });

  it('maps every colour token of the three modes to a Tailwind colour', () => {
    const light = Object.keys(tokensJson.themes.light.color);
    expect(Object.keys(tokensJson.themes.dark.color)).toEqual(light);
    expect(Object.keys(tokensJson.themes.holo.color)).toEqual(light);
    const mapped = new Set([...themeCss.matchAll(/var\(--rk-([a-z0-9-]+)\)/g)].map((m) => m[1]));
    const unmapped = light.filter((name) => !mapped.has(name));
    expect(unmapped).toEqual([]);
  });

  it('scopes hall colours through data-hall custom properties and keeps shadcn aliases', () => {
    expect(themeCss).toContain('--color-hall: var(--hall)');
    expect(themeCss).toContain('--color-background:');
    expect(themeCss).toContain('--color-destructive:');
  });
});
