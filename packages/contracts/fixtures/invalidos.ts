/**
 * Invalid fixtures: each case names the rule it breaks. Keys match `esquemas` in src/index.ts.
 */
import { invalidosGuardian } from './guardian.ts';
import { dispositivos, hlcs, ids } from './ids.ts';
import {
  agregadoSenales,
  asientoQuipu,
  clase,
  competencia,
  consentimientos,
  desempenoRef,
  estadoApoyo,
  estudiante,
  eventos,
  evidencia,
  exhibicion,
  grupo,
  medicion,
  memoriaEntrada,
  paquetePractica,
  practica,
  recursos,
  respuesta,
  sala,
} from './validos.ts';

export type { CasoInvalido } from './ids.ts';
import type { CasoInvalido } from './ids.ts';

const sin = (obj: object, ...claves: string[]) => Object.fromEntries(Object.entries(obj).filter(([k]) => !claves.includes(k)));
const evento0 = eventos[0] as Record<string, unknown>;

export const invalidos: Record<string, CasoInvalido[]> = {
  Ulid: [
    { caso: 'too short', valor: '01JC0000' },
    { caso: 'forbidden letter I', valor: '01JC0000000000000000000I01' },
    { caso: 'lowercase', valor: '01jc0000000000000000000c01' },
  ],
  Hlc: [
    { caso: 'seconds instead of ms', valor: '1762300800-0000-docente1' },
    { caso: 'uppercase node', valor: '1762300800000-0000-DOCENTE1' },
  ],
  Lengua: [{ caso: 'unsupported code', valor: 'en' }],
  Apodo: [{ caso: 'free-text nickname', valor: 'Juanito' }],
  DesempenoRef: [
    { caso: 'quote shorter than 20 chars', valor: { ...desempenoRef, cita: 'Formula preguntas' } },
    { caso: 'grade 7', valor: { ...desempenoRef, grado: 7 } },
    { caso: 'other area', valor: { ...desempenoRef, area: 'matematica' } },
  ],
  Competencia: [{ caso: 'invalid source url', valor: { ...competencia, fuente: { titulo: 'x', url: 'no-es-url' } } }],
  Practica: [
    { caso: 'prediction not required', valor: { ...practica, prediccionRequerida: false } },
    { caso: 'only one hint', valor: { ...practica, pistas: ['una'] } },
    { caso: 'five hints', valor: { ...practica, pistas: ['1', '2', '3', '4', '5'] } },
    { caso: 'no limitations', valor: { ...practica, limitaciones: [] } },
    { caso: 'single independent value', valor: { ...practica, protocolo: { ...practica.protocolo, valoresIndependiente: [0.5] } } },
    { caso: 'title over 90 chars', valor: { ...practica, titulo: 'x'.repeat(91) } },
    { caso: 'unknown state', valor: { ...practica, estado: 'publicada' } },
  ],
  Clase: [
    { caso: 'lowercase join code', valor: { ...clase, codigo: 'pend42' } },
    { caso: 'section over 4 chars', valor: { ...clase, seccion: 'ABCDE' } },
  ],
  Grupo: [
    { caso: 'no members', valor: { ...grupo, integrantes: [] } },
    { caso: 'nine members', valor: { ...grupo, integrantes: Array(9).fill(ids.estudiante1) } },
    { caso: 'nickname outside closed list', valor: { ...grupo, apodo: 'Los Pros' } },
  ],
  Consentimientos: [
    { caso: 'registered by someone other than the teacher', valor: { ...consentimientos, registradoPor: 'alumno' } },
    { caso: 'extra field', valor: { ...consentimientos, emociones: true } },
  ],
  Estudiante: [
    { caso: 'real name field', valor: { ...estudiante, nombre: 'Yeni Quispe' } },
    { caso: 'alias not E + 2 digits', valor: { ...estudiante, alias: 'Yeni' } },
    { caso: 'photo field', valor: { ...estudiante, foto: 'data:image/png;base64,AAAA' } },
  ],
  RecursoExhibicion: [
    { caso: 'video over 180 s', valor: { ...recursos[1], duracionS: 181 } },
    { caso: 'unknown type', valor: { ...recursos[0], tipo: 'pdf' } },
    { caso: 'quiz with one option', valor: { ...recursos[4], preguntas: [{ ...(recursos[4] as { preguntas: object[] }).preguntas[0], opciones: ['sola'] }] } },
    { caso: 'bad sha256', valor: { ...recursos[0], sha256: 'xyz' } },
  ],
  Sala: [{ caso: 'title without Spanish', valor: { ...sala, titulo: { quy: 'Fisica wasi' } } }],
  Exhibicion: [{ caso: 'practice id is not a ULID', valor: { ...exhibicion, practicaId: 'pendulo' } }],
  MemoriaEntrada: [
    { caso: 'summary over 200 chars', valor: { ...memoriaEntrada, resumen: 'x'.repeat(201) } },
    { caso: 'psychological label type', valor: { ...memoriaEntrada, tipo: 'ansioso' } },
  ],
  AsientoQuipu: [
    { caso: 'zero knots', valor: { ...asientoQuipu, nudos: 0 } },
    { caso: 'negative knots without correction', valor: { ...asientoQuipu, nudos: -2 } },
    { caso: 'purchase motive', valor: { ...asientoQuipu, motivo: 'compra' } },
    { caso: 'over 50 knots', valor: { ...asientoQuipu, nudos: 51 } },
  ],
  Medicion: [{ caso: 'unknown source', valor: { ...medicion, fuente: 'adivinanza' } }],
  RespuestaRazonamiento: [
    { caso: 'text over 500 chars', valor: { ...respuesta, texto: 'x'.repeat(501) } },
    { caso: 'cloud speech input', valor: { ...respuesta, entrada: 'voz-nube' } },
  ],
  Evidencia: [
    { caso: 'level 4', valor: { ...evidencia, nivel: 4 } },
    { caso: 'level as zero string', valor: { ...evidencia, nivel: '0' } },
  ],
  EstadoApoyo: [
    { caso: 'fine-grained emotion', valor: { ...estadoApoyo, tristeza: 'alto' } },
    { caso: 'numeric level', valor: { ...estadoApoyo, confusion: 0.8 } },
    { caso: 'confidence over 1', valor: { ...estadoApoyo, confianza: 1.5 } },
  ],
  ConfigSenales: [{ caso: 'missing voice flag', valor: { rostro: true } }],
  AgregadoSenales: [
    { caso: 'per-student breakdown', valor: { ...agregadoSenales, estudianteId: ids.estudiante1 } },
    { caso: 'negative count', valor: { ...agregadoSenales, confusion: { alto: -1, medio: 0, bajo: 0 } } },
    { caso: 'fine timestamp instead of window index', valor: { ...agregadoSenales, ventana: hlcs.h2 } },
  ],
  Evento: [
    { caso: 'device id not 10 chars', valor: { ...evento0, dispositivo: 'G1' } },
    { caso: 'seq zero', valor: { ...evento0, seq: 0 } },
    { caso: 'schema version 2', valor: { ...evento0, sv: 2 } },
    { caso: 'unknown type', valor: { ...evento0, tipo: 'chat.mensaje' } },
    { caso: 'more than 8 authors', valor: { ...evento0, autor: { estudianteIds: Array(9).fill(ids.estudiante1) } } },
  ],
  EventoValidado: [
    { caso: 'datos do not match type', valor: { ...evento0, datos: { foo: 1 } } },
    { caso: 'authority event without signature', valor: { ...evento0, dispositivo: dispositivos.docente, tipo: 'clase.cerrada', datos: {} } },
    { caso: 'senales.agregado with a student id', valor: { ...evento0, tipo: 'senales.agregado', datos: { ...agregadoSenales, estudianteId: ids.estudiante1 } } },
    { caso: 'empty class config', valor: { ...evento0, tipo: 'clase.config', datos: {}, firma: 'MEUCIQ' } },
  ],
  Paquete: [
    { caso: 'version 2', valor: { ...paquetePractica, v: 2 } },
    { caso: 'unknown type', valor: { ...paquetePractica, tipo: 'foto' } },
  ],
  PaqueteValidado: [
    { caso: 'unsigned practice', valor: sin(paquetePractica, 'firma') },
    { caso: 'practice body is not a practice', valor: { ...paquetePractica, cuerpo: { titulo: 'x' } } },
    { caso: 'events body with an invalid event', valor: { ...paquetePractica, tipo: 'eventos', cuerpo: { eventos: [{ id: 'x' }] } } },
  ],
  MarcoQr: [
    { caso: 'unknown frame type', valor: 'RK1:X:0A1Z:1:7:1X2Y3Z:ABC' },
    { caso: 'lowercase payload', valor: 'RK1:E:0A1Z:1:7:1X2Y3Z:abc' },
    { caso: 'wrong prefix', valor: 'RK2:E:0A1Z:1:7:1X2Y3Z:ABC' },
  ],
  VectorVersion: [
    { caso: 'short device id', valor: { G1: 3 } },
    { caso: 'negative seq', valor: { [dispositivos.grupo1]: -1 } },
  ],
  MensajeSync: [
    { caso: 'unknown message', valor: { t: 'adios', claseId: ids.clase } },
    { caso: 'delta with invalid event', valor: { t: 'delta', claseId: ids.clase, eventos: [{ id: 'x' }] } },
    { caso: 'unknown capability', valor: { t: 'hola', claseId: ids.clase, vv: {}, capacidades: ['bluetooth'] } },
  ],
  Comando: [
    { caso: 'unknown tool', valor: { tool: 'borrar_todo', args: {} } },
    { caso: 'hint level 0', valor: { tool: 'dar_pista', args: { nivel: 0 } } },
    { caso: 'empty scene', valor: { tool: 'ir_a', args: { escena: '' } } },
    { caso: 'non-positive zoom', valor: { tool: 'zoom', args: { factor: 0 } } },
  ],
  BusMessage: [
    { caso: 'learning event on the bus', valor: { type: 'event', event: {} } },
    { caso: 'unknown role', valor: { type: 'hello', role: 'admin', room: 'aula1', clientId: 'c1' } },
  ],
  MensajeRtCliente: [
    { caso: 'free chat', valor: { t: 'rt.chat', texto: 'hola' } },
    { caso: 'reaction outside closed list', valor: { t: 'rt.gesto', g: 'insultar' } },
    { caso: 'more than 8 avatars moved', valor: { t: 'rt.mov', s: 1, sala: 's', p: Array(9).fill([1, 1, 0]) } },
    { caso: 'hello without class mac', valor: { t: 'rt.hola', claseId: ids.clase, dispositivo: dispositivos.grupo1, grupoId: ids.grupo1, avatares: [] } },
  ],
  MensajeRtHub: [
    { caso: 'teacher order without signature', valor: { t: 'rt.orden', o: 'reunir' } },
    { caso: 'switch for an unknown resource', valor: { t: 'rt.interruptor', recurso: 'camara', activo: true, firma: 'x' } },
  ],
  ...invalidosGuardian,
};
