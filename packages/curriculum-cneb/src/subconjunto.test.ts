import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { extraerCyT, serializarSubconjunto, type EntradaFuente, type DocumentoFuente, type SubconjuntoCyT } from './extraccion.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const rutaSubconjunto = join(aqui, '..', 'data', 'cneb-cyt.json');
const texto = readFileSync(rutaSubconjunto, 'utf8');
const subconjunto = JSON.parse(texto) as SubconjuntoCyT;

describe('CNEB science and technology subset (data/cneb-cyt.json)', () => {
  it('weighs at most 150 KB gzip (F9 gate)', () => {
    expect(gzipSync(Buffer.from(texto, 'utf8')).length).toBeLessThanOrEqual(150 * 1024);
  });

  it('covers primary grades 1 to 6 and secondary grades 1 to 5, each with 3 competencies', () => {
    const ids = subconjunto.grados.map((g) => g.id);
    expect(ids).toHaveLength(11);
    expect(ids).toContain('primaria-6');
    expect(ids).toContain('secundaria-5');
    for (const grado of subconjunto.grados) {
      expect(grado.competencias.map((c) => c.numero)).toEqual([1, 2, 3]);
    }
  });

  it('carries no editorial topics and marks the quotes as pending PDF verification', () => {
    expect(texto).not.toContain('"temas"');
    expect(subconjunto.verificacion.estado).toBe('pendiente');
  });

  it('is reproducible from the sources when they are available (CNEB_FUENTE_DIR)', () => {
    const directorio = process.env['CNEB_FUENTE_DIR'];
    if (!directorio) return;
    const entradas: EntradaFuente[] = ['primaria.json', 'secundaria.json'].map((archivo) => {
      const bytes = readFileSync(join(directorio, archivo));
      return { archivo, sha256: createHash('sha256').update(bytes).digest('hex'), documento: JSON.parse(bytes.toString('utf8')) as DocumentoFuente };
    });
    expect(serializarSubconjunto(extraerCyT(entradas))).toBe(texto);
  });
});
