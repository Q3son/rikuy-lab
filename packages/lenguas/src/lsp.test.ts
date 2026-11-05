import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { entradasVisibles, validarGlosarioLsp, type GlosarioLsp } from './lsp.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const manifiestoPath = join(aqui, '..', '..', '..', 'content', 'lsp', 'manifiesto.json');
const glosario = JSON.parse(readFileSync(manifiestoPath, 'utf8')) as GlosarioLsp;

const pendiente = (id: string, termino: string) => ({
  id,
  termino,
  video: { estado: 'pendiente' as const, archivo: null, sha256: null, bytes: null, duracionS: null },
});

const validado = (id: string, termino: string) => ({
  id,
  termino,
  video: {
    estado: 'validado' as const,
    archivo: `${id}.mp4`,
    sha256: 'b'.repeat(64),
    bytes: 1_200_000,
    duracionS: 7,
    validadoPor: 'Persona sorda usuaria de LSP y asociación local (revisión por escrito)',
    consentimientoImagenRef: 'consentimientos/lsp-01.pdf',
  },
});

const glosarioDe = (entradas: GlosarioLsp['entradas']): GlosarioLsp => ({
  version: 1,
  lengua: 'lsp',
  validacion: { estado: 'pendiente', nota: 'prueba' },
  entradas,
});

const doce = Array.from({ length: 12 }, (_, i) => pendiente(`t${i + 1}`, `término ${i + 1}`));

describe('shipped LSP glossary (content/lsp/manifiesto.json)', () => {
  it('validates', () => {
    expect(validarGlosarioLsp(glosario)).toEqual([]);
  });

  it('has 12 to 20 terms, every video still a placeholder', () => {
    expect(glosario.entradas.length).toBeGreaterThanOrEqual(12);
    expect(glosario.entradas.length).toBeLessThanOrEqual(20);
    for (const entrada of glosario.entradas) {
      expect(entrada.video.estado, entrada.id).toBe('pendiente');
      expect(entrada.video.archivo, entrada.id).toBeNull();
    }
  });

  it('marks the validation as pending with deaf signers', () => {
    expect(glosario.validacion.estado).toBe('pendiente');
    expect(glosario.validacion.nota).toMatch(/personas sordas/i);
  });

  it('shows students nothing until a video is validated', () => {
    expect(entradasVisibles(glosario, 'alumno')).toEqual([]);
    expect(entradasVisibles(glosario, 'docente')).toHaveLength(glosario.entradas.length);
  });
});

describe('validarGlosarioLsp', () => {
  it('rejects a glossary outside 12 to 20 terms', () => {
    expect(validarGlosarioLsp(glosarioDe(doce.slice(0, 11))).join('\n')).toMatch(/12 y 20/);
    expect(validarGlosarioLsp(glosarioDe(Array.from({ length: 21 }, (_, i) => pendiente(`x${i}`, `t${i}`)))).join('\n')).toMatch(/12 y 20/);
  });

  it('rejects placeholders that already carry a file or a hash', () => {
    const malo = doce.map((e, i) => (i === 0 ? { ...e, video: { ...e.video, archivo: 'inventado.mp4' } } : e));
    expect(validarGlosarioLsp(glosarioDe(malo as never)).join('\n')).toMatch(/pendiente.*archivo/i);
  });

  it('rejects any extra field, such as a sign description (no invented signs)', () => {
    const malo = doce.map((e, i) => (i === 0 ? { ...e, descripcionSena: 'manos arriba' } : e));
    expect(validarGlosarioLsp(glosarioDe(malo as never)).join('\n')).toMatch(/descripcionSena/);
  });

  it('requires a validator, a consent reference and an mp4 under 2.5 MB when validated', () => {
    const sinValidador = { ...validado('a1', 'péndulo'), video: { ...validado('a1', 'péndulo').video, validadoPor: '' } };
    const sinConsentimiento = { ...validado('a2', 'longitud'), video: { ...validado('a2', 'longitud').video, consentimientoImagenRef: '' } };
    const pesado = { ...validado('a3', 'tiempo'), video: { ...validado('a3', 'tiempo').video, bytes: 3_000_000 } };
    const errores = validarGlosarioLsp(glosarioDe([sinValidador, sinConsentimiento, pesado, ...doce.slice(3)] as never)).join('\n');
    expect(errores).toMatch(/validadoPor/);
    expect(errores).toMatch(/consentimientoImagenRef/);
    expect(errores).toMatch(/2,5 MB/);
  });

  it('rejects duplicate ids', () => {
    expect(validarGlosarioLsp(glosarioDe([...doce, pendiente('t1', 'repetido')])).join('\n')).toMatch(/duplicad/i);
  });

  it('shows a validated term to the alumno role only once it is validated', () => {
    const mixto = glosarioDe([validado('v1', 'péndulo'), ...doce.slice(1)]);
    expect(validarGlosarioLsp(mixto)).toEqual([]);
    expect(entradasVisibles(mixto, 'alumno').map((e) => e.id)).toEqual(['v1']);
  });
});
