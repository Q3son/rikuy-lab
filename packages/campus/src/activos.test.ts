/**
 * Gate 5.4 F5: own sprites only, <= 1.5 MB, zero Habbo assets. The world art is procedural (Canvas paths and
 * inline SVG), so the museum content is just JSON; this test keeps it that way.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const CARPETAS = ['content/museo', 'packages/campus/src', 'apps/web/src/features/mundo', 'apps/web/src/features/retos'];
const LIMITE = 1.5 * 1024 * 1024;
/** Habbo furni/avatar naming (Sulake): AulaQuipu's sprites used these ids; none may appear here. */
const HABBO = /habbo|sulake|furni|nft_|xmas_c\d|school_c\d|hh_human|_c2\d_|fest_ltd/i;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : [p];
  });
}

describe('museum assets gate', () => {
  const todos = CARPETAS.flatMap((c) => archivos(join(RAIZ, c)));

  it('keeps every museum asset within the 1.5 MB sprite budget', () => {
    const total = todos.reduce((s, f) => s + statSync(f).size, 0);
    expect(total).toBeLessThan(LIMITE);
  });

  it('ships no bitmap sprites at all (art is procedural)', () => {
    expect(todos.filter((f) => /\.(png|gif|webp|jpe?g|swf)$/i.test(f))).toEqual([]);
  });

  it('contains no Habbo asset names in files or content', () => {
    for (const f of todos) {
      if (f.endsWith('activos.test.ts')) continue;
      expect(f).not.toMatch(HABBO);
      expect(readFileSync(f, 'utf8'), f).not.toMatch(HABBO);
    }
  });
});
