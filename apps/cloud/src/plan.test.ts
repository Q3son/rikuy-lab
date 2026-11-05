import { LIMITES_PLAN, planSimulado } from '@rikuy/ai';
import { describe, expect, it } from 'vitest';
import { crearApp } from './app.ts';
import { crearDepsSimuladas } from './deps.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
const COLEGIO = { 'x-rikuy-colegio': 'colegio-demo' };
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

const app = () => crearApp(crearDepsSimuladas());
function form(...archivos: Array<[Uint8Array, string]>) {
  const f = new FormData();
  for (const [b, mime] of archivos) f.append('archivos', new File([b], 'plan', { type: mime }));
  return f;
}
const subir = (a: ReturnType<typeof app>, cuerpo: FormData, headers: Record<string, string> = COLEGIO) => a.request('/ia/plan/extraer', { method: 'POST', headers, body: cuerpo });

describe('POST /ia/plan/extraer (mock mode)', () => {
  it('reads a PDF into the sample plan mapped to the CNEB, with snippets and no student names', async () => {
    const r = await subir(app(), form([PDF, 'application/pdf']));
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.fuente.simulado).toBe(true);
    expect(j.plan.grado).toBe(2);
    expect(j.plan.unidades[0].items[0]).toMatchObject({ id: 'u1-i1', correspondencia: { estado: 'exacta', id: 'secundaria-2:cyt:c1' }, fuente: { pagina: 1 } });
    expect(j.privacidad.retirados).toBeGreaterThan(0);
    expect(JSON.stringify(j)).not.toContain('Quispe');
  });

  it('accepts several photos', async () => {
    expect((await subir(app(), form([JPG, 'image/jpeg'], [JPG, 'image/jpeg']))).status).toBe(200);
  });

  it('requires the school header', async () => {
    expect((await subir(app(), form([PDF, 'application/pdf']), {})).status).toBe(400);
  });

  it('rejects a request that is not multipart, or has no files', async () => {
    const a = app();
    expect((await a.request('/ia/plan/extraer', { method: 'POST', headers: { ...COLEGIO, 'content-type': 'application/json' }, body: '{}' })).status).toBe(400);
    const r = await subir(a, new FormData());
    expect(r.status).toBe(400);
  });

  it('rejects types outside the whitelist and files whose bytes do not match their type (415)', async () => {
    const a = app();
    expect((await subir(a, form([PDF, 'text/html']))).status).toBe(415);
    const r = await subir(a, form([JPG, 'application/pdf']));
    expect(r.status).toBe(415);
    expect(((await r.json()) as any).error).toBe('contenido_no_coincide');
  });

  it('rejects more than 10 photos', async () => {
    const r = await subir(app(), form(...Array.from({ length: 11 }, () => [JPG, 'image/jpeg'] as [Uint8Array, string])));
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).error).toBe('demasiados');
  });

  it('rejects an oversized upload with 413', async () => {
    const grande = new Uint8Array(LIMITES_PLAN.maxBytesArchivo + 10);
    grande.set(JPG);
    expect((await subir(app(), form([grande, 'image/jpeg']))).status).toBe(413);
    const total = new Uint8Array(LIMITES_PLAN.maxBytesTotal + 1024 * 1024);
    total.set(PDF);
    expect((await subir(app(), form([total, 'application/pdf']))).status).toBe(413);
  });
});

describe('POST /ia/plan/mejorar', () => {
  it('returns suggestions labelled as such', async () => {
    const r = await app().request('/ia/plan/mejorar', { method: 'POST', headers: { ...COLEGIO, 'content-type': 'application/json' }, body: JSON.stringify({ plan: planSimulado() }) });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.mejoras.sugerencia).toBe(true);
    expect(j.mejoras.practicas.some((p: { slug: string }) => p.slug === 'pendulo')).toBe(true);
  });

  it('rejects an invalid plan', async () => {
    const r = await app().request('/ia/plan/mejorar', { method: 'POST', headers: { ...COLEGIO, 'content-type': 'application/json' }, body: JSON.stringify({ plan: { unidades: [] } }) });
    expect(r.status).toBe(400);
  });
});
