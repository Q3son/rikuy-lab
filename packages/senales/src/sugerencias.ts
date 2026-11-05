/**
 * "Acercarse a conversar" suggestions for the responsible teacher (DESIGN 10.9).
 * Pedagogical wording only; at most 3 per week per tutor; a human always decides.
 * Escalations (the student states someone hurts them or they are in danger) are never capped.
 */
import {
  AlertaDocente,
  type AutorreporteMomento,
  type EstadoSenalApoyo,
  type SenalApoyo,
} from '@rikuy/contracts';
import { vistaDocenteDeCheckIn, type PedidoDeAyuda, type VistaCheckInDocente } from './checkin.ts';
import { idDeterminista } from './ids.ts';

export const MAX_SUGERENCIAS_POR_SEMANA = 3;
const LIMA_UTC_MS = 5 * 3600 * 1000;
const DIA_MS = 24 * 3600 * 1000;

/** Monday 00:00 (Lima, UTC-5, no DST) of the week containing `ms`. */
export function inicioDeSemana(ms: number): number {
  const local = ms - LIMA_UTC_MS;
  const dias = Math.floor(local / DIA_MS);
  const dow = (dias + 3) % 7; // 1970-01-01 was a Thursday; 0 = Monday
  return (dias - dow) * DIA_MS + LIMA_UTC_MS;
}

export type OrigenSugerencia = 'pidio_hablar' | 'canales_coinciden' | 'canales_discrepan';
export type EtiquetaDocente = 'ya_converse' | 'no_era_necesario' | 'no_aplica';

export interface SugerenciaAcercamiento {
  id: string;
  claseId: string;
  estudianteId: string;
  origen: OrigenSugerencia;
  sugerencia: 'acercarse_a_conversar';
  visibilidad: 'solo_docente';
  escalarSiseVe: boolean;
  texto: string;
  aviso: string;
  guiaConversacion: string[];
  /** Contract alert; absent when the only reason is the student's own request (no behaviour state to cite). */
  alerta?: AlertaDocente;
  /** Only when the student chose "compartir con mi profe". */
  compartido?: VistaCheckInDocente;
  creadaEn: number;
}

const GUIA = [
  'Empiece con una pregunta abierta sobre la actividad: «¿Qué parte te costó más?».',
  'Escuche sin corregir; ofrezca un ejemplo o una pista solo si la pide.',
  'Converse en un espacio visible para otros adultos.',
  'Usted decide el siguiente paso y lo registra: «ya conversé», «no era necesario» o «no aplica».',
];

const AVISO_NORMAL = 'Es una sugerencia con incertidumbre, no un diagnóstico ni una calificación. Usted decide.';
const AVISO_SISEVE =
  'La confidencialidad no es absoluta. Active la ruta SíseVe con el director y la persona de convivencia, y registre el caso en el Libro de Registro de Incidencias del colegio.';

const FRASE: Record<EstadoSenalApoyo, (paso: string) => string> = {
  atascado_en_habilidad: (p) => `Lleva varios intentos sin avanzar en ${p}.`,
  abuso_de_pistas: (p) => `Pidió pistas seguidas sin intentar en ${p}.`,
  adivinacion_rapida: (p) => `Responde muy rápido y no acierta en ${p}.`,
  evita_ayuda: (p) => `Tiene muchos errores en ${p} y no ha pedido pistas.`,
  inactivo: (p) => `Estuvo un buen rato sin actividad en ${p}.`,
  discrepancia_autorreporte_conducta: (p) => `Lo que cuenta y lo que se ve en ${p} no coinciden.`,
};

const POSITIVAS = new Set(['curiosidad', 'alegria', 'orgullo', 'calma']);
const CONDUCTA: EstadoSenalApoyo[] = ['atascado_en_habilidad', 'abuso_de_pistas', 'adivinacion_rapida', 'evita_ayuda'];

export interface EntradaSugerencias {
  senales: SenalApoyo[];
  pedidos: PedidoDeAyuda[];
  autorreportes: AutorreporteMomento[];
}

export interface ContextoSugerencias {
  ahora: number;
  nombrePaso?: (pasoId: string) => string;
  pasoDeSenal?: (s: SenalApoyo) => string | undefined;
}

export interface ResultadoSugerencias {
  sugerencias: SugerenciaAcercamiento[];
  /** Requests the student addressed to another adult: not routed to the teacher. */
  paraOtroAdulto: number;
}

function alertaDe(claseId: string, estudianteId: string, motivos: EstadoSenalApoyo[], escalar: boolean, ahora: number): AlertaDocente | undefined {
  if (motivos.length === 0) return undefined;
  return AlertaDocente.parse({
    id: idDeterminista('alerta', estudianteId, motivos.join(','), String(Math.floor(ahora / DIA_MS))),
    claseId,
    alcance: { tipo: 'estudiante', estudianteId },
    sugerencia: 'acercarse_a_conversar',
    motivos,
    visibilidad: 'solo_docente',
    decision: { estado: 'pendiente' },
    escalarSiseVe: escalar,
    creadaEn: ahora,
  });
}

export function generarSugerencias(entrada: EntradaSugerencias, ctx: ContextoSugerencias): ResultadoSugerencias {
  const nombre = ctx.nombrePaso ?? ((p: string) => p);
  const citar = (p?: string) => (p ? `«${nombre(p)}»` : 'la actividad');
  const compartidos = entrada.autorreportes.filter((a) => a.visibilidad === 'mi_docente');
  const porEstudiante = new Map<string, SugerenciaAcercamiento>();
  let paraOtroAdulto = 0;

  const poner = (s: SugerenciaAcercamiento) => {
    const previa = porEstudiante.get(s.estudianteId);
    const rango = (x: SugerenciaAcercamiento) => (x.escalarSiseVe ? 0 : { pidio_hablar: 1, canales_coinciden: 2, canales_discrepan: 3 }[x.origen]);
    if (!previa || rango(s) < rango(previa)) porEstudiante.set(s.estudianteId, s);
  };

  const base = (estudianteId: string, claseId: string, origen: OrigenSugerencia, texto: string, motivos: EstadoSenalApoyo[], escalar: boolean) => {
    const compartido = compartidos.filter((c) => c.estudianteId === estudianteId).map(vistaDocenteDeCheckIn).filter((v) => v !== undefined).pop();
    const alerta = alertaDe(claseId, estudianteId, motivos, escalar, ctx.ahora);
    const s: SugerenciaAcercamiento = {
      id: idDeterminista('sugerencia', estudianteId, origen, motivos.join(','), String(Math.floor(ctx.ahora / DIA_MS))),
      claseId,
      estudianteId,
      origen,
      sugerencia: 'acercarse_a_conversar',
      visibilidad: 'solo_docente',
      escalarSiseVe: escalar,
      texto,
      aviso: escalar ? AVISO_SISEVE : AVISO_NORMAL,
      guiaConversacion: GUIA,
      ...(alerta ? { alerta } : {}),
      ...(compartido ? { compartido } : {}),
      creadaEn: ctx.ahora,
    };
    poner(s);
  };

  for (const p of entrada.pedidos) {
    if (p.destino === 'otro_adulto' && !p.urgente) {
      paraOtroAdulto++;
      continue;
    }
    if (p.urgente) {
      base(p.estudianteId, p.claseId, 'pidio_hablar', 'Pidió ayuda y dijo que alguien le hace daño o que está en peligro. Active la ruta SíseVe.', [], true);
    } else {
      base(p.estudianteId, p.claseId, 'pidio_hablar', 'Pidió hablar con usted.', [], false);
    }
  }

  const porSenal = new Map<string, SenalApoyo[]>();
  for (const s of entrada.senales) {
    if (!s.estudianteId) continue;
    porSenal.set(s.estudianteId, [...(porSenal.get(s.estudianteId) ?? []), s]);
  }
  for (const [estudianteId, senales] of porSenal) {
    const paso = (s: SenalApoyo) => ctx.pasoDeSenal?.(s) ?? compartidos.find((c) => c.estudianteId === estudianteId)?.contexto.pasoId;
    const discrepa = senales.find((s) => s.estado === 'discrepancia_autorreporte_conducta');
    if (discrepa) {
      base(estudianteId, discrepa.claseId, 'canales_discrepan', FRASE.discrepancia_autorreporte_conducta(citar(paso(discrepa))), ['discrepancia_autorreporte_conducta'], false);
    }
    const conducta = senales.filter((s) => CONDUCTA.includes(s.estado));
    const propios = compartidos.filter((c) => c.estudianteId === estudianteId);
    const pide = propios.some((c) => c.emociones.some((e) => !POSITIVAS.has(e.emocion)));
    const primera = conducta[0];
    if (primera && pide) {
      const frases = conducta.map((s) => FRASE[s.estado](citar(paso(s))));
      base(estudianteId, primera.claseId, 'canales_coinciden', frases.join(' '), [...new Set(conducta.map((s) => s.estado))], false);
    }
  }

  return { sugerencias: [...porEstudiante.values()], paraOtroAdulto };
}

// ---- weekly planning ---------------------------------------------------------

const PRIORIDAD: Record<OrigenSugerencia, number> = { pidio_hablar: 0, canales_coinciden: 1, canales_discrepan: 2 };

export function planificarSemana(
  candidatas: SugerenciaAcercamiento[],
  opts: { tutorId: string; ahora: number; yaEmitidasEstaSemana: number },
): { emitir: SugerenciaAcercamiento[]; diferidas: SugerenciaAcercamiento[] } {
  const urgentes = candidatas.filter((s) => s.escalarSiseVe);
  const resto = candidatas.filter((s) => !s.escalarSiseVe).sort((a, b) => PRIORIDAD[a.origen] - PRIORIDAD[b.origen]);
  const cupo = Math.max(0, MAX_SUGERENCIAS_POR_SEMANA - opts.yaEmitidasEstaSemana);
  return { emitir: [...urgentes, ...resto.slice(0, cupo)], diferidas: resto.slice(cupo) };
}

// ---- registry (local, per tutor) ---------------------------------------------

export interface RegistroSugerencias {
  registrar(tutorId: string, s: SugerenciaAcercamiento): void;
  emitidasEnSemana(tutorId: string, ahora: number): number;
  pendientes(tutorId: string): SugerenciaAcercamiento[];
  /** Only the teacher decides. The label stays local (pilot validation), never goes to reports. */
  decidir(id: string, etiqueta: EtiquetaDocente, ahora: number): void;
  etiquetaLocal(id: string): EtiquetaDocente | undefined;
}

export function crearRegistroSugerencias(): RegistroSugerencias {
  const porTutor = new Map<string, SugerenciaAcercamiento[]>();
  const etiquetas = new Map<string, EtiquetaDocente>();
  return {
    registrar(tutorId, s) {
      porTutor.set(tutorId, [...(porTutor.get(tutorId) ?? []), s]);
    },
    emitidasEnSemana(tutorId, ahora) {
      const desde = inicioDeSemana(ahora);
      return (porTutor.get(tutorId) ?? []).filter((s) => !s.escalarSiseVe && s.creadaEn >= desde && s.creadaEn < desde + 7 * DIA_MS).length;
    },
    pendientes: (tutorId) => (porTutor.get(tutorId) ?? []).filter((s) => !etiquetas.has(s.id)),
    decidir(id, etiqueta) {
      etiquetas.set(id, etiqueta);
    },
    etiquetaLocal: (id) => etiquetas.get(id),
  };
}
