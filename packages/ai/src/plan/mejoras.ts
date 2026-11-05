/**
 * "Mejorar la información": deterministic SUGGESTIONS over a mapped plan. Nothing here changes the plan:
 * the teacher reads them and decides. Missing CNEB competencies of the grade, observable wording of desempeños,
 * Rikuy museum practices that fit each unit and a suggested date for each one.
 */
import type { Practica } from '@rikuy/contracts';
import { PRACTICAS } from '@rikuy/curriculum-cneb';
import { normalizar } from '../texto.ts';
import type { PeriodoUnidad } from './esquemas.ts';
import { raices, type CurriculoCneb, type PlanMapeado } from './mapeo.ts';

export interface PracticaSugerible {
  slug: string;
  practica: Practica;
  /** Topic words of the practice (stems are compared with the unit text). */
  etiquetas: string[];
}

/** Topic words of the bundled practices (content/practicas). */
export const ETIQUETAS_PRACTICAS: Readonly<Record<string, string[]>> = {
  pendulo: ['péndulo', 'oscilación', 'oscilatorio', 'periodo', 'movimiento', 'longitud', 'cuerda', 'tiempo', 'velocidad'],
  lactasa: ['enzimas', 'lactasa', 'lactosa', 'leche', 'digestión', 'nutrición', 'alimentos', 'temperatura'],
  respiratorio: ['respiración', 'respiratoria', 'oxígeno', 'altura', 'pulmones', 'células', 'energía', 'frecuencia'],
};

export function practicasSugeribles(practicas: Readonly<Record<string, Practica>>): PracticaSugerible[] {
  // The bundled museum practices (content/practicas); the teacher still approves the class practice.
  return Object.entries(practicas).map(([slug, practica]) => ({ slug, practica, etiquetas: ETIQUETAS_PRACTICAS[slug] ?? [] }));
}

/** The museum practices bundled with Rikuy, ready to be suggested. */
export const PRACTICAS_SUGERIBLES: readonly PracticaSugerible[] = practicasSugeribles(PRACTICAS);

export interface CompetenciaFaltante {
  competencia: number;
  id: string;
  nombre: string;
  motivo: string;
}
export interface DesempenoObservable {
  itemId: string;
  unidad: number;
  original: string;
  propuesta: string;
  motivo: string;
}
export interface PracticaPropuesta {
  unidad: number;
  tituloUnidad: string;
  slug: string;
  practicaId: string;
  titulo: string;
  puntaje: number;
  motivo: string;
  fechaSugerida: string;
  fechaAproximada: boolean;
}
export interface MejorasPlan {
  /** Always true: these are suggestions, never applied without the teacher. */
  sugerencia: true;
  competenciasFaltantes: CompetenciaFaltante[];
  desempenosObservables: DesempenoObservable[];
  practicas: PracticaPropuesta[];
}

/** Non-observable verbs and the observable verb proposed instead. */
const VERBOS: Record<string, string> = {
  comprende: 'Explica',
  entiende: 'Explica',
  conoce: 'Describe',
  sabe: 'Identifica',
  aprende: 'Aplica',
  valora: 'Argumenta',
  aprecia: 'Argumenta',
  internaliza: 'Explica',
};

/** Observable rewording of a desempeño, or undefined when its first verb is already observable. */
export function verboObservable(texto: string): string | undefined {
  const t = texto.trim();
  const m = /^(\p{L}+)(.*)$/su.exec(t);
  if (!m) return undefined;
  const nuevo = VERBOS[normalizar(m[1]!)];
  return nuevo ? `${nuevo}${m[2]}` : undefined;
}

/** School-year bimesters and trimesters in Peru (approximate, MINEDU calendar shape). */
function periodosEscolares(anio: number) {
  return {
    bimestre: [
      [`${anio}-03-16`, `${anio}-05-15`],
      [`${anio}-05-25`, `${anio}-07-24`],
      [`${anio}-08-10`, `${anio}-10-09`],
      [`${anio}-10-19`, `${anio}-12-18`],
    ],
    trimestre: [
      [`${anio}-03-16`, `${anio}-06-12`],
      [`${anio}-06-22`, `${anio}-09-18`],
      [`${anio}-09-28`, `${anio}-12-18`],
    ],
  } as const;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dia = (s: string) => new Date(`${s}T12:00:00Z`);

function aDiaHabil(d: Date): Date {
  const w = d.getUTCDay();
  const r = new Date(d);
  if (w === 6) r.setUTCDate(r.getUTCDate() - 1);
  if (w === 0) r.setUTCDate(r.getUTCDate() + 1);
  return r;
}
function medio(inicio: string, fin: string): string {
  const a = dia(inicio).getTime();
  const b = dia(fin).getTime();
  return iso(aDiaHabil(new Date(a + Math.floor((b - a) / 2 / 86_400_000) * 86_400_000)));
}

/** A weekday in the middle of the unit: explicit dates first, then its bimester or trimester, then its order. */
export function fechaSugerida(periodo: PeriodoUnidad | undefined, indiceUnidad: number, anio: number): { fecha: string; aproximada: boolean } {
  if (periodo?.inicio && periodo.fin) return { fecha: medio(periodo.inicio, periodo.fin), aproximada: false };
  const p = periodosEscolares(anio);
  const tramo = periodo?.bimestre ? p.bimestre[periodo.bimestre - 1] : periodo?.trimestre ? p.trimestre[periodo.trimestre - 1] : p.bimestre[Math.min(3, Math.max(0, indiceUnidad - 1))];
  return { fecha: medio(tramo![0], tramo![1]), aproximada: true };
}

const UMBRAL_PRACTICA = 0.3;
const MAX_POR_UNIDAD = 2;

export function proponerMejoras(plan: PlanMapeado, cur: CurriculoCneb, practicas: readonly PracticaSugerible[], anio = plan.anio ?? new Date().getFullYear()): MejorasPlan {
  const items = plan.unidades.flatMap((u) => u.items.map((i) => ({ u, i })));

  // 1. Competencies the CNEB expects for the grade that no item maps to.
  const cubiertas = new Set(items.flatMap(({ i }) => (i.correspondencia.competencia !== undefined && i.correspondencia.estado !== 'sin_correspondencia' ? [i.correspondencia.competencia] : [])));
  const grado = cur.grados().find((g) => g.nivel === (plan.nivel ?? 'secundaria') && g.grado === plan.grado);
  const competenciasFaltantes: CompetenciaFaltante[] = (grado?.competencias ?? [])
    .filter((c) => !cubiertas.has(c.numero))
    .map((c) => ({
      competencia: c.numero,
      id: `${grado!.nivel}-${grado!.grado}:cyt:c${c.numero}`,
      nombre: c.nombre,
      motivo: `El CNEB espera esta competencia en ${grado!.grado}.º de ${grado!.nivel}, y ningún elemento de tu plan corresponde a ella.`,
    }));

  // 2. Observable wording.
  const desempenosObservables: DesempenoObservable[] = items.flatMap(({ u, i }) => {
    if (i.tipo !== 'desempeno') return [];
    const propuesta = verboObservable(i.texto);
    return propuesta ? [{ itemId: i.id, unidad: u.indice, original: i.texto, propuesta, motivo: 'Un desempeño se evalúa mejor con un verbo que se pueda observar (explica, describe, mide, compara).' }] : [];
  });

  // 3. Museum practices per unit, with a date.
  const propuestas: PracticaPropuesta[] = [];
  for (const u of plan.unidades) {
    const texto = raices([u.titulo, u.situacionSignificativa ?? '', ...u.items.map((i) => i.texto)].join(' '));
    const refs = new Set(u.items.flatMap((i) => (i.correspondencia.desempeno !== undefined ? [`${i.correspondencia.competencia}:${i.correspondencia.desempeno}`] : [])));
    const puntuadas = practicas
      .map((p) => {
        const coinciden = [...new Set(p.etiquetas.flatMap((e) => [...raices(e)]))].filter((r) => texto.has(r));
        const mismoDesempeno = refs.has(`${p.practica.desempeno.competencia}:${p.practica.desempeno.desempeno}`);
        const puntaje = Math.min(1, (mismoDesempeno ? 0.4 : 0) + 0.15 * coinciden.length);
        return { p, puntaje, coinciden, mismoDesempeno };
      })
      .filter((x) => x.puntaje >= UMBRAL_PRACTICA)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, MAX_POR_UNIDAD);
    const { fecha, aproximada } = fechaSugerida(u.periodo, u.indice, anio);
    for (const x of puntuadas) {
      const motivos = [
        ...(x.mismoDesempeno ? ['trabaja un desempeño de esta unidad'] : []),
        ...(x.coinciden.length ? [`comparte temas con la unidad (${x.coinciden.length})`] : []),
        ...(x.p.practica.desempeno.grado !== plan.grado ? [`es de ${x.p.practica.desempeno.grado}.º y se puede adaptar`] : []),
      ];
      propuestas.push({
        unidad: u.indice,
        tituloUnidad: u.titulo,
        slug: x.p.slug,
        practicaId: x.p.practica.id,
        titulo: x.p.practica.titulo,
        puntaje: Number(x.puntaje.toFixed(2)),
        motivo: `Sugerida porque ${motivos.join(', ')}.`,
        fechaSugerida: fecha,
        fechaAproximada: aproximada,
      });
    }
  }

  return { sugerencia: true, competenciasFaltantes, desempenosObservables, practicas: propuestas };
}
