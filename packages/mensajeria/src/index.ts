/**
 * @rikuy/mensajeria: delivery port, queue rules, honest delivery states, and the simulated, wa.me and local PDF adapters.
 * Network adapters (WhatsApp Cloud, e-mail) live in `apps/cloud`. Hard rule: this package never imports `senales`.
 */
export const packageName = '@rikuy/mensajeria' as const;
export * from './result.ts';
export * from './puertos.ts';
export * from './estados.ts';
export * from './esquemas.ts';
export * from './cola.ts';
export * from './adaptadores/simulado.ts';
export * from './adaptadores/enlace-wame.ts';
export * from './adaptadores/pdf-local.ts';
