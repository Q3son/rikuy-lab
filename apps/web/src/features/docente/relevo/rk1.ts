/**
 * The teacher panel on F2's real RK1 codec (`@rikuy/sync`): frames read in any order are reassembled by
 * `Reassembler`, validated as `PaqueteValidado`, and only `eventos` packages of this class get through.
 * The panel's own packages (the join QR) are encoded with `encodeFrames`.
 */
import { Paquete } from '@rikuy/contracts';
import { encodeFrames, Reassembler } from '@rikuy/sync';
import type { CodecQr, ProgresoRelevo, ReceptorRelevo } from '../puertos.ts';

export function crearReceptorRk1(claseId: string): ReceptorRelevo {
  const r = new Reassembler();
  return {
    agregarCuadro(texto): ProgresoRelevo {
      const p = r.add(texto);
      if (p.status === 'ignored' || p.status === 'error') return { estado: 'invalido' };
      if (p.status === 'progress') return { estado: 'parcial', recibidos: p.have, total: p.n, faltan: p.n - p.have };
      const paquete = p.paquete;
      if (paquete.tipo !== 'eventos') return { estado: 'invalido' };
      if (paquete.claseId !== claseId) return { estado: 'otra_clase' };
      const { eventos } = paquete.cuerpo as { eventos: import('@rikuy/contracts').Evento[] };
      return { estado: 'completo', emisor: paquete.emisor, eventos: eventos.filter((e) => e.claseId === claseId) };
    },
  };
}

/** Encodes a contract package into RK1 frames; anything that is not a package is a programming error. */
export const codecRk1: CodecQr = {
  codificar(tipo, valor) {
    const paquete = Paquete.parse(valor);
    const { frames } = encodeFrames(paquete);
    if (!frames.every((f) => f.startsWith(`RK1:${tipo}:`))) throw new Error(`Package type ${paquete.tipo} does not travel as RK1 ${tipo}`);
    return frames;
  },
};
