import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test-utils.tsx';

const GRUPO = { rol: 'grupo', codigo: 'ABC123', apodo: 'Puma' } as const;
const DOCENTE = { rol: 'docente' } as const;

/** Every screen inside the shell: the shell's top bar owns the single h1 and the single main landmark. */
const PANTALLAS_DEL_GRUPO = [
  '/museo',
  '/museo/lista',
  '/museo/sala-fisica',
  '/museo/piedra',
  '/retos',
  // /lab/pendulo needs IndexedDB (covered by e2e/lab/practica.avion.spec.ts)
  '/lab/inicio',
  '/cerebro',
  '/quipu',
  '/yo',
  '/yo/checkin',
  '/yo/dudas',
  '/yo/accesibilidad',
  '/tutor',
  '/relevo',
];
const PANTALLAS_DE_LA_DOCENTE = [
  '/docente',
  '/docente/nueva',
  '/docente/clase',
  '/docente/clase/museo',
  '/docente/clase/ayudas',
  '/docente/evidencia',
  '/docente/evidencia/evidencias',
  '/docente/reportes',
  '/docente/reportes/curso',
  '/docente/reportes/dudas',
  '/docente/reportes/envios',
  '/docente/ajustes',
  '/creador',
];

/** Lazy routes: the screen's own heading shows up after the shell's. */
const PROPIO: Record<string, RegExp> = {
  '/cerebro': /cerebro/i,
  '/tutor': /tutor/i,
  '/relevo': /relevo/i,
  '/creador': /creador/i,
};

async function cargada(ruta: string) {
  const esperado = PROPIO[ruta];
  if (esperado) await screen.findAllByRole("heading", { name: esperado }, { timeout: 4000 });
  else await waitFor(() => expect(screen.getAllByRole('heading').length).toBeGreaterThan(0), { timeout: 4000 });
}

describe.each([
  ['group', PANTALLAS_DEL_GRUPO, GRUPO],
  ['teacher', PANTALLAS_DE_LA_DOCENTE, DOCENTE],
] as const)('one h1 and one main per route (%s)', (_nombre, rutas, sesion) => {
  it.each(rutas.map((r) => [r] as const))('%s', async (ruta) => {
    await renderApp(ruta, sesion);
    await cargada(ruta);
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
