/**
 * Competency reports (ARQUITECTURA 4.7). Pure: projections in, a report model out.
 * Teacher: per performance, literal quotes, memory and measurements. Director/UGEL: aggregates only,
 * cells under 5 suppressed, no quotes, aliases, group ids or Guardián data.
 */
import type { Evidencia, MemoriaEntrada, Medicion } from '@rikuy/contracts';
import { K_MIN, suprimirFila, type Celda } from './suprimir.ts';

export const esquemaReporteVigente = 1 as const;

export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** Deterministic, non-cryptographic fingerprint of the source ids (reproducibility, not security). */
export function hashFuente(partes: string[]): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (const ch of [...partes].sort().join('|')) {
    const c = ch.charCodeAt(0);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(h1) + hex(h2);
}

// ---- teacher -------------------------------------------------------------------

export type AlcanceDocente = { tipo: 'estudiante'; estudianteId: string } | { tipo: 'grupo'; grupoId: string } | { tipo: 'clase' } | { tipo: 'aula' };

export interface EntradaDocente {
  alcance: AlcanceDocente;
  evidencias: Evidencia[];
  memoria: MemoriaEntrada[];
  mediciones: Medicion[];
  rango: RangoFechas;
  /** Suggested next practice (title), computed by the tutor/curriculum side. */
  siguientePractica?: string;
  versionCneb?: string;
}

export interface DesempenoReporte {
  desempeno: number;
  /** 0-3 guides; 'NO' = not assessable and never a zero. */
  nivel: Evidencia['nivel'];
  citas: string[];
}

export interface ReporteDocente {
  esquemaReporte: typeof esquemaReporteVigente;
  tipo: 'docente';
  alcance: AlcanceDocente;
  rango: RangoFechas;
  versionCneb: string;
  hashFuente: string;
  competencias: { competencia: number; desempenos: DesempenoReporte[]; memoria: string[] }[];
  mediciones: { variable: string; valorIndependiente: number; magnitud: string; valor: number; unidad: string }[];
  siguientePractica?: string;
}

function nivelObservado(evs: Evidencia[]): Evidencia['nivel'] {
  const confirmadas = evs.filter((e) => e.confirmadaPorDocente);
  const base = confirmadas.length > 0 ? confirmadas : evs;
  const numericos = base.map((e) => e.nivel).filter((n): n is 0 | 1 | 2 | 3 => n !== 'NO');
  return numericos.length > 0 ? (Math.max(...numericos) as 0 | 1 | 2 | 3) : 'NO';
}

export function reporteDocente(e: EntradaDocente): ReporteDocente {
  const pasa = (grupoId: string) => e.alcance.tipo !== 'grupo' || e.alcance.grupoId === grupoId;
  const evidencias = e.evidencias.filter((v) => pasa(v.grupoId));
  const memoria = e.memoria.filter((m) => e.alcance.tipo !== 'estudiante' || m.estudianteId === e.alcance.estudianteId);
  const mediciones = e.mediciones.filter((m) => !m.anulada && pasa(m.grupoId));

  const competencias = [...new Set([...evidencias.map((v) => v.desempeno.competencia), ...memoria.map((m) => m.competencia.competencia)])].sort((a, b) => a - b);
  return {
    esquemaReporte: esquemaReporteVigente,
    tipo: 'docente',
    alcance: e.alcance,
    rango: e.rango,
    versionCneb: e.versionCneb ?? 'CNEB-2016',
    hashFuente: hashFuente([...evidencias.map((v) => v.id), ...memoria.map((m) => m.id), ...mediciones.map((m) => m.id)]),
    competencias: competencias.map((c) => {
      const delaC = evidencias.filter((v) => v.desempeno.competencia === c);
      const desempenos = [...new Set(delaC.map((v) => v.desempeno.desempeno))].sort((a, b) => a - b);
      return {
        competencia: c,
        desempenos: desempenos.map((d) => {
          const evs = delaC.filter((v) => v.desempeno.desempeno === d);
          return { desempeno: d, nivel: nivelObservado(evs), citas: [...new Set(evs.filter((v) => v.cita).map((v) => v.cita))] };
        }),
        memoria: memoria.filter((m) => m.competencia.competencia === c).map((m) => m.resumen),
      };
    }),
    mediciones: mediciones.map((m) => ({ variable: m.variable, valorIndependiente: m.valorIndependiente, magnitud: m.magnitud, valor: m.valor, unidad: m.unidad })),
    ...(e.siguientePractica ? { siguientePractica: e.siguientePractica } : {}),
  };
}

// ---- director / UGEL -----------------------------------------------------------

export interface FilaAgregable {
  colegioCodigo: string;
  aulaId: string;
  grupoId: string;
  competencia: number;
  nivel: Evidencia['nivel'];
  /** Monday of the week (ISO date). */
  semana: string;
}

type ClaveNivel = '0' | '1' | '2' | '3' | 'NO';

export interface CompetenciaAgregada {
  competencia: number;
  total: Celda;
  niveles: Record<ClaveNivel, Celda>;
}

export interface ReporteCompetenciasAgregado {
  esquemaReporte: typeof esquemaReporteVigente;
  tipo: 'director' | 'ugel';
  periodo: RangoFechas;
  versionCneb: string;
  hashFuente: string;
  supresionMinima: typeof K_MIN;
  competencias: CompetenciaAgregada[];
  /** UGEL only: by school code (ascending) and week. Never ordered by result. */
  porColegio?: { colegioCodigo: string; semanas: { semana: string; competencias: CompetenciaAgregada[] }[] }[];
}

function agregarCompetencias(filas: FilaAgregable[]): CompetenciaAgregada[] {
  const porCompetencia = new Map<number, Map<string, Evidencia['nivel']>>();
  for (const f of filas) {
    const m = porCompetencia.get(f.competencia) ?? new Map<string, Evidencia['nivel']>();
    const key = `${f.colegioCodigo}|${f.grupoId}`;
    const previo = m.get(key);
    const mejor = (a: Evidencia['nivel'] | undefined, b: Evidencia['nivel']): Evidencia['nivel'] =>
      a === undefined || a === 'NO' ? b : b === 'NO' ? a : (Math.max(a, b) as 0 | 1 | 2 | 3);
    m.set(key, mejor(previo, f.nivel));
    porCompetencia.set(f.competencia, m);
  }
  return [...porCompetencia]
    .sort(([a], [b]) => a - b)
    .map(([competencia, grupos]) => {
      const conteo: Record<ClaveNivel, number> = { '0': 0, '1': 0, '2': 0, '3': 0, NO: 0 };
      for (const n of grupos.values()) conteo[String(n) as ClaveNivel]++;
      const { total, celdas } = suprimirFila(conteo, grupos.size);
      return { competencia, total, niveles: celdas };
    });
}

export function reporteCompetenciasAgregado(e: { destinatario: 'director' | 'ugel'; filas: FilaAgregable[]; periodo: RangoFechas; versionCneb?: string }): ReporteCompetenciasAgregado {
  const base: ReporteCompetenciasAgregado = {
    esquemaReporte: esquemaReporteVigente,
    tipo: e.destinatario,
    periodo: e.periodo,
    versionCneb: e.versionCneb ?? 'CNEB-2016',
    hashFuente: hashFuente(e.filas.map((f) => `${f.colegioCodigo}|${f.grupoId}|${f.competencia}|${f.nivel}|${f.semana}`)),
    supresionMinima: K_MIN,
    competencias: agregarCompetencias(e.filas),
  };
  if (e.destinatario === 'director') return base;
  const colegios = [...new Set(e.filas.map((f) => f.colegioCodigo))].sort();
  return {
    ...base,
    porColegio: colegios.map((colegioCodigo) => {
      const propias = e.filas.filter((f) => f.colegioCodigo === colegioCodigo);
      const semanas = [...new Set(propias.map((f) => f.semana))].sort();
      return { colegioCodigo, semanas: semanas.map((semana) => ({ semana, competencias: agregarCompetencias(propias.filter((f) => f.semana === semana)) })) };
    }),
  };
}

// ---- contract guard for aggregate reports ----------------------------------------

const CLAVES_PROHIBIDAS = /^(cita|citas|alias|apodo|grupoId|grupoIds|estudianteId|estudianteIds|aulaId|nombre|nombres|padron|texto|textoDelEstudiante|autorreporte|emociones)$/i;
const TEXTO_PROHIBIDO =
  /\b[0-9A-HJKMNP-TV-Z]{26}\b|guardi[aá]n|check-?in|acercarse|sugerencia|confus|frustr|aburr|trist|enoj|miedo|preocup|ansio|cansanci|en riesgo|\bE\d{2}\b/i;

/** Returns the list of violations (empty = the report can leave the classroom). */
export function validarReporteAgregado(valor: unknown, ruta = '$'): string[] {
  const problemas: string[] = [];
  if (typeof valor === 'string') {
    if (TEXTO_PROHIBIDO.test(valor)) problemas.push(`${ruta}: forbidden text`);
  } else if (Array.isArray(valor)) {
    valor.forEach((v, i) => problemas.push(...validarReporteAgregado(v, `${ruta}[${i}]`)));
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      if (CLAVES_PROHIBIDAS.test(k)) problemas.push(`${ruta}.${k}: forbidden field`);
      problemas.push(...validarReporteAgregado(v, `${ruta}.${k}`));
    }
  }
  return problemas;
}
