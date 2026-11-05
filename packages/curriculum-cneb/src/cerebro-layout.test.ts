import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ARISTAS, CONCEPTOS } from './conceptos.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const paquete = join(aqui, '..');
const rutaLayout = join(paquete, 'data', 'cerebro-layout.json');

interface NodoLayout { id: string; label: string; sistema: string; nivel: string; x: number; y: number }
interface Layout { version: 1; ancho: number; alto: number; nodos: NodoLayout[]; aristas: Array<{ desde: string; hasta: string; relacion: string }> }

const layout = JSON.parse(readFileSync(rutaLayout, 'utf8')) as Layout;

describe('precomputed Mi Cerebro layout (data/cerebro-layout.json)', () => {
  it('has one node for every concept and one edge for every relation', () => {
    expect(layout.nodos.map((n) => n.id).sort()).toEqual(CONCEPTOS.map((c) => c.id).sort());
    expect(layout.aristas).toHaveLength(ARISTAS.length);
  });

  it('places every node inside the viewBox with finite coordinates', () => {
    for (const nodo of layout.nodos) {
      expect(Number.isFinite(nodo.x) && Number.isFinite(nodo.y), nodo.id).toBe(true);
      expect(nodo.x, nodo.id).toBeGreaterThanOrEqual(0);
      expect(nodo.x, nodo.id).toBeLessThanOrEqual(layout.ancho);
      expect(nodo.y, nodo.id).toBeGreaterThanOrEqual(0);
      expect(nodo.y, nodo.id).toBeLessThanOrEqual(layout.alto);
    }
  });

  it('keeps nodes apart so labels can be read', () => {
    let minima = Infinity;
    for (let i = 0; i < layout.nodos.length; i++) {
      for (let j = i + 1; j < layout.nodos.length; j++) {
        const a = layout.nodos[i]!;
        const b = layout.nodos[j]!;
        minima = Math.min(minima, Math.hypot(a.x - b.x, a.y - b.y));
      }
    }
    expect(minima).toBeGreaterThan(12);
  });

  it('is small enough to ship to low-end phones (under 16 KB)', () => {
    expect(statSync(rutaLayout).size).toBeLessThan(16 * 1024);
  });

  it('is reproducible: regenerating from the concept graph gives the committed bytes', () => {
    const salida = execFileSync(process.execPath, ['--experimental-strip-types', join(paquete, 'scripts', 'layout-cerebro.mjs'), '--comprobar'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(salida).toMatch(/coincide/);
  });
});
