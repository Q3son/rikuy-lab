/**
 * @rikuy/contracts v1: single source of types, runtime validation and JSON Schema.
 * Rules (2.3.4): only additive changes during a sprint (optional fields, new event types).
 * A breaking change bumps SCHEMA_VERSION and ships its migration.
 */
import { Clase, Consentimientos, Estudiante, Grupo } from './aula.ts';
import { BusMessage } from './bus.ts';
import { Apodo, Competencia, DesempenoRef, Hlc, Lengua, Ulid } from './comun.ts';
import { Evento, EventoValidado } from './evento.ts';
import { AlertaDocente, AutorreporteMomento, ConsentimientoGuardian, EventoAprendizaje, SenalApoyo } from './guardian.ts';
import { Evidencia, Medicion, RespuestaRazonamiento } from './laboratorio.ts';
import { MemoriaEntrada } from './memoria.ts';
import { Exhibicion, RecursoExhibicion, Sala } from './museo.ts';
import { MarcoQr, Paquete, PaqueteValidado } from './paquete.ts';
import { Practica } from './practica.ts';
import { AsientoQuipu } from './quipu.ts';
import { AgregadoSenales, ConfigSenales, EstadoApoyo } from './senales.ts';
import { MensajeSync, VectorVersion } from './sync.ts';
import { MensajeRtCliente, MensajeRtHub } from './tiempo-real.ts';
import { Comando } from './tutor/comandos.ts';

export * from './comun.ts';
export * from './practica.ts';
export * from './aula.ts';
export * from './museo.ts';
export * from './laboratorio.ts';
export * from './memoria.ts';
export * from './quipu.ts';
export * from './senales.ts';
export * from './evento.ts';
export * from './paquete.ts';
export * from './sync.ts';
export * from './bus.ts';
export * from './tiempo-real.ts';
export * from './tutor/comandos.ts';
export * from './rutas.ts';
export * from './guardian.ts';

/** Registry of every contract schema by name. Fixtures in `fixtures/` are keyed the same way. */
export const esquemas = {
  Ulid,
  Hlc,
  Lengua,
  Apodo,
  DesempenoRef,
  Competencia,
  Practica,
  Clase,
  Grupo,
  Consentimientos,
  Estudiante,
  RecursoExhibicion,
  Sala,
  Exhibicion,
  MemoriaEntrada,
  AsientoQuipu,
  Medicion,
  RespuestaRazonamiento,
  Evidencia,
  EstadoApoyo,
  ConfigSenales,
  AgregadoSenales,
  Evento,
  EventoValidado,
  Paquete,
  PaqueteValidado,
  MarcoQr,
  VectorVersion,
  MensajeSync,
  Comando,
  BusMessage,
  MensajeRtCliente,
  MensajeRtHub,
  // Rikuy Guardián
  EventoAprendizaje,
  AutorreporteMomento,
  SenalApoyo,
  AlertaDocente,
  ConsentimientoGuardian,
} as const;
export type NombreEsquema = keyof typeof esquemas;
