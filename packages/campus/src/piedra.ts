/**
 * Customisable group stone (FUNCIONES_EXTRA §3.2, function 1; credit: MyLEA, INNOVANI/UNIR). The group
 * names its stone and picks a cord and a frame among cosmetic options unlocked by the CLASS quipu (F10).
 * No hunger, no streaks, nothing to lose. The stone never reacts to Guardián: expressions stay app events.
 */

export interface OpcionCosmetica {
  id: string;
  nombre: string;
  color: string;
  /** Class quipu knots needed to unlock it (collective). */
  nudos: number;
}

export const CORDONES: OpcionCosmetica[] = [
  { id: 'sol', nombre: 'Cordón de sol', color: '#F5B301', nudos: 0 },
  { id: 'grana', nombre: 'Cordón grana', color: '#A8123B', nudos: 3 },
  { id: 'ichu', nombre: 'Cordón ichu', color: '#14592D', nudos: 6 },
  { id: 'laguna', nombre: 'Cordón laguna', color: '#075E6C', nudos: 10 },
];

export const MARCOS: OpcionCosmetica[] = [
  { id: 'tinta', nombre: 'Marco de tinta', color: '#052A31', nudos: 0 },
  { id: 'sol', nombre: 'Marco de sol', color: '#8A5E00', nudos: 4 },
  { id: 'barro', nombre: 'Marco de barro', color: '#6E4A2F', nudos: 8 },
];

export interface AparienciaPiedra {
  nombre: string;
  cordon: string;
  marco: string;
}

export const PIEDRA_INICIAL: AparienciaPiedra = { nombre: 'Rikuy', cordon: 'sol', marco: 'tinta' };

export function opcionesPiedra(nudosAula: number) {
  const marcar = (o: OpcionCosmetica) => ({ ...o, libre: nudosAula >= o.nudos });
  return { cordones: CORDONES.map(marcar), marcos: MARCOS.map(marcar) };
}

/** 2-16 letters (Spanish, Quechua and Aymara apostrophes allowed), spaces; no digits, no links. */
export function validarNombrePiedra(nombre: string): { ok: true; nombre: string } | { ok: false } {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}][\p{L}' ]{1,15}$/u.test(limpio)) return { ok: false };
  return { ok: true, nombre: limpio };
}

export function colorDe(lista: OpcionCosmetica[], id: string): string {
  return (lista.find((o) => o.id === id) ?? lista[0]!).color;
}

export function elegirPiedra(
  p: AparienciaPiedra,
  nudosAula: number,
): { ok: true; piedra: AparienciaPiedra } | { ok: false; error: 'nombre' | 'bloqueado' } {
  const n = validarNombrePiedra(p.nombre);
  if (!n.ok) return { ok: false, error: 'nombre' };
  const cordon = CORDONES.find((c) => c.id === p.cordon);
  const marco = MARCOS.find((m) => m.id === p.marco);
  if (!cordon || !marco || nudosAula < cordon.nudos || nudosAula < marco.nudos) return { ok: false, error: 'bloqueado' };
  return { ok: true, piedra: { nombre: n.nombre, cordon: cordon.id, marco: marco.id } };
}
