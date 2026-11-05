/** State machine of the Creador screen: pure, so it is tested without a DOM. */
import type { PropuestaCreador } from '@rikuy/ai';
import type { Paquete, Practica, RecursoExhibicion } from '@rikuy/contracts';
import type { HallazgoUI } from './clienteNube.ts';

export type Fase = 'inicio' | 'generando' | 'propuesta' | 'verificando' | 'aprobada' | 'publicando' | 'publicada';

export interface EstadoCreador {
  fase: Fase;
  propuesta?: PropuestaCreador;
  hallazgos: HallazgoUI[];
  catalogo?: Practica[];
  aviso?: string;
  aprobada?: { practica: Practica; recursos: RecursoExhibicion[] };
  paquete?: Paquete;
  clavePublica?: string;
  publicada?: { id: string; version: number };
}

export const estadoInicial: EstadoCreador = { fase: 'inicio', hallazgos: [] };

export type Accion =
  | { tipo: 'generar' }
  | { tipo: 'propuesta'; propuesta: PropuestaCreador }
  | { tipo: 'rechazada'; hallazgos: HallazgoUI[] }
  | { tipo: 'catalogo'; catalogo: Practica[]; aviso: string }
  | { tipo: 'error'; aviso: string }
  | { tipo: 'editar'; cambio: (p: PropuestaCreador) => PropuestaCreador }
  | { tipo: 'verificar' }
  | { tipo: 'no_aprobada'; hallazgos: HallazgoUI[] }
  | { tipo: 'aprobada'; practica: Practica; recursos: RecursoExhibicion[]; paquete: Paquete; clavePublica: string }
  | { tipo: 'publicar' }
  | { tipo: 'publicada'; id: string; version: number }
  | { tipo: 'reiniciar' };

export function reducir(e: EstadoCreador, a: Accion): EstadoCreador {
  switch (a.tipo) {
    case 'generar':
      return { fase: 'generando', hallazgos: [] };
    case 'propuesta':
      return { fase: 'propuesta', propuesta: a.propuesta, hallazgos: [] };
    case 'rechazada':
      return { fase: 'inicio', hallazgos: a.hallazgos, aviso: 'El borrador no pasó la verificación y no se puede usar.' };
    case 'catalogo':
      return { fase: 'inicio', hallazgos: [], catalogo: a.catalogo, aviso: a.aviso };
    case 'error':
      return { ...e, fase: e.propuesta ? 'propuesta' : 'inicio', aviso: a.aviso };
    case 'editar':
      return e.propuesta ? { ...e, propuesta: a.cambio(e.propuesta), hallazgos: [] } : e;
    case 'verificar':
      return { fase: 'verificando', hallazgos: [], ...(e.propuesta ? { propuesta: e.propuesta } : {}) };
    case 'no_aprobada':
      return { ...e, fase: 'propuesta', hallazgos: a.hallazgos };
    case 'aprobada':
      return { ...e, fase: 'aprobada', hallazgos: [], aprobada: { practica: a.practica, recursos: a.recursos }, paquete: a.paquete, clavePublica: a.clavePublica };
    case 'publicar':
      return { ...e, fase: 'publicando' };
    case 'publicada':
      return { ...e, fase: 'publicada', publicada: { id: a.id, version: a.version } };
    case 'reiniciar':
      return estadoInicial;
  }
}
