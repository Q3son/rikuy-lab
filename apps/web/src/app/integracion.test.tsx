import 'fake-indexeddb/auto';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useBandejaGuardian } from '../features/guardian/bandeja.ts';
import { renderApp } from '../test-utils.tsx';

const GRUPO = { rol: 'grupo', codigo: 'ABC123', apodo: 'Puma' } as const;

describe('every feature is reachable from the tabs', () => {
  it('the Lab tab opens the pendulum practice', async () => {
    const { router } = await renderApp('/museo', GRUPO);
    await userEvent.click(screen.getByRole('tab', { name: 'Lab' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/lab/pendulo'));
  });

  it('Yo leads to the check-in, the Caja de dudas, the pictogram builder and accessibility', async () => {
    await renderApp('/yo', GRUPO);
    for (const [nombre, ruta] of [
      ['¿Cómo vamos? Contarle a Rikuy', '/yo/checkin'],
      ['Tengo una duda', '/yo/dudas'],
      ['Armar una frase con pictogramas', '/lab/inicio'],
      ['Accesibilidad', '/yo/accesibilidad'],
    ] as const) {
      expect(screen.getByRole('link', { name: nombre })).toHaveAttribute('href', ruta);
    }
  });

  it('a doubt sent from Yo reaches the teacher heatmap tray without a name', async () => {
    await renderApp('/yo/dudas', GRUPO);
    await userEvent.click(await screen.findByRole('radio', { name: /Longitud de la cuerda/ }));
    await userEvent.click(screen.getByRole('button', { name: /Enviar/ }));
    expect(await screen.findByText(/No lleva tu nombre/)).toBeInTheDocument();
    const [duda] = useBandejaGuardian.getState().dudas;
    expect(duda).toMatchObject({ conceptoId: 'longitud', exhibicionId: 'exh-pendulo' });
    expect(JSON.stringify(duda)).not.toContain('Puma');
  });

  it('the teacher sees the Guardián and doubt views under Clase and Reportes', async () => {
    const { router } = await renderApp('/docente/reportes/dudas', { rol: 'docente' });
    expect(await screen.findByRole('heading', { name: 'Caja de dudas de la clase' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Reportes' })).toHaveAttribute('aria-selected', 'true');
    await router.navigate('/docente/clase/acercarse');
    expect(await screen.findByText('Esta semana no hay sugerencias.')).toBeInTheDocument();
    expect(screen.getByText(/nivel 2\) están apagadas/)).toBeInTheDocument();
  });
});
