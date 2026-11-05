/**
 * @rikuy/reportes: competency report models, small-cell suppression, monthly director/UGEL model,
 * Caja de dudas heatmap, printable HTML and CSV. Pure; renderers are separate. Never imports Guardián.
 */
export const packageName = '@rikuy/reportes' as const;
export * from './suprimir.ts';
export * from './competencias.ts';
export * from './mensual.ts';
export * from './dudas.ts';
export * from './csv.ts';
export * from './html.ts';
export * from './pdf.ts';
