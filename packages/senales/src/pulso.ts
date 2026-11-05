/**
 * Weekly "pulso del curso": 3 rotating collective items per student (planned missingness),
 * aggregated per item only from 5 responses (ECOSISTEMA 2.14, report P0).
 */
export const MIN_RESPUESTAS = 5;
export const ITEMS_POR_ESTUDIANTE = 3;

export interface ItemPulso {
  id: string;
  texto: string;
}

export const ESCALA_PULSO = [
  { valor: 1, texto: 'Nada de acuerdo' },
  { valor: 2, texto: 'Poco de acuerdo' },
  { valor: 3, texto: 'De acuerdo' },
  { valor: 4, texto: 'Muy de acuerdo' },
] as const;

/** Collective wording ("cuidarnos"), never about one student's state. */
export const BANCO_PULSO: ItemPulso[] = [
  { id: 'p1', texto: 'En mi curso nos cuidamos entre todos.' },
  { id: 'p2', texto: 'Cuando alguien se equivoca, el curso lo ayuda.' },
  { id: 'p3', texto: 'Puedo pedir ayuda en el curso.' },
  { id: 'p4', texto: 'Me siento parte de mi curso.' },
  { id: 'p5', texto: 'En el curso se escuchan todas las opiniones.' },
  { id: 'p6', texto: 'Trabajar en grupo me ayuda a aprender.' },
  { id: 'p7', texto: 'Las actividades se entienden bien.' },
  { id: 'p8', texto: 'En mi curso nos respetamos.' },
  { id: 'p9', texto: 'Tengo con quién conversar en el curso.' },
  { id: 'p10', texto: 'El ritmo de las actividades me deja aprender.' },
];

export interface RespuestaPulso {
  estudianteId: string;
  itemId: string;
  semana: number;
  valor: 1 | 2 | 3 | 4 | 'prefiero_no_decir';
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Deterministic rotation: the items change every week and differ between students. */
export function itemsDelPulso(semana: number, estudianteId: string, n = ITEMS_POR_ESTUDIANTE): ItemPulso[] {
  const inicio = (hash(estudianteId) + semana * n) % BANCO_PULSO.length;
  return Array.from({ length: n }, (_, i) => BANCO_PULSO[(inicio + i) % BANCO_PULSO.length] as ItemPulso);
}

export type CeldaPulso =
  | { itemId: string; suprimido: true }
  | { itemId: string; suprimido: false; n: number; distribucion: Record<1 | 2 | 3 | 4, number>; prefieroNoDecir: number };

/** Per item. Fewer than 5 distinct students answering => suppressed. No student ids in the output. */
export function agregarPulso(respuestas: RespuestaPulso[]): CeldaPulso[] {
  const porItem = new Map<string, Map<string, RespuestaPulso['valor']>>();
  for (const r of respuestas) {
    const m = porItem.get(r.itemId) ?? new Map();
    if (!m.has(r.estudianteId)) m.set(r.estudianteId, r.valor);
    porItem.set(r.itemId, m);
  }
  return [...porItem].map(([itemId, m]): CeldaPulso => {
    const valores = [...m.values()];
    const reales = valores.filter((v): v is 1 | 2 | 3 | 4 => v !== 'prefiero_no_decir');
    if (reales.length < MIN_RESPUESTAS) return { itemId, suprimido: true };
    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const v of reales) distribucion[v]++;
    return { itemId, suprimido: false, n: reales.length, distribucion, prefieroNoDecir: valores.length - reales.length };
  });
}
