/**
 * @rikuy/evidencia: evidence aggregation for the teacher panel (5.4 F6).
 * Pure functions over contract events: literal quotes, "no evaluable", confirmation,
 * competency coverage, the three-part class summary and, in ./plantillas, report templates.
 */
export const packageName = '@rikuy/evidencia' as const;
export * from './cita.ts';
export * from './proyeccion.ts';
export * from './competencias.ts';
export * from './evidencias.ts';
export * from './avance.ts';
export * from './cobertura.ts';
export * from './resumen.ts';
