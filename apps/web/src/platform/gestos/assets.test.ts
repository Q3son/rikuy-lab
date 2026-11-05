/** Whitelist and hash gate of the bundled MediaPipe assets (1.4, 5.6). */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(import.meta.dirname, '../../../public/mediapipe');
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as {
  tasksVision: string;
  files: Array<{ path: string; sha256: string; bytes: number; source: string }>;
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [relative(DIR, p).replaceAll('\\', '/')];
  });
}

describe('public/mediapipe', () => {
  it('pins the npm version of the wasm loader', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '../../../../../node_modules/@mediapipe/tasks-vision/package.json'), 'utf8'));
    expect(pkg.version).toBe(manifest.tasksVision);
  });

  it('contains only whitelisted files (no face model outside senales/)', () => {
    const allowed = new Set(['manifest.json', 'README.md', ...manifest.files.map((f) => f.path)]);
    for (const p of walk(DIR).filter((p) => !p.startsWith('senales/'))) {
      expect(allowed.has(p), p).toBe(true);
      expect(p).not.toMatch(/face/i);
    }
  });

  // The binaries are git-ignored by the root config (proposal in PROPUESTAS_CONTRATOS.md); they are
  // produced by `node apps/web/scripts/mediapipe-assets.mjs`. When present, they must match.
  it.each(manifest.files.map((f) => [f.path, f] as const))('%s matches its pinned sha256', (_, f) => {
    if (!existsSync(join(DIR, f.path))) return;
    const buf = readFileSync(join(DIR, f.path));
    expect(buf.length).toBe(f.bytes);
    expect(createHash('sha256').update(buf).digest('hex')).toBe(f.sha256);
  });
});
