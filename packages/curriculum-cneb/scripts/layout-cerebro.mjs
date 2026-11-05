/**
 * Build-time layout for "Mi Cerebro Rikuy" (ARQUITECTURA 3.12). The phone never runs a force
 * simulation: this script runs d3-force once, offline, and writes the coordinates to
 * data/cerebro-layout.json, which the app loads as static data.
 *
 *   node --experimental-strip-types scripts/layout-cerebro.mjs            # regenerate the file
 *   node --experimental-strip-types scripts/layout-cerebro.mjs --comprobar # check it is up to date
 *
 * d3-force is pinned exactly and is a devDependency only. Its initial positions and jiggle
 * are deterministic (phyllotaxis start, fixed LCG), so the same graph gives the same bytes.
 */
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARISTAS, CONCEPTOS } from '../src/conceptos.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = join(aqui, '..', 'data', 'cerebro-layout.json');
const ANCHO = 800;
const ALTO = 800;
const MARGEN = 40;
const PASOS = 400;

export function calcularLayout() {
  const nodos = CONCEPTOS.map((c) => ({ id: c.id, label: c.label, sistema: c.system, nivel: c.level }));
  const enlaces = ARISTAS.map((a) => ({ source: a.desde, target: a.hasta, relacion: a.relacion }));

  const simulacion = forceSimulation(nodos)
    .force('enlace', forceLink(enlaces).id((d) => d.id).distance(70))
    .force('carga', forceManyBody().strength(-220))
    .force('colision', forceCollide(22))
    .force('centro', forceCenter(0, 0))
    .stop();
  simulacion.tick(PASOS);

  // Fit to the viewBox with a margin, keeping the aspect ratio of the cloud.
  const xs = nodos.map((n) => n.x);
  const ys = nodos.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const escala = Math.min((ANCHO - 2 * MARGEN) / (maxX - minX || 1), (ALTO - 2 * MARGEN) / (maxY - minY || 1));
  const redondear = (v) => Math.round(v * 10) / 10;

  const datos = {
    version: 1,
    generadoPor: 'packages/curriculum-cneb/scripts/layout-cerebro.mjs',
    motor: 'd3-force 3.0.0 (build time)',
    ancho: ANCHO,
    alto: ALTO,
    nodos: nodos.map((n) => ({
      id: n.id,
      label: n.label,
      sistema: n.sistema,
      nivel: n.nivel,
      x: redondear(MARGEN + (n.x - minX) * escala + ((ANCHO - 2 * MARGEN) - (maxX - minX) * escala) / 2),
      y: redondear(MARGEN + (n.y - minY) * escala + ((ALTO - 2 * MARGEN) - (maxY - minY) * escala) / 2),
    })),
    aristas: ARISTAS.map((a) => ({ desde: a.desde, hasta: a.hasta, relacion: a.relacion })),
  };
  return `${JSON.stringify(datos, null, 2)}\n`;
}

if (process.argv.includes('--comprobar')) {
  const generado = calcularLayout();
  const actual = readFileSync(salida, 'utf8').split('\r\n').join('\n');
  if (generado !== actual) {
    console.error('data/cerebro-layout.json no coincide con el grafo de conceptos. Regénerelo con este script.');
    process.exit(1);
  }
  console.log('data/cerebro-layout.json coincide con el grafo de conceptos.');
} else {
  writeFileSync(salida, calcularLayout(), 'utf8');
  console.log(`Escrito ${salida}`);
}
