/**
 * Allow-list input schemas of the report templates (FUNCIONES_EXTRA 1.5). Every schema is strict:
 * a field that is not listed here (a student name, a Guardian state, a score) is a validation
 * error at runtime and a type error at compile time. Proposed to @rikuy/contracts (PROPUESTAS_CONTRATOS.md).
 */
import { z } from 'zod';
import { PICTOGRAMAS, type PictoId } from '../pictogramas.ts';
import { contarPalabras, FECHA_ISO } from './texto.ts';

export const FechaIso = z.string().regex(FECHA_ISO);
const Url = z.url();
const Palabras = (max: number) => z.string().trim().min(1).refine((s) => contarPalabras(s) <= max, { message: `at most ${max} words` });

const PictoIdSchema = z.enum(Object.keys(PICTOGRAMAS) as [PictoId, ...PictoId[]]);

// ---- Family weekly message (variants A and B) ------------------------------------------------

const BaseFamilia = {
  fechaIni: FechaIso,
  fechaFin: FechaIso,
  verbo: Palabras(2),
  exhibicionCorta: Palabras(8),
  preguntaCasa: Palabras(18),
  lengua: z.enum(['es', 'quy']),
  /** Recorded by a speaker. Never synthetic Quechua. */
  audioUrl: Url.optional(),
  enlaceLigero: Url,
  pictogramas: z.array(PictoIdSchema).max(3).default([]),
  fraseLocal: Palabras(12).optional(),
  /** Quechua text is allowed only when a speaker reviewed it. */
  parrafoQuechua: z.strictObject({ texto: z.string().min(1).max(280), revisado: z.literal(true) }).optional(),
};

export const NombrePila = z.string().trim().min(1).max(20).regex(/^\p{L}+$/u, 'first name only: letters, no spaces');

export const LineaPositiva = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('ayudo') }),
  z.strictObject({ tipo: z.literal('frase'), texto: Palabras(14) }),
]);

export const EntradaFamilia = z.discriminatedUnion('variante', [
  z.strictObject({ ...BaseFamilia, variante: z.literal('A') }),
  z.strictObject({ ...BaseFamilia, variante: z.literal('B'), nombre: NombrePila, linea: LineaPositiva }),
]);
export type EntradaFamilia = z.input<typeof EntradaFamilia>;
export type EntradaFamiliaValida = z.output<typeof EntradaFamilia>;


// ---- Weekly digest for the teacher-tutor ------------------------------------------------------

const Entero = z.number().int().min(0);
const Etiqueta = z.string().trim().min(1).max(120);

export const ConceptoCosto = z.strictObject({ concepto: Etiqueta, gruposAfectados: Entero, gruposTotal: Entero });

export const EntradaTutora = z.strictObject({
  claseEtiqueta: z.string().trim().min(1).max(30),
  fechaIni: FechaIso,
  fechaFin: FechaIso,
  exhibiciones: Entero,
  gruposEntregaron: Entero,
  gruposTotal: Entero,
  competencia: z.strictObject({
    nombre: Etiqueta,
    capacidades: z.array(z.strictObject({ nombre: Etiqueta, conEvidencia: Entero, trabajadas: Entero })).max(5),
  }),
  costaron: z.array(ConceptoCosto).max(3),
  dudas: z.array(z.strictObject({ tema: Etiqueta })).max(3).optional(),
  ayuda: z.strictObject({ pedidos: Entero, cerrados: Entero, nudosPorConfirmar: Entero }).optional(),
  pendientes: z.strictObject({
    gruposSinEntregar: Entero,
    nudosPorConfirmar: Entero,
    vitrinasPorAbrir: Entero,
    mensajesPorAprobar: Entero,
    cierreEscolar: z.strictObject({ fecha: FechaIso, fuente: Etiqueta }).optional(),
  }),
  proxima: z.strictObject({ titulo: Etiqueta }).optional(),
  fraseLocal: Palabras(12).optional(),
  enlaceApp: Url,
  /** Free text such as "viernes 17:00". */
  sincronizadoHasta: z.string().trim().min(1).max(40),
});
export type EntradaTutora = z.input<typeof EntradaTutora>;

// ---- Monthly report for the principal and the UGEL --------------------------------------------

const Capacidad = z.strictObject({ nombre: Etiqueta, gruposConEvidencia: Entero, gruposTotal: Entero });

export const EntradaInforme = z.strictObject({
  alcance: z.enum(['director', 'ugel']),
  institucion: Etiqueta,
  /** YYYY-MM */
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  datosSimulados: z.boolean().default(false),
  sincronizacion: z.strictObject({ aulasSincronizadas: Entero, aulasTotal: Entero, ultima: FechaIso }),
  cifras: z.strictObject({
    exhibicionesRealizadas: Entero,
    seccionesActivas: Entero,
    pctSesionesConEvidencia: z.number().int().min(0).max(100),
    diasCierreCubiertos: Entero,
    coberturaDatosPct: z.number().int().min(0).max(100),
  }),
  cobertura: z.array(z.strictObject({ seccion: z.string().trim().min(1).max(30), capacidades: z.array(Capacidad).max(5) })).max(40),
  conceptos: z.array(ConceptoCosto).max(5),
  continuidad: z.strictObject({ diasCierre: Entero, paquetesEnviados: Entero, paquetesDevueltosQr: Entero, porCanal: z.strictObject({ qr: Entero, whatsapp: Entero, a4: Entero }) }),
  brechas: z.strictObject({ sesionesSinRed: Entero, horasAudioQuechua: z.number().min(0) }),
  ayuda: z.strictObject({ pedidos: Entero, cerrados: Entero }).optional(),
  /** UGEL only: one row per school, identified by its modular code. */
  territorial: z.array(z.strictObject({ codigoModular: z.string().regex(/^\d{7}$/), gruposConEvidencia: Entero, gruposTotal: Entero })).max(200).optional(),
});
export type EntradaInforme = z.input<typeof EntradaInforme>;
export type EntradaInformeValida = z.output<typeof EntradaInforme>;

/** Minimum cell size: anything with fewer groups is suppressed (4.7, DESIGN 12). */
export const MIN_CELDA = 5;
