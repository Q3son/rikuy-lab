import { describe, expect, it } from 'vitest';
import { LIMITES_PLAN, validarArchivosPlan } from './archivos.ts';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('validarArchivosPlan', () => {
  it('accepts one PDF and returns it as base64', () => {
    const r = validarArchivosPlan([{ mime: 'application/pdf', bytes: PDF }]);
    expect(r.ok && r.valor).toEqual([{ mime: 'application/pdf', base64: btoa(String.fromCharCode(...PDF)) }]);
  });

  it('accepts up to 10 photos', () => {
    expect(validarArchivosPlan(Array.from({ length: 10 }, () => ({ mime: 'image/jpeg', bytes: JPG }))).ok).toBe(true);
    const r = validarArchivosPlan(Array.from({ length: 11 }, () => ({ mime: 'image/jpeg', bytes: JPG })));
    expect(!r.ok && r.error.codigo).toBe('demasiados');
  });

  it('rejects an empty upload', () => {
    const r = validarArchivosPlan([]);
    expect(!r.ok && r.error.codigo).toBe('sin_archivos');
  });

  it('rejects types outside the whitelist', () => {
    const r = validarArchivosPlan([{ mime: 'application/msword', bytes: PDF }]);
    expect(!r.ok && r.error.codigo).toBe('tipo_no_permitido');
  });

  it('rejects content that does not match the declared type', () => {
    const r = validarArchivosPlan([{ mime: 'application/pdf', bytes: PNG }]);
    expect(!r.ok && r.error.codigo).toBe('contenido_no_coincide');
  });

  it('rejects mixing a PDF with photos or several PDFs', () => {
    expect(validarArchivosPlan([{ mime: 'application/pdf', bytes: PDF }, { mime: 'image/png', bytes: PNG }]).ok).toBe(false);
    expect(validarArchivosPlan([{ mime: 'application/pdf', bytes: PDF }, { mime: 'application/pdf', bytes: PDF }]).ok).toBe(false);
  });

  it('rejects a file or a total over the size limits', () => {
    const grande = new Uint8Array(LIMITES_PLAN.maxBytesArchivo + 1);
    grande.set(JPG);
    const r = validarArchivosPlan([{ mime: 'image/jpeg', bytes: grande }]);
    expect(!r.ok && r.error.codigo).toBe('demasiado_grande');
    const casi = new Uint8Array(LIMITES_PLAN.maxBytesArchivo);
    casi.set(JPG);
    const t = validarArchivosPlan([casi, casi, casi].map((bytes) => ({ mime: 'image/jpeg', bytes })));
    expect(!t.ok && t.error.codigo).toBe('demasiado_grande');
  });
});
