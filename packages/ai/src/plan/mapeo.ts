/**
 * Deterministic mapping of a teacher's plan to the CNEB (science and technology). No AI here: the model only
 * reads the document; these rules decide which official competency, capacity or desempeño each item is.
 * Exact = the official text contains the item (literal, or ignoring case/accents/punctuation).
 * Approximate = enough shared key words with one official text. Anything else is "sin correspondencia CNEB":
 * an id is never invented (4.4).
 */
import { subconjunto } from '@rikuy/curriculum-cneb';
import { normalizar } from '../texto.ts';
import type { ItemExtraido, PlanExtraido, UnidadExtraida } from './esquemas.ts';

export type Nivel = 'primaria' | 'secundaria';

export interface CompetenciaCurriculo {
  numero: number;
  nombre: string;
  capacidades: string[];
  desempenos: string[];
}
export interface GradoCurriculo {
  nivel: Nivel;
  grado: number;
  competencias: CompetenciaCurriculo[];
}
/** Port over the official curriculum, so the rules can be tested with any subset. */
export interface CurriculoCneb {
  grados(): readonly GradoCurriculo[];
}

export function curriculoCneb(): CurriculoCneb {
  const grados: GradoCurriculo[] = subconjunto.grados.map((g) => ({
    nivel: g.nivel,
    grado: g.grado,
    competencias: g.competencias.map((c) => ({ numero: c.numero, nombre: c.nombre, capacidades: c.capacidades, desempenos: c.desempenos })),
  }));
  return { grados: () => grados };
}

export type EstadoCorrespondencia = 'exacta' | 'aproximada' | 'sin_correspondencia' | 'no_aplica';

export interface CorrespondenciaCneb {
  estado: EstadoCorrespondencia;
  /** 0 to 1: 1 is a literal copy of the official text. */
  puntaje: number;
  /** True only when the item is a verbatim substring of the official text. */
  literal?: boolean;
  id?: string;
  nivel?: Nivel;
  grado?: number;
  competencia?: number;
  capacidad?: number;
  desempeno?: number;
  nombreCompetencia?: string;
  textoOficial?: string;
}

export interface ItemMapeado extends ItemExtraido {
  id: string;
  correspondencia: CorrespondenciaCneb;
  /** Reading confidence times mapping score. */
  confianzaTotal: number;
}
export interface UnidadMapeada extends Omit<UnidadExtraida, 'items'> {
  indice: number;
  items: ItemMapeado[];
}
export interface ResumenMapeo {
  total: number;
  exactas: number;
  aproximadas: number;
  sinCorrespondencia: number;
  noAplica: number;
}
export interface PlanMapeado extends Omit<PlanExtraido, 'unidades'> {
  unidades: UnidadMapeada[];
  resumen: ResumenMapeo;
  avisos: string[];
}

const VACIAS = new Set(['para', 'como', 'entre', 'sobre', 'desde', 'cada', 'esta', 'este', 'estos', 'estas', 'otros', 'otras', 'segun', 'ellos', 'ellas', 'tiene', 'donde', 'cuando', 'hasta', 'tambien', 'aquella', 'aquel', 'base', 'partir', 'traves', 'situaciones', 'ejemplo', 'estudiante']);

/** Crude Spanish stems: words of 4+ letters, first 5 letters, no stop words. */
export function raices(s: string): Set<string> {
  return new Set(
    normalizar(s)
      .split(' ')
      .filter((w) => w.length >= 4 && !VACIAS.has(w))
      .map((w) => w.slice(0, 5)),
  );
}

function interseccion(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}
const dice = (a: Set<string>, b: Set<string>) => (a.size + b.size === 0 ? 0 : (2 * interseccion(a, b)) / (a.size + b.size));
/** How much of `a` is covered by `b`. */
const cobertura = (a: Set<string>, b: Set<string>) => (a.size === 0 ? 0 : interseccion(a, b) / a.size);

const oraciones = (s: string) =>
  s
    .split(/(?<=\.)\s+/)
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

const LONGITUD_MINIMA = 20;
const UMBRAL_DESEMPENO = 0.5;
const UMBRAL_NOMBRE = 0.6;
const UMBRAL_CONTENIDO = 0.5;

interface Alcance {
  nivel: Nivel;
  grado?: number;
}

function gradosDe(cur: CurriculoCneb, a: Alcance): readonly GradoCurriculo[] {
  const delNivel = cur.grados().filter((g) => g.nivel === a.nivel);
  if (a.grado === undefined) return delNivel;
  const exacto = delNivel.filter((g) => g.grado === a.grado);
  return exacto.length > 0 ? exacto : delNivel;
}

const SIN: CorrespondenciaCneb = { estado: 'sin_correspondencia', puntaje: 0 };
const idCompetencia = (g: GradoCurriculo, c: CompetenciaCurriculo) => `${g.nivel}-${g.grado}:cyt:c${c.numero}`;

function base(g: GradoCurriculo, c: CompetenciaCurriculo) {
  return { nivel: g.nivel, grado: g.grado, competencia: c.numero, nombreCompetencia: c.nombre };
}

/** Best match among named texts (competency names, capacities): exact containment first, then Dice. */
function porNombre(texto: string, candidatos: Array<{ texto: string; hacer: (estado: 'exacta' | 'aproximada', puntaje: number, literal: boolean) => CorrespondenciaCneb }>): CorrespondenciaCneb {
  const t = texto.trim();
  const n = normalizar(t);
  for (const c of candidatos) {
    if (c.texto === t || (t.length >= LONGITUD_MINIMA && c.texto.includes(t))) return c.hacer('exacta', 1, true);
    const nc = normalizar(c.texto);
    if (nc === n || (n.length >= LONGITUD_MINIMA && (nc.includes(n) || n.includes(nc)))) return c.hacer('exacta', 0.95, false);
  }
  const r = raices(t);
  let mejor: { puntaje: number; c: (typeof candidatos)[number] } | undefined;
  for (const c of candidatos) {
    const p = dice(r, raices(c.texto));
    if (!mejor || p > mejor.puntaje) mejor = { puntaje: p, c };
  }
  return mejor && mejor.puntaje >= UMBRAL_NOMBRE ? mejor.c.hacer('aproximada', Number(mejor.puntaje.toFixed(2)), false) : SIN;
}

function mapearDesempeno(texto: string, grados: readonly GradoCurriculo[], umbral: number, medida: 'dice' | 'cobertura'): CorrespondenciaCneb {
  const t = texto.trim();
  const n = normalizar(t);
  const todos = grados.flatMap((g) => g.competencias.flatMap((c) => c.desempenos.map((oficial, i) => ({ g, c, i, oficial }))));
  const hacer = (x: (typeof todos)[number], estado: 'exacta' | 'aproximada', puntaje: number, literal: boolean): CorrespondenciaCneb => ({
    estado,
    puntaje,
    literal,
    id: `${idCompetencia(x.g, x.c)}:d${x.i + 1}`,
    ...base(x.g, x.c),
    desempeno: x.i + 1,
    textoOficial: x.oficial,
  });
  if (t.length >= LONGITUD_MINIMA) {
    const literal = todos.find((x) => x.oficial.includes(t));
    if (literal) return hacer(literal, 'exacta', 1, true);
    const normal = todos.find((x) => normalizar(x.oficial).includes(n));
    if (normal) return hacer(normal, 'exacta', 0.95, false);
  }
  const r = raices(t);
  let mejor: { puntaje: number; x: (typeof todos)[number] } | undefined;
  for (const x of todos) {
    for (const parte of [x.oficial, ...oraciones(x.oficial)]) {
      const o = raices(parte);
      const p = medida === 'dice' ? dice(r, o) : interseccion(r, o) >= 2 ? cobertura(r, o) : 0;
      if (!mejor || p > mejor.puntaje) mejor = { puntaje: p, x };
    }
  }
  return mejor && mejor.puntaje >= umbral ? hacer(mejor.x, 'aproximada', Math.min(0.9, Number(mejor.puntaje.toFixed(2))), false) : SIN;
}

/** Maps one extracted item to the CNEB. Pure. */
export function mapearItem(item: ItemExtraido, cur: CurriculoCneb, alcance: Alcance): CorrespondenciaCneb {
  const grados = gradosDe(cur, alcance);
  switch (item.tipo) {
    case 'evidencia':
    case 'instrumento':
      return { estado: 'no_aplica', puntaje: 0 };
    case 'competencia':
      return porNombre(
        item.texto,
        grados.flatMap((g) => g.competencias.map((c) => ({ texto: c.nombre, hacer: (estado, puntaje, literal) => ({ estado, puntaje, literal, id: idCompetencia(g, c), ...base(g, c), textoOficial: c.nombre }) }))),
      );
    case 'capacidad':
      return porNombre(
        item.texto,
        grados.flatMap((g) =>
          g.competencias.flatMap((c) =>
            c.capacidades.map((cap, i) => ({ texto: cap, hacer: (estado, puntaje, literal) => ({ estado, puntaje, literal, id: `${idCompetencia(g, c)}:cap${i + 1}`, ...base(g, c), capacidad: i + 1, textoOficial: cap }) })),
          ),
        ),
      );
    case 'desempeno':
      return mapearDesempeno(item.texto, grados, UMBRAL_DESEMPENO, 'dice');
    case 'contenido':
      return mapearDesempeno(item.texto, grados, UMBRAL_CONTENIDO, 'cobertura');
  }
}

export function resumir(unidades: readonly { items: readonly { correspondencia: CorrespondenciaCneb }[] }[]): ResumenMapeo {
  const r: ResumenMapeo = { total: 0, exactas: 0, aproximadas: 0, sinCorrespondencia: 0, noAplica: 0 };
  for (const u of unidades)
    for (const i of u.items) {
      r.total++;
      if (i.correspondencia.estado === 'exacta') r.exactas++;
      else if (i.correspondencia.estado === 'aproximada') r.aproximadas++;
      else if (i.correspondencia.estado === 'no_aplica') r.noAplica++;
      else r.sinCorrespondencia++;
    }
  return r;
}

/** Maps every item of the plan. Items keep their literal source and page. */
export function mapearPlan(plan: PlanExtraido, cur: CurriculoCneb): PlanMapeado {
  const avisos: string[] = [];
  const nivel = plan.nivel ?? 'secundaria';
  if (!plan.nivel) avisos.push('El documento no indica el nivel: se asumió secundaria.');
  if (plan.grado === undefined) avisos.push('El documento no indica el grado: se buscó en todos los grados del nivel. Revisa cada correspondencia.');
  const alcance: Alcance = { nivel, ...(plan.grado !== undefined ? { grado: plan.grado } : {}) };
  const unidades: UnidadMapeada[] = plan.unidades.map((u, ui) => ({
    ...u,
    indice: ui + 1,
    items: u.items.map((it, ii) => {
      const correspondencia = mapearItem(it, cur, alcance);
      const factor = correspondencia.estado === 'no_aplica' ? 1 : correspondencia.puntaje;
      return { ...it, id: `u${ui + 1}-i${ii + 1}`, correspondencia, confianzaTotal: Number((it.confianza * factor).toFixed(2)) };
    }),
  }));
  return { ...plan, nivel, unidades, resumen: resumir(unidades), avisos };
}
