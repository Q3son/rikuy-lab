/**
 * Per-device group state of the museum: the customised stone and the halls whose curator question was
 * answered. Kept in memory with a best-effort localStorage copy (a convenience, not a record).
 * The class quipu balance comes from the F10 ledger (`saldoQuipuAula`).
 */
import { type AparienciaPiedra, type NudoAyuda, PIEDRA_INICIAL } from '@rikuy/campus';
import { agregarAsiento, asientosDeAyuda, type AyudaCerrada, crearLibro, idDeterminista, type LibroQuipu, saldoTotalAula } from '@rikuy/quipu';
import { create } from 'zustand';
import { useAyudante } from './ayudante/servicio.ts';
import { grupoActual } from './grupo.ts';

const CLAVE = 'rk-museo-grupo';

interface Guardado {
  piedra: AparienciaPiedra;
  rejas: string[];
}

function leer(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo) as Partial<Guardado>;
      return { piedra: { ...PIEDRA_INICIAL, ...g.piedra }, rejas: Array.isArray(g.rejas) ? g.rejas.filter((x) => typeof x === 'string') : [] };
    }
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return { piedra: PIEDRA_INICIAL, rejas: [] };
}

function escribir(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
  } catch {
    // ignore
  }
}

interface EstadoGrupo extends Guardado {
  guardarPiedra: (p: AparienciaPiedra) => void;
  abrirReja: (salaId: string) => void;
  reiniciar: () => void;
}

export const useEstadoGrupo = create<EstadoGrupo>((set, get) => ({
  ...leer(),
  guardarPiedra: (piedra) => {
    set({ piedra });
    escribir({ piedra, rejas: get().rejas });
  },
  abrirReja: (salaId) => {
    if (get().rejas.includes(salaId)) return;
    const rejas = [...get().rejas, salaId];
    set({ rejas });
    escribir({ piedra: get().piedra, rejas });
  },
  reiniciar: () => set({ piedra: PIEDRA_INICIAL, rejas: [] }),
}));

export const AULA_DEMO = '01JC0000000000000000000A01';
const CLASE_DEMO = '01JC0000000000000000000C01';

/**
 * Class quipu balance from the @rikuy/quipu ledger (F10): each help knot the teacher confirmed becomes
 * the ledger entries of `asientosDeAyuda` (daily cap and weekly repeat rules included).
 */
export function libroQuipuAula(nudos: NudoAyuda[], aulaId = grupoActual().claseId ?? AULA_DEMO): LibroQuipu {
  let libro = crearLibro();
  const historial: AyudaCerrada[] = [];
  for (const n of nudos.filter((x) => x.estado === 'confirmado').sort((a, b) => a.ts - b.ts)) {
    const ayuda: AyudaCerrada = { id: idDeterminista('ayuda', n.id), aulaId, claseId: grupoActual().claseId ?? CLASE_DEMO, ayudanteGrupoId: n.grupoAyudaId, pideGrupoId: n.grupoPideId, conceptoId: n.nodoId, resultado: 'nos_ayudo', juez: 'evaluable', confirmacion: 'docente', ts: n.ts };
    const r = asientosDeAyuda(ayuda, historial, { requiereDocente: true });
    if ('asientos' in r) for (const a of r.asientos) libro = agregarAsiento(libro, a);
    historial.push(ayuda);
  }
  return libro;
}

export function saldoQuipuAula(nudos: NudoAyuda[], aulaId = grupoActual().claseId ?? AULA_DEMO): number {
  return saldoTotalAula(libroQuipuAula(nudos, aulaId), aulaId);
}

export function useNudosAula(): number {
  const nudos = useAyudante((s) => s.estado.nudos);
  return saldoQuipuAula(nudos);
}
