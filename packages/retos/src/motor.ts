/** Challenge engine: validates an answer, advances the group's step, emits `reto.progreso` datos. Pure. */
import { DatosRetoProgreso } from '@rikuy/contracts';
import type { ProgresoReto, RepositorioProgreso, Reto } from './tipos.ts';

const INTENTOS_PARA_PISTA = 2;

/** Parses "6", "2,5" or "1.000" (es-PE: comma decimal, dot thousands). */
export function interpretarNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(limpio)) return null;
  const normal = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio) ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(',', '.');
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function iniciar(reto: Reto, grupoId: string): ProgresoReto {
  return { retoId: reto.id, grupoId, paso: 0, completado: false };
}

export interface ResultadoRespuesta {
  correcto: boolean;
  progreso: ProgresoReto;
  mensaje: string;
  /** Tries on the current step (local to the screen, never stored as a score). */
  intentos: number;
  mostrarPista: boolean;
  evento?: ProgresoReto;
}

export function responder(reto: Reto, progreso: ProgresoReto, respuesta: string, intentosPrevios = 0): ResultadoRespuesta {
  const paso = reto.pasos[progreso.paso];
  if (!paso || progreso.completado) {
    return { correcto: false, progreso, mensaje: 'Este reto ya está resuelto. ¿Pruebas otro?', intentos: 0, mostrarPista: false };
  }
  let correcto: boolean;
  if (paso.tipo === 'numero') {
    const n = interpretarNumero(respuesta);
    correcto = n !== null && Math.abs(n - paso.valor) <= paso.tolerancia;
  } else {
    correcto = respuesta.trim() === String(paso.correcta);
  }
  if (!correcto) {
    const intentos = intentosPrevios + 1;
    return { correcto: false, progreso, mensaje: paso.retro, intentos, mostrarPista: intentos >= INTENTOS_PARA_PISTA };
  }
  const siguiente = progreso.paso + 1;
  const nuevo = DatosRetoProgreso.parse({
    retoId: reto.id,
    grupoId: progreso.grupoId,
    paso: Math.min(siguiente, reto.pasos.length),
    completado: siguiente >= reto.pasos.length,
  });
  return {
    correcto: true,
    progreso: nuevo,
    mensaje: nuevo.completado ? '¡Lo resolvieron en grupo! ¿Qué dato les ayudó más?' : '¡Bien! ¿Cómo lo pensaron? Sigamos.',
    intentos: 0,
    mostrarPista: false,
    evento: nuevo,
  };
}

/** In-memory adapter of the repository port (Dexie adapter by the integrator, F2). */
export class RepositorioProgresoMemoria implements RepositorioProgreso {
  private datos = new Map<string, ProgresoReto>();
  async obtener(retoId: string, grupoId: string): Promise<ProgresoReto | null> {
    return this.datos.get(`${retoId}|${grupoId}`) ?? null;
  }
  async guardar(p: ProgresoReto): Promise<void> {
    this.datos.set(`${p.retoId}|${p.grupoId}`, { ...p });
  }
}
