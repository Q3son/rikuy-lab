/**
 * Guardián Level 1 service: consent-gated recording of non-biometric learning events.
 * Pure logic behind ports (clock, consent lookup). No network, no storage, no input listeners.
 */
import { EventoAprendizaje, type ConsentimientoGuardian } from '@rikuy/contracts';
import { evaluarConsentimiento, type PoliticaConsentimiento } from './consentimiento.ts';

export type MotivoNoRegistrado = 'apagado' | 'sin_consentimiento' | 'evento_invalido';
export type ResultadoRegistro = { registrado: true } | { registrado: false; motivo: MotivoNoRegistrado };

export interface OpcionesGuardian {
  reloj: () => number;
  consentimientos: Map<string, ConsentimientoGuardian>;
  integrantesPorGrupo: Map<string, string[]>;
  politica?: PoliticaConsentimiento;
  /** Off until the teacher turns it on (also the kill switch state). */
  encendido?: boolean;
}

export interface Guardian {
  activo(): boolean;
  /** Teacher kill switch: takes effect synchronously and clears raw buffers. */
  interruptorDocente(encendido: boolean): void;
  registrar(evento: unknown): ResultadoRegistro;
  eventosCrudos(): EventoAprendizaje[];
  /** Student/guardian/teacher withdrawal: immediate erasure of what concerns that student. */
  retirar(estudianteId: string): void;
  actualizarConsentimiento(c: ConsentimientoGuardian): void;
}

export function crearGuardian(opts: OpcionesGuardian): Guardian {
  let encendido = opts.encendido ?? true;
  let crudos: EventoAprendizaje[] = [];
  const retirados = new Set<string>();

  const consentido = (estudianteId: string): boolean =>
    !retirados.has(estudianteId) &&
    evaluarConsentimiento(opts.consentimientos.get(estudianteId), { ahora: opts.reloj(), politica: opts.politica }).permitido;

  return {
    activo: () => encendido,
    interruptorDocente(valor) {
      encendido = valor;
      if (!valor) crudos = [];
    },
    registrar(entrada) {
      if (!encendido) return { registrado: false, motivo: 'apagado' };
      const r = EventoAprendizaje.safeParse(entrada);
      if (!r.success) return { registrado: false, motivo: 'evento_invalido' };
      const e = r.data;
      const afectados = e.estudianteIds?.length ? e.estudianteIds : (opts.integrantesPorGrupo.get(e.grupoId) ?? []);
      if (afectados.length === 0 || !afectados.every(consentido)) return { registrado: false, motivo: 'sin_consentimiento' };
      crudos.push(e);
      return { registrado: true };
    },
    eventosCrudos: () => [...crudos],
    retirar(estudianteId) {
      retirados.add(estudianteId);
      const grupos = new Set([...opts.integrantesPorGrupo].filter(([, m]) => m.includes(estudianteId)).map(([g]) => g));
      crudos = crudos.filter((e) => !(e.estudianteIds?.includes(estudianteId) || (!e.estudianteIds?.length && grupos.has(e.grupoId))));
    },
    actualizarConsentimiento(c) {
      opts.consentimientos.set(c.estudianteId, c);
      retirados.delete(c.estudianteId);
    },
  };
}
