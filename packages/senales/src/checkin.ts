/** Voluntary check-in (DESIGN 10.8): the only place where emotions enter, declared by the student. */
import { AutorreporteMomento } from '@rikuy/contracts';
import { CAMPO_TEXTO_DEL_ESTUDIANTE } from './vocabulario.ts';

type Ayuda = NonNullable<AutorreporteMomento['ayuda']>;
type Emocion = AutorreporteMomento['emociones'][number]['emocion'];

/** poco / medio / mucho, mapped onto the contract's 1-5 scale. */
export const INTENSIDAD = { poco: 1, medio: 3, mucho: 5 } as const;
export type NivelIntensidad = keyof typeof INTENSIDAD;

export const TEXTO_CONFIDENCIALIDAD =
  'Lo que compartas queda con tu docente. La confidencialidad no es absoluta: si cuentas que alguien te hace daño o que estás en peligro, tu docente debe avisar al director y a la persona de convivencia (ruta SíseVe), y tú lo sabes desde ahora.';

export interface EntradaCheckIn {
  id: string;
  estudianteId: string;
  claseId: string;
  practicaId?: string;
  pasoId: string;
  hlc: string;
  emociones: { emocion: Emocion; intensidad: NivelIntensidad }[];
  ayuda?: Ayuda;
  texto?: string;
  visibilidad: 'solo_yo' | 'mi_docente';
}

export function construirAutorreporte(e: EntradaCheckIn): AutorreporteMomento {
  return AutorreporteMomento.parse({
    id: e.id,
    estudianteId: e.estudianteId,
    claseId: e.claseId,
    contexto: { ...(e.practicaId ? { practicaId: e.practicaId } : {}), pasoId: e.pasoId },
    emociones: e.emociones.map((x) => ({ emocion: x.emocion, intensidad: INTENSIDAD[x.intensidad] })),
    ...(e.ayuda ? { ayuda: e.ayuda } : {}),
    ...(e.texto ? { texto: e.texto } : {}),
    visibilidad: e.visibilidad,
    hlc: e.hlc,
  });
}

/** What a check-in can end as. Only `respuesta` carries a contract AutorreporteMomento. */
export type ResultadoCheckIn =
  | { tipo: 'respuesta'; autorreporte: AutorreporteMomento }
  | { tipo: 'no_se' }
  | { tipo: 'prefiero_no_decir' }
  | { tipo: 'omitido' };

export interface ControlCheckIn {
  puedeOfrecer(sesion: string, paso: string, ahora: number): boolean;
  registrarOfrecido(sesion: string, paso: string, ahora: number): void;
  registrarResultado(sesion: string, paso: string, r: { tipo: ResultadoCheckIn['tipo'] }): void;
  ventanaAbierta(sesion: string, paso: string, ahora: number): boolean;
  omitido(sesion: string, paso: string): boolean;
  requiereAviso(estudianteId: string): boolean;
  confirmarAviso(estudianteId: string): void;
}

/** At most one check-in per session, never repeated for a skipped step, limited answer window. */
export function crearControlCheckIn(cfg: { ventanaMs: number }): ControlCheckIn {
  const ofrecidos = new Map<string, number>();
  const sesionesOfrecidas = new Set<string>();
  const omitidos = new Set<string>();
  const cerrados = new Set<string>();
  const avisados = new Set<string>();
  const k = (s: string, p: string) => `${s}|${p}`;
  return {
    puedeOfrecer: (s, p) => !sesionesOfrecidas.has(s) && !omitidos.has(k(s, p)),
    registrarOfrecido(s, p, ahora) {
      sesionesOfrecidas.add(s);
      ofrecidos.set(k(s, p), ahora);
    },
    registrarResultado(s, p, r) {
      cerrados.add(k(s, p));
      if (r.tipo === 'omitido') omitidos.add(k(s, p));
    },
    ventanaAbierta(s, p, ahora) {
      const t = ofrecidos.get(k(s, p));
      return t !== undefined && !cerrados.has(k(s, p)) && ahora - t <= cfg.ventanaMs;
    },
    omitido: (s, p) => omitidos.has(k(s, p)),
    requiereAviso: (id) => !avisados.has(id),
    confirmarAviso: (id) => void avisados.add(id),
  };
}

// ---- "Necesito hablar" -------------------------------------------------------

export type DestinoAyuda = 'docente' | 'otro_adulto';

/** Proposed contract (PROPUESTAS_CONTRATOS.md): a request initiated by the student, no justification needed. */
export interface PedidoDeAyuda {
  id: string;
  estudianteId: string;
  claseId: string;
  destino: DestinoAyuda;
  /** The student explicitly says someone is hurting them or they are in danger (SíseVe path). */
  urgente: boolean;
  hlc: string;
}

export function construirPedidoDeAyuda(p: PedidoDeAyuda): PedidoDeAyuda {
  return { ...p };
}

// ---- Teacher view of a shared check-in ----------------------------------------

export interface VistaCheckInDocente {
  estudianteId: string;
  pasoId: string;
  ayudaPedida?: Ayuda;
  /** The student's own words, only when they chose "compartir con mi profe". The only free-text field. */
  textoDelEstudiante?: string;
}

/** Private check-ins return undefined. Emotions and intensities are never copied. */
export function vistaDocenteDeCheckIn(a: AutorreporteMomento): VistaCheckInDocente | undefined {
  if (a.visibilidad !== 'mi_docente') return undefined;
  const vista: VistaCheckInDocente = { estudianteId: a.estudianteId, pasoId: a.contexto.pasoId };
  if (a.ayuda) vista.ayudaPedida = a.ayuda;
  if (a.texto) vista[CAMPO_TEXTO_DEL_ESTUDIANTE] = a.texto;
  return vista;
}
