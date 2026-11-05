/**
 * Demo scenario: one pendulum class (2.º B) with 4 groups and 12 pseudonymous students,
 * built only from contract-valid events. It seeds the "Datos de ejemplo" mode of the teacher
 * panel and every test of this package, so nothing here is real student data.
 *
 * Quotes in `evidencias` are exact substrings of the matching `respuestas` text on purpose;
 * `construirEscenario({ citasAlteradas: true })` breaks that to test the verifier.
 */
import { ejemplos, ids as idsContrato } from '@rikuy/contracts/fixtures';
import type { Clase, Evento, Practica } from '@rikuy/contracts';

const BASE_MS = 1762300800000;

export function ulid(tag: string, n: number): string {
  return `01JC${tag}${String(n).padStart(20, '0')}`;
}
const hlc = (paso: number, nodo: string) => `${String(BASE_MS + paso * 1000).padStart(13, '0')}-0000-${nodo}`;

export const APODOS = ['Condor', 'Vicuna', 'Vizcacha', 'Puma', 'Kantu', 'Queuna', 'Alpaca', 'Taruca'] as const;

export interface DefinicionGrupo {
  apodo: (typeof APODOS)[number];
  mediciones: number;
  respuestas: { momento: 'prediccion' | 'justificacion' | 'conclusion'; texto: string; despuesDeMedir?: boolean }[];
  evidencias: {
    indicador: 'variable' | 'prediccion' | 'justificacion' | 'uso_del_dato' | 'conclusion_coherente';
    momento: 'prediccion' | 'justificacion' | 'conclusion';
    nivel: 0 | 1 | 2 | 3 | 'NO';
    estado: 'ok' | 'dudoso' | 'no_observable';
    cita: string;
  }[];
}

export const GRUPOS_DEMO: DefinicionGrupo[] = [
  {
    apodo: 'Condor',
    mediciones: 30,
    respuestas: [
      { momento: 'prediccion', texto: 'Creo que si la cuerda es más larga tarda más en volver' },
      { momento: 'justificacion', texto: 'Porque tiene que recorrer más camino' },
      { momento: 'conclusion', texto: 'Con 100 cm, 10 oscilaciones me dieron 20,9 s. Tarda más porque la cuerda larga recorre más camino.', despuesDeMedir: true },
    ],
    evidencias: [
      { indicador: 'prediccion', momento: 'prediccion', nivel: 3, estado: 'ok', cita: 'si la cuerda es más larga tarda más en volver' },
      { indicador: 'justificacion', momento: 'justificacion', nivel: 2, estado: 'ok', cita: 'recorrer más camino' },
      { indicador: 'uso_del_dato', momento: 'conclusion', nivel: 3, estado: 'ok', cita: 'Con 100 cm, 10 oscilaciones me dieron 20,9 s' },
      { indicador: 'conclusion_coherente', momento: 'conclusion', nivel: 2, estado: 'ok', cita: 'Tarda más porque la cuerda larga recorre más camino' },
    ],
  },
  {
    apodo: 'Vizcacha',
    mediciones: 30,
    respuestas: [
      { momento: 'prediccion', texto: 'Si alargo la cuerda, tarda más.' },
      { momento: 'conclusion', texto: 'Mis datos muestran que con más cuerda el tiempo sube', despuesDeMedir: true },
    ],
    evidencias: [
      { indicador: 'prediccion', momento: 'prediccion', nivel: 2, estado: 'ok', cita: 'Si alargo la cuerda, tarda más.' },
      { indicador: 'conclusion_coherente', momento: 'conclusion', nivel: 2, estado: 'ok', cita: 'con más cuerda el tiempo sube' },
      { indicador: 'uso_del_dato', momento: 'conclusion', nivel: 'NO', estado: 'no_observable', cita: '' },
    ],
  },
  {
    apodo: 'Puma',
    mediciones: 12,
    respuestas: [{ momento: 'prediccion', texto: 'Creo que pesa más y por eso tarda más.' }],
    evidencias: [{ indicador: 'prediccion', momento: 'prediccion', nivel: 1, estado: 'dudoso', cita: 'pesa más y por eso tarda más' }],
  },
  {
    apodo: 'Kantu',
    mediciones: 4,
    respuestas: [{ momento: 'prediccion', texto: 'Ya medí un poco y tarda más', despuesDeMedir: true }],
    evidencias: [{ indicador: 'prediccion', momento: 'prediccion', nivel: 1, estado: 'ok', cita: 'tarda más' }],
  },
];

export interface OpcionesEscenario {
  /** Replace every quote with a paraphrase (used to test that the verifier refuses them). */
  citasAlteradas?: boolean;
}

export interface Escenario {
  clase: Clase;
  practica: Practica;
  eventos: Evento[];
  grupoIds: Record<string, string>;
  /** `${apodo}:${indicador}` -> evidence id. */
  evidenciaIds: Record<string, string>;
  estudianteIds: string[];
}

export function construirEscenario(opciones: OpcionesEscenario = {}): Escenario {
  const clase = { ...(ejemplos.clase as Clase), seccion: 'B' };
  const practica = ejemplos.practica as Practica;
  const seqs: Record<string, number> = {};
  let paso = 0;
  let n = 0;
  const eventos: Evento[] = [];
  const emitir = (dispositivo: string, nodo: string, tipo: Evento['tipo'], datos: unknown, autor: Evento['autor'] = {}, firma?: string) => {
    seqs[dispositivo] = (seqs[dispositivo] ?? 0) + 1;
    paso += 1;
    n += 1;
    eventos.push({
      id: ulid('EN', n),
      dispositivo,
      seq: seqs[dispositivo],
      hlc: hlc(paso, nodo),
      claseId: clase.id,
      sv: 1,
      tipo,
      autor,
      datos,
      mac: 'q8x3k1m2',
      ...(firma ? { firma } : {}),
    });
  };

  const DOC = 'DOCENTE001';
  emitir(DOC, 'docente1', 'clase.creada', clase, {}, 'SIMULADA');

  const estudianteIds: string[] = [];
  for (let i = 1; i <= 12; i += 1) {
    const id = ulid('ES', i);
    estudianteIds.push(id);
    emitir(
      DOC,
      'docente1',
      'aula.estudiante_alta',
      {
        id,
        aulaId: idsContrato.aula,
        alias: `E${String(i).padStart(2, '0')}`,
        avatar: `vizcacha-${(i % 4) + 1}`,
        lenguaPreferida: 'es',
        consentimientos: { senalesRostro: false, senalesVoz: false, gestosCamara: false, registradoPor: 'docente', hlc: hlc(1, 'docente1') },
      },
      {},
      'SIMULADA',
    );
  }

  const grupoIds: Record<string, string> = {};
  const evidenciaIds: Record<string, string> = {};
  let medN = 0;
  let respN = 0;
  let evN = 0;

  GRUPOS_DEMO.forEach((g, gi) => {
    const grupoId = ulid('GR', gi + 1);
    grupoIds[g.apodo] = grupoId;
    const dispositivo = `GRUPO0000${gi + 1}`;
    const nodo = `grupo00${gi + 1}`;
    const integrantes = estudianteIds.slice(gi * 3, gi * 3 + 3);
    emitir(dispositivo, nodo, 'grupo.unido', { id: grupoId, claseId: clase.id, apodo: g.apodo, dispositivo, integrantes }, { grupoId });

    const respuestaIds: Record<string, string> = {};
    const emitirRespuesta = (r: DefinicionGrupo['respuestas'][number]) => {
      respN += 1;
      const id = ulid('RE', respN);
      respuestaIds[r.momento] = id;
      emitir(
        dispositivo,
        nodo,
        'respuesta.registrada',
        { id, claseId: clase.id, grupoId, momento: r.momento, texto: r.texto, lengua: 'es', entrada: 'teclado', pistasUsadasAntes: 0 },
        { grupoId, estudianteIds: integrantes.slice(0, 1) },
      );
    };
    g.respuestas.filter((r) => !r.despuesDeMedir).forEach(emitirRespuesta);
    for (let m = 1; m <= g.mediciones; m += 1) {
      medN += 1;
      emitir(
        dispositivo,
        nodo,
        'medicion.registrada',
        {
          id: ulid('ME', medN),
          claseId: clase.id,
          grupoId,
          practicaId: practica.id,
          variable: 'longitud',
          valorIndependiente: [0.3, 0.6, 0.9][m % 3],
          repeticion: Math.ceil(m / 3),
          magnitud: 'periodo',
          valor: 1.1 + (m % 3) * 0.3,
          unidad: 's',
          fuente: 'cronometro',
          anulada: false,
        },
        { grupoId },
      );
    }
    g.respuestas.filter((r) => r.despuesDeMedir).forEach(emitirRespuesta);

    for (const e of g.evidencias) {
      evN += 1;
      const id = ulid('EV', evN);
      evidenciaIds[`${g.apodo}:${e.indicador}`] = id;
      emitir(
        DOC,
        'docente1',
        'evidencia.calculada',
        {
          id,
          respuestaId: respuestaIds[e.momento],
          grupoId,
          claseId: clase.id,
          indicador: e.indicador,
          nivel: e.nivel,
          estado: e.estado,
          cita: opciones.citasAlteradas && e.cita ? `${e.cita} (parafraseado)` : e.cita,
          desempeno: { competencia: 1, desempeno: 1 },
          fuente: 'reglas',
          confirmadaPorDocente: false,
        },
        { grupoId },
      );
    }
  });

  // The teacher confirms Condor's prediction and corrects Puma's doubtful one to level 0.
  emitir(DOC, 'docente1', 'evidencia.confirmada', { evidenciaId: evidenciaIds['Condor:prediccion'] }, {}, 'SIMULADA');
  emitir(DOC, 'docente1', 'evidencia.confirmada', { evidenciaId: evidenciaIds['Puma:prediccion'], nivel: 0 }, {}, 'SIMULADA');

  return { clase, practica, eventos, grupoIds, evidenciaIds, estudianteIds };
}

export interface EscenarioPartido {
  /** What the teacher phone has before any group delivers: the class and the pseudonymous roster. */
  base: Evento[];
  /** What each group phone would show as RK1 `E` frames at the closing, keyed by group nickname. */
  porGrupo: Record<string, Evento[]>;
}

/** Splits the demo scenario so the closing by QR can be rehearsed group by group (T-08). */
export function partirEscenario(e: Escenario = construirEscenario()): EscenarioPartido {
  const nombres = Object.fromEntries(Object.entries(e.grupoIds).map(([apodo, id]) => [id, apodo]));
  const porGrupo: Record<string, Evento[]> = {};
  const base: Evento[] = [];
  for (const ev of e.eventos) {
    const g = ev.autor.grupoId;
    if (g) (porGrupo[nombres[g]] ??= []).push(ev);
    else if (ev.tipo !== 'evidencia.confirmada') base.push(ev);
  }
  return { base, porGrupo };
}
