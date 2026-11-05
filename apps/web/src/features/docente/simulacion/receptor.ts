import { Paquete, Evento } from '@rikuy/contracts';
import { z } from 'zod';
import type { CodecQr, CriptoDocente, ProgresoRelevo, ReceptorRelevo, ServiciosDocente } from '../puertos.ts';
import { codificarRk1, ReensambladorRk1 } from './rk1.ts';

const CuerpoEventos = z.object({ eventos: z.array(Evento) });

/** Simulated F2 receiver: real RK1 reassembly, then the envelope is validated against the contracts. */
export function crearReceptorSimulado(claseId: string): ReceptorRelevo {
  const r = new ReensambladorRk1();
  return {
    agregarCuadro(texto): ProgresoRelevo {
      const p = r.agregar(texto);
      if (p.estado === 'invalido') return { estado: 'invalido' };
      if (p.estado === 'parcial') return { estado: 'parcial', recibidos: p.recibidos, total: p.total, faltan: p.faltan };
      if (p.tipo !== 'E') return { estado: 'invalido' };
      const paquete = Paquete.safeParse(p.valor);
      if (!paquete.success || paquete.data.tipo !== 'eventos') return { estado: 'invalido' };
      if (paquete.data.claseId !== claseId) return { estado: 'otra_clase' };
      const cuerpo = CuerpoEventos.safeParse(paquete.data.cuerpo);
      if (!cuerpo.success) return { estado: 'invalido' };
      return { estado: 'completo', emisor: paquete.data.emisor, eventos: cuerpo.data.eventos.filter((e) => e.claseId === claseId) };
    },
  };
}

export const codecSimulado: CodecQr = { codificar: (tipo, valor) => codificarRk1(tipo, valor) };

export const criptoSimulada: CriptoDocente = {
  clavePublica: 'SIMULADA-clave-publica',
  firmar: (texto) => `SIMULADA-${texto.length}`,
};

/** What a group phone shows at the closing: an `eventos` package split into RK1 `E` frames. */
export function marcosDeGrupo(claseId: string, dispositivo: string, eventos: Evento[], creado: string): string[] {
  return codificarRk1('E', { v: 1, tipo: 'eventos', claseId, emisor: dispositivo, creado, cuerpo: { eventos }, firma: 'SIMULADA' });
}

export const serviciosSimulados: ServiciosDocente = {
  crearReceptor: crearReceptorSimulado,
  codec: codecSimulado,
  cripto: criptoSimulada,
  ahora: () => Date.now(),
  azar: () => Math.random(),
};
