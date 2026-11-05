/**
 * Contract fixtures (`@rikuy/contracts/fixtures`). Every front uses these in its tests.
 * `validos[Nombre]` must pass `esquemas[Nombre].safeParse`; `invalidos[Nombre]` must fail it.
 */
export * from './ids.ts';
export { validos } from './validos.ts';
export * as ejemplos from './validos.ts';
export { invalidos, type CasoInvalido } from './invalidos.ts';
