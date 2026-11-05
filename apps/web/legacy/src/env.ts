/**
 * Modo estático (GitHub Pages u otro hosting sin servidor):
 * un solo celular, tutor de reglas en el navegador y sin sincronizar eventos.
 * Se activa al compilar con VITE_STATIC=1.
 */
export const STATIC = import.meta.env.VITE_STATIC === '1';
