/** Fixtures for Rikuy Guardián contracts (src/guardian.ts). */
import { hlcs, ids } from './ids.ts';
import type { CasoInvalido } from './ids.ts';

const base = { claseId: ids.clase, grupoId: ids.grupo1, practicaId: ids.practica, pasoId: 'medir', hlc: hlcs.h2 };
/** ULID for learning event n: '01JC' + 18 zeros + 'EA' + 2 digits = 26 chars. */
const ev = (n: number) => `01JC${'0'.repeat(18)}EA${String(n).padStart(2, '0')}`;

export const eventosAprendizaje = [
  { ...base, id: ev(1), tipo: 'pista_solicitada', estudianteIds: [ids.estudiante1], nivel: 2 },
  { ...base, id: ev(2), tipo: 'intento', numero: 2, resultado: 'incorrecto' },
  { ...base, id: ev(3), tipo: 'respuesta_cambiada', momento: 'prediccion' },
  { ...base, id: ev(4), tipo: 'paso_inactivo', duracion: '2m_5m' },
  { ...base, id: ev(5), tipo: 'respuesta_rapida' },
  { ...base, id: ev(6), tipo: 'prediccion_enviada' },
  { ...base, id: ev(7), tipo: 'medicion_repetida', medicionId: ids.medicion },
  { ...base, id: ev(8), tipo: 'turno_tutor', fuente: 'reglas' },
  { ...base, id: ev(9), tipo: 'exhibicion_abierta', exhibicionId: 'exh-pendulo' },
  { ...base, id: ev(10), tipo: 'exhibicion_cerrada', exhibicionId: 'exh-pendulo' },
  { ...base, id: ev(11), tipo: 'ayuda_solicitada', a: 'docente' },
  { ...base, id: ev(12), tipo: 'autorreporte_enviado', autorreporteId: ids.respuesta },
];

export const autorreporte = {
  id: ids.respuesta,
  estudianteId: ids.estudiante1,
  claseId: ids.clase,
  contexto: { practicaId: ids.practica, pasoId: 'medir' },
  emociones: [
    { emocion: 'confusion', intensidad: 4 },
    { emocion: 'curiosidad', intensidad: 3 },
  ],
  ayuda: 'ejemplo',
  texto: 'No sé cómo contar las vueltas',
  visibilidad: 'mi_docente',
  hlc: hlcs.h2,
};

export const senalApoyo = {
  id: ids.evidencia,
  claseId: ids.clase,
  grupoId: ids.grupo1,
  estudianteId: ids.estudiante1,
  estado: 'atascado_en_habilidad',
  relativoALineaBase: true,
  confianza: 0.7,
  generadoEn: 1762300800000,
  expiraEn: 1762300800000 + 10 * 60 * 1000,
  eventoIds: [ev(2), ev(4)],
};

export const alertaDocente = {
  id: ids.asiento,
  claseId: ids.clase,
  alcance: { tipo: 'grupo', grupoId: ids.grupo1 },
  sugerencia: 'acercarse_a_conversar',
  motivos: ['atascado_en_habilidad'],
  visibilidad: 'solo_docente',
  decision: { estado: 'pendiente' },
  escalarSiseVe: false,
  creadaEn: 1762300800000,
};

export const consentimientoGuardian = {
  estudianteId: ids.estudiante1,
  menorDe14: true,
  consentimientoApoderado: true,
  asentimientoEstudiante: true,
  nivel: 'nivel1_conducta',
  registradoPor: 'docente',
  hlc: hlcs.h1,
};

export const validosGuardian: Record<string, unknown[]> = {
  EventoAprendizaje: eventosAprendizaje,
  AutorreporteMomento: [autorreporte, { ...autorreporte, ayuda: undefined, texto: undefined, visibilidad: 'solo_yo', contexto: { pasoId: 'predecir' } }],
  SenalApoyo: [senalApoyo, { ...senalApoyo, estudianteId: undefined, estado: 'abuso_de_pistas', relativoALineaBase: false }],
  AlertaDocente: [
    alertaDocente,
    {
      ...alertaDocente,
      alcance: { tipo: 'estudiante', estudianteId: ids.estudiante1 },
      escalarSiseVe: true,
      decision: { estado: 'atendida', decididoPor: 'docente', decididoEn: 1762300900000 },
    },
  ],
  ConsentimientoGuardian: [consentimientoGuardian, { ...consentimientoGuardian, menorDe14: false, consentimientoApoderado: false }],
};

export const invalidosGuardian: Record<string, CasoInvalido[]> = {
  EventoAprendizaje: [
    { caso: 'keystroke timing', valor: { ...eventosAprendizaje[1], tiemposTeclaMs: [120, 80] } },
    { caso: 'touch trajectory', valor: { ...eventosAprendizaje[0], trayectoriaToque: [[1, 2]] } },
    { caso: 'idle time in seconds', valor: { ...eventosAprendizaje[3], duracion: 180 } },
    { caso: 'unknown type', valor: { ...base, id: ev(1), tipo: 'mirada_fuera' } },
  ],
  AutorreporteMomento: [
    { caso: 'no emotion', valor: { ...autorreporte, emociones: [] } },
    { caso: 'intensity 0', valor: { ...autorreporte, emociones: [{ emocion: 'calma', intensidad: 0 }] } },
    { caso: 'visible to classmates', valor: { ...autorreporte, visibilidad: 'companeros' } },
    { caso: 'free text over 280 chars', valor: { ...autorreporte, texto: 'x'.repeat(281) } },
  ],
  SenalApoyo: [
    { caso: 'emotion label', valor: { ...senalApoyo, estado: 'frustrado' } },
    { caso: 'missing expiry', valor: { ...senalApoyo, expiraEn: undefined } },
    { caso: 'confidence over 1', valor: { ...senalApoyo, confianza: 1.2 } },
  ],
  AlertaDocente: [
    { caso: 'shown to peers', valor: { ...alertaDocente, visibilidad: 'grupo' } },
    { caso: 'closed without a teacher', valor: { ...alertaDocente, decision: { estado: 'descartada', decididoPor: 'reglas', decididoEn: 1 } } },
    { caso: 'SíseVe escalation for a whole group', valor: { ...alertaDocente, escalarSiseVe: true } },
    { caso: 'other suggestion', valor: { ...alertaDocente, sugerencia: 'llamar_al_apoderado' } },
  ],
  ConsentimientoGuardian: [
    { caso: 'under 14 without guardian consent', valor: { ...consentimientoGuardian, consentimientoApoderado: false } },
    { caso: 'active without student assent', valor: { ...consentimientoGuardian, asentimientoEstudiante: false } },
    { caso: 'unknown level', valor: { ...consentimientoGuardian, nivel: 'nivel3' } },
  ],
};
