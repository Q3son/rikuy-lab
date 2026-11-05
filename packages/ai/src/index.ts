/**
 * @rikuy/ai: AI ports and adapters, router and budget (docs/ecosistema/ARQUITECTURA_ECOSISTEMA.md, 4 and 5.4).
 * The keyed adapters (Gemini, Meta) are NOT exported from here: they are node-only subpaths (2.3.3).
 */
export const packageName = '@rikuy/ai' as const;
export * from './result.ts';
export * from './esquemas.ts';
export * from './puertos.ts';
export * from './texto.ts';
export * from './verificador.ts';
