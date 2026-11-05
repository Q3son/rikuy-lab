/** What the Caja de dudas offers for the pendulum exhibit and how the heatmap names the exhibit. */
export const EXHIBICION_PENDULO = 'exh-pendulo';
export const EXHIBICIONES: Record<string, string> = { [EXHIBICION_PENDULO]: 'Péndulo' };

/** Fixed list for the box: no free search, so a doubt never becomes a chat. */
export const CONCEPTOS_DUDAS: { id: string; etiqueta: string }[] = [
  { id: 'periodo', etiqueta: 'Periodo (lo que tarda una ida y vuelta)' },
  { id: 'longitud', etiqueta: 'Longitud de la cuerda' },
  { id: 'masa', etiqueta: 'Masa del lastre' },
  { id: 'gravedad', etiqueta: 'Gravedad' },
  { id: 'variable', etiqueta: 'Qué es una variable' },
  { id: 'promedio', etiqueta: 'Cómo sacar el promedio' },
];

