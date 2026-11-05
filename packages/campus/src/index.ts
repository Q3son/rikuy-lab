/**
 * @rikuy/campus: Museo Rikuy domain (Tiled maps, halls, exhibits, collision, BFS, director, presence client,
 * Ayudante del museo). The Canvas renderer lives in `@rikuy/campus/canvas`.
 * Pattern credit: AulaQuipu (team project) (https://github.com/paoloose/aulaquipu). The hall chat rules
 * (`charla.ts`) are adapted from it; no third-party art (see docs/ATRIBUCIONES.md).
 */
export const packageName = '@rikuy/campus' as const;
export * from './ayudante.ts';
export * from './caminante.ts';
export * from './charla.ts';
export * from './curador.ts';
export * from './contenido.ts';
export * from './director.ts';
export * from './generador.ts';
export * from './grilla.ts';
export * from './piedra.ts';
export * from './presencia.ts';
export * from './puertos.ts';
export * from './salas.ts';
export * from './tiled.ts';
