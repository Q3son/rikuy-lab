/**
 * Topic -> 3D hologram scene of the museum. Pure and decoupled from @rikuy/holo (no Three.js here): the caller
 * passes the scene ids that exist (e.g. SCENE_IDS of @rikuy/core), so a new scene is linked as soon as it is registered.
 * Keywords of the item text first (most specific), then the CNEB id of its match.
 */
import { raices } from './mapeo.ts';
import type { CorrespondenciaCneb } from './mapeo.ts';

/** Keyword stems -> scene, most specific first. */
const POR_PALABRA: ReadonlyArray<[string[], string]> = [
  [['lactasa', 'lactosa', 'enzima', 'leche'], 'lactasa'],
  [['vellosidad', 'vellosidades'], 'vellosidad'],
  [['intestino', 'intestinal'], 'intestino'],
  [['hígado', 'hepático'], 'higado'],
  [['digestivo', 'digestión', 'estómago', 'nutrición'], 'digestivo'],
  [['respiración', 'respiratorio', 'respiratoria', 'pulmones', 'oxígeno'], 'respiratorio'],
  [['péndulo', 'oscilación', 'oscilatorio', 'periodo', 'movimiento'], 'pendulo'],
];

/** CNEB desempeño (competency:desempeño of CyT secundaria) -> scene, when the text has no keyword. */
const POR_CNEB: Readonly<Record<string, string>> = {
  'c2:d5': 'pendulo', // movimiento: distancia, tiempo, velocidad
  'c2:d6': 'pendulo', // energía, trabajo y movimiento
  'c2:d7': 'respiratorio', // fotosíntesis y respiración
  'c2:d8': 'digestivo', // estructuras para la nutrición
};

const PALABRAS = POR_PALABRA.map(([ps, escena]) => [new Set(ps.flatMap((p) => [...raices(p)])), escena] as const);

export function escenaParaItem(item: { tipo: string; texto: string; correspondencia: CorrespondenciaCneb }, disponibles: readonly string[]): string | undefined {
  if (item.tipo === 'evidencia' || item.tipo === 'instrumento') return undefined;
  const ok = (e: string | undefined) => (e && disponibles.includes(e) ? e : undefined);
  const r = raices(item.texto);
  for (const [ps, escena] of PALABRAS) if ([...ps].some((p) => r.has(p))) return ok(escena);
  const c = item.correspondencia;
  if (c.nivel === 'secundaria' && c.competencia !== undefined && c.desempeno !== undefined) return ok(POR_CNEB[`c${c.competencia}:d${c.desempeno}`]);
  return undefined;
}
