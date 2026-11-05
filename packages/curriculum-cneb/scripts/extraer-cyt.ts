/**
 * Reproducible extraction of the CNEB science and technology subset.
 *
 * Usage (from packages/curriculum-cneb):
 *   npm run extraer -- <directorio con primaria.json y secundaria.json>
 *
 * The source is packages/curriculo/data/ in Hecze/supermentes (MIT-style reuse
 * authorised by the team). The output is committed to data/cneb-cyt.json; running
 * this script on the same sources must reproduce it byte for byte.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extraerCyT, serializarSubconjunto, type DocumentoFuente, type EntradaFuente } from '../src/extraccion.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = join(aqui, '..', 'data', 'cneb-cyt.json');
const directorio = process.argv[2];

if (!directorio) {
  console.error('Falta el directorio de fuentes. Uso: npm run extraer -- <directorio con primaria.json y secundaria.json>');
  process.exit(2);
}

const entradas: EntradaFuente[] = ['primaria.json', 'secundaria.json'].map((archivo) => {
  const bytes = readFileSync(join(directorio, archivo));
  const documento = JSON.parse(bytes.toString('utf8')) as DocumentoFuente;
  return { archivo, sha256: createHash('sha256').update(bytes).digest('hex'), documento };
});

const texto = serializarSubconjunto(extraerCyT(entradas));
writeFileSync(salida, texto, 'utf8');

const gzip = gzipSync(Buffer.from(texto, 'utf8')).length;
console.log(`Escrito ${salida}: ${Buffer.byteLength(texto)} bytes, ${gzip} bytes gzip.`);
