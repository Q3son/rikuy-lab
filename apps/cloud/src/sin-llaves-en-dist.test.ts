/**
 * Gate (5.4 F7, 2.3.3): no API key and no keyed adapter in the web bundle.
 * Builds apps/web with sentinel secrets in the environment and greps every emitted file.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SECRETOS = {
  GEMINI_API_KEY: 'AIzaSyF7-SENTINEL-gemini-key-0123456789',
  META_API_KEY: 'meta-SENTINEL-key-abcdef0123456789',
  RESEND_API_KEY: 're_SENTINEL_resend_0123456789',
  WHATSAPP_TOKEN: 'EAAG-SENTINEL-whatsapp-token-0123456789',
  SMTP_PASS: 'SENTINEL-smtp-password-0123456789',
  REPORTES_SECRETO: 'SENTINEL-reportes-secret-0123456789',
  UGEL_TOKEN: 'SENTINEL-ugel-token-0123456789',
};
/** Things that only exist in the keyed server code. */
const SOLO_SERVIDOR = ['@google/genai', 'generativelanguage.googleapis.com', 'api.meta.ai', 'graph.facebook.com', 'api.resend.com', 'GEMINI_API_KEY', 'META_API_KEY', 'RESEND_API_KEY', 'WHATSAPP_TOKEN', 'x-hub-signature'];
const PATRONES_DE_LLAVE = [/AIza[0-9A-Za-z_-]{35}/, /\bsk-[A-Za-z0-9]{20,}/, /\bre_[A-Za-z0-9]{20,}/, /Bearer\s+[A-Za-z0-9._-]{24,}/];

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : [p];
  });
}

describe('web bundle has no keys', () => {
  let salida = '';
  beforeAll(() => {
    salida = mkdtempSync(join(tmpdir(), 'rikuy-dist-'));
    execFileSync(process.execPath, [join(raiz, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', salida, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: join(raiz, 'apps/web'),
      env: { ...process.env, ...SECRETOS },
      stdio: 'pipe',
    });
  }, 240_000);
  afterAll(() => rmSync(salida, { recursive: true, force: true }));

  it('emits files and none contains a sentinel secret, a key-shaped string or keyed-server code', () => {
    const lista = archivos(salida).filter((f) => /\.(js|mjs|css|html|json|webmanifest|map|svg|txt)$/.test(f));
    expect(lista.length).toBeGreaterThan(3);
    const hallazgos: string[] = [];
    for (const f of lista) {
      const texto = readFileSync(f, 'utf8');
      for (const [nombre, valor] of Object.entries(SECRETOS)) if (texto.includes(valor)) hallazgos.push(`${nombre} en ${f}`);
      for (const marca of SOLO_SERVIDOR) if (texto.includes(marca)) hallazgos.push(`"${marca}" en ${f}`);
      for (const re of PATRONES_DE_LLAVE) if (re.test(texto)) hallazgos.push(`${re} en ${f}`);
    }
    expect(hallazgos).toEqual([]);
  });

  it('still ships the Creador (so the check is not vacuous)', () => {
    const todo = archivos(salida).filter((f) => f.endsWith('.js')).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(todo).toContain('Creador de prácticas');
  });
});
