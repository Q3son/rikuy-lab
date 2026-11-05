/**
 * Stable identifiers shared by every fixture. ULIDs use Crockford base32 (no I, L, O, U).
 * Fronts may import these to build their own scenarios on top of the contract fixtures.
 */
export const ids = {
  clase: '01JC0000000000000000000C01',
  aula: '01JC0000000000000000000A01',
  practica: '01JC0000000000000000000P01',
  grupo1: '01JC0000000000000000000G01',
  grupo2: '01JC0000000000000000000G02',
  estudiante1: '01JC0000000000000000000E01',
  estudiante2: '01JC0000000000000000000E02',
  estudiante3: '01JC0000000000000000000E03',
  medicion: '01JC0000000000000000000M01',
  respuesta: '01JC0000000000000000000R01',
  evidencia: '01JC0000000000000000000V01',
  memoria: '01JC0000000000000000000Y01',
  asiento: '01JC0000000000000000000Q01',
  evento1: '01JC000000000000000000EV01',
  evento2: '01JC000000000000000000EV02',
} as const;

/** Device ids are exactly 10 characters. */
export const dispositivos = {
  docente: 'DOCENTE001',
  grupo1: 'GRUPO00001',
  grupo2: 'GRUPO00002',
} as const;

/** Hybrid logical clocks: msUnix(13)-counter(4)-node(8). */
export const hlcs = {
  h1: '1762300800000-0000-docente1',
  h2: '1762300805000-0001-grupo001',
  h3: '1762300810000-0000-grupo002',
} as const;

/** A literal excerpt of a CNEB performance (secondary, 2nd grade, science and technology). */
export const citaDesempeno = 'Formula preguntas acerca de las variables que influyen en un hecho';

export const sha = 'a'.repeat(64);

/** An invalid fixture names the rule it breaks. */
export type CasoInvalido = { caso: string; valor: unknown };
