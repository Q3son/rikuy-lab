/**
 * What is still simulated in the teacher panel: the ECDSA signature (F2's is async and needs the class
 * keys) and the group phone of the "Simular QR" demo button. Reception and encoding use F2's real RK1.
 */
import type { Evento } from '@rikuy/contracts';
import { encodeFrames } from '@rikuy/sync';
import type { CriptoDocente, ServiciosDocente } from '../puertos.ts';
import { codecRk1, crearReceptorRk1 } from '../relevo/rk1.ts';

export const criptoSimulada: CriptoDocente = {
  clavePublica: 'SIMULADA-clave-publica',
  firmar: (texto) => `SIMULADA-${texto.length}`,
};

/** What a group phone shows at the closing: an `eventos` package split into RK1 `E` frames. */
export function marcosDeGrupo(claseId: string, dispositivo: string, eventos: Evento[], creado: string): string[] {
  return encodeFrames({ v: 1, tipo: 'eventos', claseId, emisor: dispositivo, creado, cuerpo: { eventos }, firma: 'SIMULADA' }).frames;
}

/** Real RK1 reception and encoding (F2); only the signature is simulated. */
export const serviciosSimulados: ServiciosDocente = {
  crearReceptor: crearReceptorRk1,
  codec: codecRk1,
  cripto: criptoSimulada,
  ahora: () => Date.now(),
  azar: () => Math.random(),
};
