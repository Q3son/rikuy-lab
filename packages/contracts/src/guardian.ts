/**
 * Rikuy Guardián: learning-support suite (implemented in @rikuy/senales).
 *
 * - EventoAprendizaje: fine-grained, NON-BIOMETRIC in-app behaviour. Strict objects: any field with
 *   keystroke timing, touch pressure/trajectory, mouse micro-dynamics, camera or voice features is rejected.
 * - AutorreporteMomento: what the student says they feel (their words, their choice of visibility).
 * - SenalApoyo: derived behavioural state, no emotion label, short-lived.
 * - AlertaDocente: teacher-only suggestion to go and talk; a human always decides.
 * - ConsentimientoGuardian: guardian consent (< 14), student assent and the active level.
 *
 * Not part of the synced event log yet: whether and how these travel (and their retention) is a
 * product/privacy decision; adding them to TIPOS_EVENTO later is an additive change.
 */
import { z } from 'zod';
import { FuenteIA, Hlc, Ulid } from './comun.ts';
import { MomentoRespuesta } from './laboratorio.ts';

/** Field names that must never appear on a learning event (checked by tests; strict objects reject them). */
export const CAMPOS_BIOMETRICOS_PROHIBIDOS = [
  'tiemposTeclaMs', 'keystrokeTiming', 'dwellMs', 'flightMs',
  'presionToque', 'touchPressure', 'trayectoriaToque', 'touchTrajectory',
  'mouseDinamica', 'mouseMicroDynamics', 'velocidadPuntero',
  'rostro', 'blendshapes', 'camara', 'voz', 'prosodia', 'audio',
] as const;

// ---- (1) EventoAprendizaje ------------------------------------------------

const baseEvento = {
  id: Ulid,
  claseId: Ulid,
  grupoId: Ulid,
  estudianteIds: z.array(Ulid).max(8).optional(), // only if the group tapped who answered
  practicaId: Ulid.optional(),
  pasoId: z.string().min(1),
  hlc: Hlc,
};

/** Idle time is only ever a coarse bucket, never a precise duration. */
export const DuracionInactividad = z.enum(['lt_30s', '30s_2m', '2m_5m', 'gt_5m']);

export const EventoAprendizaje = z.discriminatedUnion('tipo', [
  z.strictObject({ ...baseEvento, tipo: z.literal('pista_solicitada'), nivel: z.number().int().min(1).max(4) }),
  z.strictObject({ ...baseEvento, tipo: z.literal('intento'), numero: z.number().int().min(1), resultado: z.enum(['correcto', 'incorrecto', 'no_evaluable']) }),
  z.strictObject({ ...baseEvento, tipo: z.literal('respuesta_cambiada'), momento: MomentoRespuesta }),
  z.strictObject({ ...baseEvento, tipo: z.literal('paso_inactivo'), duracion: DuracionInactividad }),
  z.strictObject({ ...baseEvento, tipo: z.literal('respuesta_rapida') }), // step-level flag computed on device; no timings
  z.strictObject({ ...baseEvento, tipo: z.literal('prediccion_enviada') }),
  z.strictObject({ ...baseEvento, tipo: z.literal('medicion_repetida'), medicionId: Ulid }),
  z.strictObject({ ...baseEvento, tipo: z.literal('turno_tutor'), fuente: FuenteIA }),
  z.strictObject({ ...baseEvento, tipo: z.literal('exhibicion_abierta'), exhibicionId: z.string().min(1) }),
  z.strictObject({ ...baseEvento, tipo: z.literal('exhibicion_cerrada'), exhibicionId: z.string().min(1) }),
  z.strictObject({ ...baseEvento, tipo: z.literal('ayuda_solicitada'), a: z.enum(['tutor', 'docente', 'companero']) }),
  z.strictObject({ ...baseEvento, tipo: z.literal('autorreporte_enviado'), autorreporteId: Ulid }),
]);
export type EventoAprendizaje = z.infer<typeof EventoAprendizaje>;
export const TIPOS_EVENTO_APRENDIZAJE = EventoAprendizaje.options.map((o) => o.shape.tipo.value);

// ---- (2) AutorreporteMomento ----------------------------------------------

export const EmocionAutorreporte = z.enum([
  'curiosidad', 'alegria', 'orgullo', 'calma',
  'confusion', 'frustracion', 'aburrimiento', 'preocupacion', 'cansancio', 'tristeza', 'enojo', 'miedo',
]);
export type EmocionAutorreporte = z.infer<typeof EmocionAutorreporte>;

export const AyudaDeseada = z.enum(['pista', 'ejemplo', 'mas_tiempo', 'pausa', 'hablar_con_docente', 'trabajar_con_companero', 'nada']);

export const AutorreporteMomento = z.strictObject({
  id: Ulid,
  estudianteId: Ulid,
  claseId: Ulid,
  contexto: z.strictObject({ practicaId: Ulid.optional(), pasoId: z.string().min(1) }),
  emociones: z
    .array(z.strictObject({ emocion: EmocionAutorreporte, intensidad: z.number().int().min(1).max(5) }))
    .min(1)
    .max(EmocionAutorreporte.options.length)
    .refine((es) => new Set(es.map((e) => e.emocion)).size === es.length, { message: 'each emotion at most once' }),
  ayuda: AyudaDeseada.optional(), // "¿qué te ayudaría ahora?"
  texto: z.string().max(280).optional(), // free text; may contain a disclosure (see AlertaDocente.escalarSiseVe)
  visibilidad: z.enum(['solo_yo', 'mi_docente']),
  hlc: Hlc,
});
export type AutorreporteMomento = z.infer<typeof AutorreporteMomento>;

// ---- (3) SenalApoyo -------------------------------------------------------

export const EstadoSenalApoyo = z.enum([
  'atascado_en_habilidad',
  'adivinacion_rapida',
  'inactivo',
  'abuso_de_pistas',
  'evita_ayuda',
  'discrepancia_autorreporte_conducta',
]);
export type EstadoSenalApoyo = z.infer<typeof EstadoSenalApoyo>;

/** Maximum life of a support signal (short retention). */
export const SENAL_APOYO_TTL_MAX_MS = 30 * 60 * 1000;

export const SenalApoyo = z
  .strictObject({
    id: Ulid,
    claseId: Ulid,
    grupoId: Ulid,
    estudianteId: Ulid.optional(), // only when attribution is known
    estado: EstadoSenalApoyo, // behaviour only; never an emotion label
    relativoALineaBase: z.boolean(), // true if compared with this student's/group's own baseline
    confianza: z.number().min(0).max(1),
    generadoEn: z.number().int().min(0), // ms epoch
    expiraEn: z.number().int().min(0), // ms epoch; discarded after this
    eventoIds: z.array(Ulid).min(1), // the behaviour events that support it
  })
  .refine((s) => s.expiraEn > s.generadoEn && s.expiraEn - s.generadoEn <= SENAL_APOYO_TTL_MAX_MS, {
    path: ['expiraEn'],
    message: `expiraEn must be after generadoEn and within ${SENAL_APOYO_TTL_MAX_MS} ms`,
  });
export type SenalApoyo = z.infer<typeof SenalApoyo>;

// ---- (4) AlertaDocente ----------------------------------------------------

export const AlcanceAlerta = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('clase') }),
  z.strictObject({ tipo: z.literal('grupo'), grupoId: Ulid }),
  z.strictObject({ tipo: z.literal('estudiante'), estudianteId: Ulid }),
]);

/** Closing an alert is always a human (teacher) decision. */
export const DecisionAlerta = z.discriminatedUnion('estado', [
  z.strictObject({ estado: z.literal('pendiente') }),
  z.strictObject({ estado: z.enum(['atendida', 'descartada']), decididoPor: z.literal('docente'), decididoEn: z.number().int().min(0) }),
]);

export const AlertaDocente = z
  .strictObject({
    id: Ulid,
    claseId: Ulid,
    alcance: AlcanceAlerta,
    sugerencia: z.literal('acercarse_a_conversar'),
    motivos: z.array(EstadoSenalApoyo).min(1),
    visibilidad: z.literal('solo_docente'), // never shown to peers
    decision: DecisionAlerta,
    escalarSiseVe: z.boolean(), // disclosure of violence: the teacher follows the SíseVe protocol
    creadaEn: z.number().int().min(0),
  })
  .refine((a) => !a.escalarSiseVe || a.alcance.tipo === 'estudiante', {
    path: ['escalarSiseVe'],
    message: 'a SíseVe escalation concerns one student',
  });
export type AlertaDocente = z.infer<typeof AlertaDocente>;

// ---- (5) ConsentimientoGuardian --------------------------------------------

/** off | level 1 (behaviour only) | level 2 (camera and voice: build flag, off by default, blocked in the EU). */
export const NivelGuardian = z.enum(['apagado', 'nivel1_conducta', 'nivel2_camara_voz']);
export type NivelGuardian = z.infer<typeof NivelGuardian>;
export const NIVEL2_GUARDIAN_POR_DEFECTO = false;

export const ConsentimientoGuardian = z
  .strictObject({
    estudianteId: Ulid,
    menorDe14: z.boolean(),
    consentimientoApoderado: z.boolean(),
    asentimientoEstudiante: z.boolean(),
    nivel: NivelGuardian,
    registradoPor: z.literal('docente'),
    hlc: Hlc,
  })
  .superRefine((c, ctx) => {
    if (c.nivel === 'apagado') return;
    if (!c.asentimientoEstudiante) {
      ctx.addIssue({ code: 'custom', path: ['asentimientoEstudiante'], message: 'an active level needs the student assent' });
    }
    if (c.menorDe14 && !c.consentimientoApoderado) {
      ctx.addIssue({ code: 'custom', path: ['consentimientoApoderado'], message: 'under 14 needs guardian consent' });
    }
  });
export type ConsentimientoGuardian = z.infer<typeof ConsentimientoGuardian>;

/** Deployment context: level 2 needs the build flag (default off) and is never available in the EU. */
export const DespliegueGuardian = z.strictObject({
  flagNivel2: z.boolean().default(NIVEL2_GUARDIAN_POR_DEFECTO),
  regionUE: z.boolean(),
});

export const ConsentimientoGuardianEnDespliegue = z
  .strictObject({ consentimiento: ConsentimientoGuardian, despliegue: DespliegueGuardian })
  .superRefine(({ consentimiento, despliegue }, ctx) => {
    if (consentimiento.nivel !== 'nivel2_camara_voz') return;
    if (!despliegue.flagNivel2) {
      ctx.addIssue({ code: 'custom', path: ['despliegue', 'flagNivel2'], message: 'level 2 requires the build flag' });
    }
    if (despliegue.regionUE) {
      ctx.addIssue({ code: 'custom', path: ['despliegue', 'regionUE'], message: 'level 2 is blocked in EU deployments' });
    }
  });
