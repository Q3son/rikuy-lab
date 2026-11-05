/**
 * Behavioural rules of the v1 contracts that fixtures alone do not make obvious:
 * privacy (4.6), learning signals containment (4.9), teacher authority (3.5),
 * closed real-time vocabulary (3.9) and the AI tool schema (4.4).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AgregadoSenales,
  AsientoQuipu,
  BusMessage,
  Comando,
  DATOS_POR_TIPO,
  EstadoApoyo,
  Estudiante,
  EventoValidado,
  Grupo,
  MARCO_QR_REGEX,
  MemoriaEntrada,
  MensajeRtCliente,
  MensajeSync,
  NivelSenal,
  PaqueteValidado,
  RespuestaRazonamiento,
  SCHEMA_VERSION,
  TIPOS_AUTORIDAD_DOCENTE,
  TIPOS_EVENTO,
  comandoJsonSchema,
} from './index.ts';
import { ids, validos } from '../fixtures/index.ts';

/** Collects every property name that appears anywhere in the JSON Schema of `schema`. */
function propertyKeys(schema: z.ZodType): Set<string> {
  const keys = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (obj.properties && typeof obj.properties === 'object') {
      for (const k of Object.keys(obj.properties)) keys.add(k);
    }
    Object.values(obj).forEach(walk);
  };
  walk(z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }));
  return keys;
}

const evento = (tipo: string, datos: unknown, extra: Record<string, unknown> = {}) => ({
  ...(validos.EventoValidado[0] as Record<string, unknown>),
  tipo,
  datos,
  ...extra,
});

describe('versioning', () => {
  it('is schema version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

describe('privacy (4.6): no personal data fields for students', () => {
  const PROHIBIDOS = ['nombre', 'apellido', 'dni', 'foto', 'audio', 'telefono', 'correo', 'email'];
  // Curated content is not student data: material names and native-speaker recordings are allowed there.
  const { 'practica.publicada': _contenido, ...datosConAlumnos } = DATOS_POR_TIPO;
  const esquemasConAlumnos = {
    Estudiante,
    Grupo,
    RespuestaRazonamiento,
    MemoriaEntrada,
    AgregadoSenales,
    ...datosConAlumnos,
  };
  it.each(Object.entries(esquemasConAlumnos))('%s has no personal data fields', (_n, esquema) => {
    const keys = propertyKeys(esquema as z.ZodType);
    for (const p of PROHIBIDOS) expect(keys.has(p), p).toBe(false);
  });

  it('rejects unknown keys on Estudiante instead of silently stripping them', () => {
    const conNombre = { ...(validos.Estudiante[0] as object), nombre: 'Yeni' };
    expect(Estudiante.safeParse(conNombre).success).toBe(false);
  });

  it('defaults every consent to false', () => {
    const base = validos.Estudiante[0] as { consentimientos: Record<string, unknown> };
    const r = Estudiante.parse({
      ...base,
      consentimientos: { registradoPor: 'docente', hlc: base.consentimientos.hlc },
    });
    expect(r.consentimientos).toMatchObject({ senalesRostro: false, senalesVoz: false, gestosCamara: false });
  });
});

describe('learning signals (4.9): coarse states only, never per student', () => {
  it('bounds the support state to 3 dimensions x 3 levels', () => {
    expect(NivelSenal.options).toEqual(['bajo', 'medio', 'alto']);
    const dims = Object.keys(EstadoApoyo.shape).filter((k) => k !== 'confianza');
    expect(dims.sort()).toEqual(['atencion', 'confusion', 'frustracion']);
    expect(EstadoApoyo.safeParse({ confusion: 'muy_alto', frustracion: 'bajo', atencion: 'alto', confianza: 0.5 }).success).toBe(false);
  });

  it('only senales.agregado carries signal data, and it never names a student', () => {
    const AFECTIVAS = ['confusion', 'frustracion', 'atencion'];
    for (const [tipo, esquema] of Object.entries(DATOS_POR_TIPO)) {
      const keys = propertyKeys(esquema as z.ZodType);
      const llevaSenales = AFECTIVAS.some((k) => keys.has(k));
      if (tipo === 'senales.agregado') {
        expect(llevaSenales).toBe(true);
        expect(keys.has('estudianteId')).toBe(false);
        expect(keys.has('estudianteIds')).toBe(false);
      } else {
        expect(llevaSenales, tipo).toBe(false);
      }
    }
  });

  it('rejects an aggregate that smuggles a student id', () => {
    const conAlumno = { ...(validos.AgregadoSenales[0] as object), estudianteId: ids.estudiante1 };
    expect(AgregadoSenales.safeParse(conAlumno).success).toBe(false);
  });

  it('a senales.agregado event cannot be attributed to students', () => {
    const e = evento('senales.agregado', validos.AgregadoSenales[0], {
      autor: { grupoId: ids.grupo1, estudianteIds: [ids.estudiante1] },
    });
    expect(EventoValidado.safeParse(e).success).toBe(false);
  });
});

describe('event log (3.3, 3.5)', () => {
  it('has a datos schema for every event type', () => {
    expect(Object.keys(DATOS_POR_TIPO).sort()).toEqual([...TIPOS_EVENTO].sort());
  });

  it('requires a teacher signature on every authority event', () => {
    expect(TIPOS_AUTORIDAD_DOCENTE).toEqual(
      expect.arrayContaining(['clase.creada', 'tutor.interruptor', 'senales.interruptor', 'estudiante.olvidar', 'evidencia.confirmada']),
    );
    const sinFirma = evento('tutor.interruptor', { activo: false });
    expect(EventoValidado.safeParse(sinFirma).success).toBe(false);
    expect(EventoValidado.safeParse({ ...sinFirma, firma: 'MEUCIQ' }).success).toBe(true);
  });

  it('validates datos against the event type', () => {
    expect(EventoValidado.safeParse(evento('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 9 })).success).toBe(false);
  });

  it('a published practice must be approved', () => {
    const borrador = { ...(validos.Practica[0] as object), estado: 'borrador' };
    expect(EventoValidado.safeParse(evento('practica.publicada', borrador, { firma: 'MEUCIQ' })).success).toBe(false);
  });

  it('a challenge progress never carries a score', () => {
    const conPuntaje = { retoId: 'feria-1', grupoId: ids.grupo1, paso: 2, completado: false, puntaje: 10 };
    expect(EventoValidado.safeParse(evento('reto.progreso', conPuntaje)).success).toBe(false);
  });
});

describe('quipu ledger (3.11)', () => {
  it('only allows negative knots as a teacher correction of a previous entry', () => {
    const base = validos.AsientoQuipu[0] as Record<string, unknown>;
    expect(AsientoQuipu.safeParse({ ...base, nudos: -1 }).success).toBe(false);
    expect(
      AsientoQuipu.safeParse({ ...base, nudos: -1, motivo: 'correccion_docente', emitidoPor: 'docente', corrigeA: ids.asiento }).success,
    ).toBe(true);
  });
});

describe('packages and QR frames (3.2, 3.6)', () => {
  it('rejects an unsigned practice package', () => {
    const p = { ...(validos.PaqueteValidado[0] as Record<string, unknown>) };
    delete p.firma;
    expect(PaqueteValidado.safeParse(p).success).toBe(false);
  });

  it('matches the RK1 frame format', () => {
    expect(MARCO_QR_REGEX.test('RK1:E:0A1Z:1:7:1X2Y3Z:ABC $%*+-./:')).toBe(true);
    expect(MARCO_QR_REGEX.test('RK1:X:0A1Z:1:7:1X2Y3Z:ABC')).toBe(false);
    expect(MARCO_QR_REGEX.test('rk1:E:0a1z:1:7:1x2y3z:abc')).toBe(false);
  });
});

describe('sync messages (3.5)', () => {
  it('HOLA, DELTA and ACK share the class id and version vector shape', () => {
    const tipos = (validos.MensajeSync as Array<{ t: string }>).map((m) => m.t).sort();
    expect(tipos).toEqual(['ack', 'delta', 'hola']);
    expect(MensajeSync.safeParse({ t: 'ack', claseId: ids.clase, vv: { CORTO: 1 } }).success).toBe(false);
  });
});

describe('real time (3.9): closed reactions, no chat', () => {
  it('only accepts reactions from the closed list', () => {
    expect(MensajeRtCliente.safeParse({ t: 'rt.gesto', g: 'aplaudir' }).success).toBe(true);
    expect(MensajeRtCliente.safeParse({ t: 'rt.gesto', g: 'hola' }).success).toBe(false);
  });

  it('rejects free text on any client message', () => {
    expect(MensajeRtCliente.safeParse({ t: 'rt.gesto', g: 'ayuda', texto: 'hola' }).success).toBe(false);
    expect(MensajeRtCliente.safeParse({ t: 'rt.chat', texto: 'hola' }).success).toBe(false);
  });
});

describe('tutor tools (4.4)', () => {
  it('derives the JSON Schema the LLM sees from the Zod union', () => {
    const js = comandoJsonSchema() as { oneOf?: unknown[]; anyOf?: unknown[] };
    const variantes = js.oneOf ?? js.anyOf ?? [];
    expect(variantes).toHaveLength(12);
  });

  it('never lets a hint skip beyond the ladder', () => {
    expect(Comando.safeParse({ tool: 'dar_pista', args: { nivel: 5 } }).success).toBe(false);
  });
});

describe('bus (3.8)', () => {
  it('no longer carries learning events', () => {
    expect(BusMessage.safeParse({ type: 'event', event: {} }).success).toBe(false);
  });
});
