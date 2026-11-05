/**
 * @rikuy/campus: Museo Rikuy domain (Tiled maps, halls, exhibits, collision, BFS, director, presence client,
 * Ayudante del museo). The Canvas renderer lives in `@rikuy/campus/canvas`.
 * Pattern credit: AulaQuipu by paoloose (https://github.com/paoloose/aulaquipu). No code or art copied.
 */
export const packageName = '@rikuy/campus' as const;
export * from './ayudante.ts';
export * from './caminante.ts';
export * from './contenido.ts';
export * from './director.ts';
export * from './generador.ts';
export * from './grilla.ts';
export * from './presencia.ts';
export * from './puertos.ts';
export * from './salas.ts';
export * from './tiled.ts';
