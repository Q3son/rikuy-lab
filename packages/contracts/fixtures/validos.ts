/**
 * Valid fixtures for every contract schema. Keys match `esquemas` in src/index.ts.
 * Plain data on purpose: fronts use them in their own tests (Dexie, SQLite, transports, AI mocks).
 */
import { validosGuardian } from './guardian.ts';
import { citaDesempeno, dispositivos, hlcs, ids, sha } from './ids.ts';

export const desempenoRef = {
  nivel: 'secundaria',
  grado: 2,
  area: 'ciencia-y-tecnologia',
  competencia: 1,
  desempeno: 1,
  cita: citaDesempeno,
};

export const competencia = {
  id: 'secundaria-2:cyt:c1',
  nombre: 'Indaga mediante métodos científicos para construir sus conocimientos',
  capacidades: ['Problematiza situaciones para hacer indagación'],
  estandar: 'Indaga a partir de preguntas e hipótesis que son verificables de forma experimental.',
  desempenos: [`${citaDesempeno} o fenómeno u objeto natural o tecnológico.`],
  fuente: { titulo: 'Programa curricular de Educación Secundaria (MINEDU)', url: 'https://www.minedu.gob.pe/curriculo/' },
};

export const practica = {
  id: ids.practica,
  version: 1,
  titulo: 'El péndulo: ¿qué cambia el periodo?',
  desempeno: desempenoRef,
  preguntaGuia: '¿De qué depende el tiempo que tarda un péndulo en ir y volver?',
  prediccionRequerida: true,
  materiales: [
    { nombre: 'Cuerda', casero: true },
    { nombre: 'Tuerca o piedra', casero: true },
  ],
  variables: [{ id: 'longitud', etiqueta: 'Longitud de la cuerda', unidad: 'm', min: 0.2, max: 1.5, paso: 0.1, porDefecto: 0.5 }],
  protocolo: { repeticiones: 10, valoresIndependiente: [0.3, 0.6, 0.9], magnitud: 'periodo', unidad: 's' },
  modelo: { id: 'pendulo', version: 1 },
  pistas: ['¿Qué podrías cambiar del péndulo?', 'Prueba con dos cuerdas de distinto largo.', 'Compara el tiempo de 10 vueltas con cada largo.'],
  limitaciones: ['El modelo supone oscilaciones pequeñas y sin rozamiento.'],
  escenaHolo: 'pendulo',
  textos: {
    quy: { preguntaGuia: '¿Imamantaq péndulo kutimunanpaq unaynin?', pistas: ['¿Imatataq tikrayta atinki?'], revisado: false, variedad: 'Ayacucho-Chanka' },
  },
  audio: [{ clave: 'pendulo.preguntaGuia', lengua: 'quy', sha256: sha, bytes: 24000 }],
  procedencia: {
    generadoPor: 'ia+docente',
    modelos: ['gemini-flash'],
    revisiones: [{ por: 'verificador', veredicto: 'ok', notas: [] }],
  },
  estado: 'aprobada',
};

export const clase = {
  id: ids.clase,
  codigo: 'PEND42',
  practicaId: ids.practica,
  practicaVersion: 1,
  grado: 2,
  seccion: 'A',
  lengua: 'es',
  docenteDispositivo: dispositivos.docente,
  claveClasePub: 'BPUBKEY-base64url',
  tutor: { activo: true, iaLocal: false, iaNube: false },
  abierta: true,
  creada: hlcs.h1,
};

export const grupo = { id: ids.grupo1, claseId: ids.clase, apodo: 'Vizcacha', dispositivo: dispositivos.grupo1, integrantes: [ids.estudiante1, ids.estudiante2] };

export const consentimientos = { senalesRostro: false, senalesVoz: false, gestosCamara: true, registradoPor: 'docente', hlc: hlcs.h1 };

export const estudiante = { id: ids.estudiante1, aulaId: ids.aula, alias: 'E07', avatar: 'vizcacha-1', lenguaPreferida: 'quy', consentimientos };

const recursoBase = { id: 'r1', lengua: 'es', revisado: true, licencia: 'CC BY 4.0', autoria: 'Equipo Rikuy', sha256: sha, bytes: 1200, precache: 'clase' };

export const recursos = [
  { tipo: 'holograma', ...recursoBase, id: 'holo-pendulo', lengua: 'neutro', escena: 'pendulo' },
  {
    tipo: 'video', ...recursoBase, id: 'video-pendulo', archivo: 'pendulo.mp4', duracionS: 60, precache: 'bajo_demanda',
    subtitulos: [{ lengua: 'es', vtt: 'pendulo.es.vtt' }], poster: 'pendulo.jpg',
  },
  { tipo: 'audio', ...recursoBase, id: 'audio-pregunta', lengua: 'quy', clave: 'pendulo.preguntaGuia' },
  { tipo: 'diagrama', ...recursoBase, id: 'diagrama-pendulo', svg: 'pendulo.svg', etiquetas: { es: { cuerda: 'Cuerda' }, quy: { cuerda: 'Waska' } } },
  {
    tipo: 'quiz', ...recursoBase, id: 'quiz-pendulo',
    preguntas: [{ enunciado: '¿Qué cambia el periodo?', opciones: ['La masa', 'La longitud'], correcta: 1, retro: ['Revisa tu tabla.'], desempeno: { competencia: 1, desempeno: 1 } }],
  },
];

export const sala = { id: 'sala-fisica', area: 'ciencia-y-tecnologia', competencia: 1, plantilla: 'sala-tematica', titulo: { es: 'Sala Física', quy: 'Fisica wasi' } };

export const exhibicion = { id: 'exh-pendulo', salaId: 'sala-fisica', practicaId: ids.practica, pedestal: 'p1', recursos };

export const memoriaEntrada = {
  id: ids.memoria,
  estudianteId: ids.estudiante1,
  aulaId: ids.aula,
  competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
  conceptos: ['periodo', 'longitud'],
  tipo: 'prediccion_confirmada',
  resumen: 'Predijo que al alargar la cuerda tarda más y su dato lo confirmó.',
  evidenciaIds: [ids.evidencia],
  hlc: hlcs.h2,
};

export const asientoQuipu = {
  id: ids.asiento,
  aulaId: ids.aula,
  claseId: ids.clase,
  beneficiario: { tipo: 'grupo', grupoId: ids.grupo1 },
  nudos: 1,
  motivo: 'medicion_completa',
  evidenciaRef: ids.medicion,
  emitidoPor: 'reglas',
};

export const medicion = {
  id: ids.medicion, claseId: ids.clase, grupoId: ids.grupo1, practicaId: ids.practica,
  variable: 'longitud', valorIndependiente: 0.5, repeticion: 1, magnitud: 'periodo', valor: 1.42, unidad: 's', fuente: 'cronometro',
};

export const respuesta = {
  id: ids.respuesta, claseId: ids.clase, grupoId: ids.grupo1, momento: 'prediccion',
  texto: 'Creo que si la cuerda es más larga tarda más en volver', lengua: 'es', entrada: 'teclado', pistasUsadasAntes: 0,
};

export const evidencia = {
  id: ids.evidencia, respuestaId: ids.respuesta, grupoId: ids.grupo1, claseId: ids.clase,
  indicador: 'prediccion', nivel: 2, estado: 'ok', cita: 'si la cuerda es más larga tarda más',
  desempeno: { competencia: 1, desempeno: 1 }, fuente: 'reglas',
};

export const estadoApoyo = { confusion: 'alto', frustracion: 'bajo', atencion: 'medio', confianza: 0.6 };

export const agregadoSenales = {
  grupoId: ids.grupo1,
  ventana: 3,
  confusion: { alto: 2, medio: 5, bajo: 23 },
  frustracion: { alto: 0, medio: 3, bajo: 27 },
  atencion: { alto: 20, medio: 8, bajo: 2 },
};

const eventoBase = {
  id: ids.evento1, dispositivo: dispositivos.grupo1, seq: 1, hlc: hlcs.h2, claseId: ids.clase, sv: 1,
  autor: { grupoId: ids.grupo1 }, mac: 'q8x3k1m2',
};

export const eventos = [
  { ...eventoBase, tipo: 'medicion.registrada', datos: medicion },
  { ...eventoBase, id: ids.evento2, seq: 2, tipo: 'respuesta.registrada', autor: { grupoId: ids.grupo1, estudianteIds: [ids.estudiante1] }, datos: respuesta },
  { ...eventoBase, dispositivo: dispositivos.docente, hlc: hlcs.h1, tipo: 'clase.creada', datos: clase, firma: 'MEUCIQ' },
  { ...eventoBase, dispositivo: dispositivos.docente, tipo: 'clase.config', datos: { senales: { rostro: false, voz: false } }, firma: 'MEUCIQ' },
  { ...eventoBase, tipo: 'senales.agregado', datos: agregadoSenales },
  { ...eventoBase, dispositivo: dispositivos.docente, tipo: 'quipu.asiento', datos: asientoQuipu },
  { ...eventoBase, tipo: 'museo.visita', datos: { salaId: 'sala-fisica', exhibicionId: 'exh-pendulo', grupoId: ids.grupo1 } },
  { ...eventoBase, tipo: 'pista.mostrada', datos: { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 } },
  {
    ...eventoBase, tipo: 'tutor.turno',
    datos: { grupoId: ids.grupo1, fuente: 'reglas', texto: '¿Qué crees que pasará?', comandos: [{ tool: 'dar_pista', args: { nivel: 1 } }] },
  },
  { ...eventoBase, dispositivo: dispositivos.docente, tipo: 'estudiante.olvidar', datos: { estudianteId: ids.estudiante3 }, firma: 'MEUCIQ' },
];

export const paquetePractica = {
  v: 1, tipo: 'practica', claseId: ids.clase, emisor: dispositivos.docente, creado: hlcs.h1, cuerpo: practica, firma: 'MEUCIQ',
};

export const paquetes = [
  paquetePractica,
  { v: 1, tipo: 'eventos', claseId: ids.clase, emisor: dispositivos.grupo1, creado: hlcs.h2, cuerpo: { eventos: [eventos[0]] }, firma: 'hmac8byt' },
  {
    v: 1, tipo: 'union', claseId: ids.clase, emisor: dispositivos.docente, creado: hlcs.h1, firma: 'MEUCIQ',
    cuerpo: { claseId: ids.clase, codigo: 'PEND42', practica: { id: ids.practica, version: 1, sha256: sha }, claveClaseMac: 'k-mac', claveClasePub: 'k-pub' },
  },
  { v: 1, tipo: 'ack', claseId: ids.clase, emisor: dispositivos.docente, creado: hlcs.h3, cuerpo: { vv: { [dispositivos.grupo1]: 2 } } },
  {
    v: 1, tipo: 'resumen-familia', emisor: dispositivos.docente, creado: hlcs.h3,
    cuerpo: { practicaId: ids.practica, lengua: 'quy', resumen: 'Hoy medimos un péndulo.', audioClave: 'familia.pendulo' },
  },
];

export const mensajesSync = [
  { t: 'hola', claseId: ids.clase, vv: { [dispositivos.grupo1]: 2, [dispositivos.docente]: 0 }, capacidades: ['qr', 'ws'] },
  { t: 'delta', claseId: ids.clase, eventos: [eventos[0]], ultimo: true },
  { t: 'ack', claseId: ids.clase, vv: { [dispositivos.grupo1]: 2 } },
];

export const comandos = [
  { tool: 'ir_a', args: { escena: 'pendulo' } },
  { tool: 'fijar_variable', args: { variable: 'longitud', valor: 0.6 } },
  { tool: 'correr', args: {} },
  { tool: 'rotar', args: { yaw: 30 } },
  { tool: 'dar_pista', args: { nivel: 2 } },
  { tool: 'registrar_hipotesis', args: { texto: 'Si alargo la cuerda tarda más.' } },
];

export const mensajesBus = [
  { type: 'hello', role: 'display', room: 'aula1', clientId: 'c1' },
  { type: 'command', commands: comandos.slice(0, 2), from: 'control' },
  { type: 'gesture', dx: 0.1, dy: 0, dz: 0, from: 'control' },
  { type: 'say', text: '¿Qué crees que pasará?', speaker: 'agente' },
  { type: 'state', state: { scene: 'pendulo', running: true, variables: { longitud: 0.5 }, readout: { label: 'Periodo', value: '1,42 s' } } },
  { type: 'peers', roles: ['display', 'control'] },
];

export const mensajesRtCliente = [
  { t: 'rt.hola', claseId: ids.clase, dispositivo: dispositivos.grupo1, grupoId: ids.grupo1, avatares: [ids.estudiante1], mac: 'q8x3k1m2' },
  { t: 'rt.mov', s: 12, sala: 'sala-fisica', p: [[120, 45, 2]] },
  { t: 'rt.sala', sala: 'sala-fisica' },
  { t: 'rt.gesto', g: 'saludar' },
  { t: 'rt.latido' },
];

export const mensajesRtHub = [
  { t: 'rt.bienvenida', yo: dispositivos.grupo1, salas: { 'sala-fisica': 3 }, hora: 1762300800000 },
  { t: 'rt.instantanea', sala: 'sala-fisica', pares: [{ d: dispositivos.grupo2, g: ids.grupo2, p: [[100, 40, 0]] }] },
  { t: 'rt.delta', sala: 'sala-fisica', s: 13, cambios: [{ d: dispositivos.grupo2, p: [[101, 40, 0]] }, { d: dispositivos.grupo1, fuera: true }] },
  { t: 'rt.orden', o: 'reunir', sala: 'sala-fisica', firma: 'MEUCIQ' },
  { t: 'rt.interruptor', recurso: 'gestos', activo: false, firma: 'MEUCIQ' },
];

export const validos: Record<string, unknown[]> = {
  Ulid: [ids.clase, '01ARZ3NDEKTSV4RRFFQ69G5FAV'],
  Hlc: Object.values(hlcs),
  Lengua: ['es', 'quy', 'quz', 'ayr'],
  Apodo: ['Condor', 'Vizcacha', 'Taruca'],
  DesempenoRef: [desempenoRef],
  Competencia: [competencia],
  Practica: [practica, { ...practica, textos: undefined, audio: undefined, modelo: undefined, escenaHolo: undefined, estado: 'borrador' }],
  Clase: [clase],
  Grupo: [grupo],
  Consentimientos: [consentimientos],
  Estudiante: [estudiante],
  RecursoExhibicion: recursos,
  Sala: [sala, { id: 'sala-taller', area: 'ciencia-y-tecnologia', plantilla: 'taller', titulo: { es: 'Taller de tecnología' } }],
  Exhibicion: [exhibicion, { ...exhibicion, id: 'exh-sorpresa', bloqueadaHasta: 'quipu:5' }],
  MemoriaEntrada: [memoriaEntrada],
  AsientoQuipu: [
    asientoQuipu,
    { id: ids.asiento, aulaId: ids.aula, beneficiario: { tipo: 'aula' }, nudos: 1, motivo: 'todos_predijeron', emitidoPor: 'reglas' },
  ],
  Medicion: [medicion],
  RespuestaRazonamiento: [respuesta],
  Evidencia: [evidencia, { ...evidencia, nivel: 'NO', estado: 'no_observable', cita: '' }],
  EstadoApoyo: [estadoApoyo],
  ConfigSenales: [{ rostro: false, voz: false }, { rostro: true, voz: false }],
  AgregadoSenales: [agregadoSenales],
  Evento: eventos,
  EventoValidado: eventos,
  Paquete: paquetes,
  PaqueteValidado: paquetes,
  MarcoQr: ['RK1:E:0A1Z:1:7:1X2Y3Z:6BFOXN*TS0BB', 'RK1:A:Z9Z9:1:1:0:'],
  VectorVersion: [{}, { [dispositivos.grupo1]: 0, [dispositivos.docente]: 40 }],
  MensajeSync: mensajesSync,
  Comando: comandos,
  BusMessage: mensajesBus,
  MensajeRtCliente: mensajesRtCliente,
  MensajeRtHub: mensajesRtHub,
  ...validosGuardian,
};
