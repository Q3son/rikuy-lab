/** CSV for Excel: RFC 4180, CRLF, UTF-8 with BOM so accents open correctly. */
import type { ReporteCompetenciasAgregado, CompetenciaAgregada } from './competencias.ts';
import type { Celda } from './suprimir.ts';

export const BOM = '﻿';

function escapar(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Defuse spreadsheet formulas typed into any text.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCsv(filas: (string | number | null | undefined)[][]): string {
  return BOM + filas.map((f) => f.map(escapar).join(',')).join('\r\n') + '\r\n';
}

const texto = (c: Celda): string | number => (c.suprimido ? '<5' : c.valor);

function filasCompetencias(comp: CompetenciaAgregada[], prefijo: (string | number)[] = []): (string | number)[][] {
  return comp.map((c) => [...prefijo, c.competencia, texto(c.total), texto(c.niveles['0']), texto(c.niveles['1']), texto(c.niveles['2']), texto(c.niveles['3']), texto(c.niveles.NO)]);
}

export function csvDeCompetencias(r: ReporteCompetenciasAgregado): string {
  const cab = ['Competencia', 'Grupos', 'Nivel 0', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'No evaluable'];
  if (r.porColegio) {
    return aCsv([
      ['Código modular', 'Semana', ...cab],
      ...r.porColegio.flatMap((c) => c.semanas.flatMap((s) => filasCompetencias(s.competencias, [c.colegioCodigo, s.semana]))),
    ]);
  }
  return aCsv([cab, ...filasCompetencias(r.competencias)]);
}
