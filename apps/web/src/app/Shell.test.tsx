import { expectSinViolacionesGraves } from '@rikuy/ui/testing';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useVersion } from '../platform/pwa/actualizacion.ts';
import { useAjustesA11y } from '../shell/accesibilidad/ajustes.ts';
import { useCamara, useRed, useUi } from '../shell/estado.ts';
import { useJornada } from '../shell/jornada.ts';
import { useSesion } from '../shell/sesion.ts';
import { renderApp } from '../test-utils.tsx';

const GRUPO = { rol: 'grupo', codigo: 'ABC123', apodo: 'Puma' } as const;

describe('entry: role selection', () => {
  it('shows the Rikuy heading, two roles and keeps the classic hologram reachable', async () => {
    await renderApp('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Rikuy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Soy docente/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Somos un grupo/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /holográfico/ })).toHaveAttribute('href', './clasico.html');
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('the teacher goes to "Mi clase de hoy" with the teacher tabs', async () => {
    await renderApp('/');
    await userEvent.click(screen.getByRole('button', { name: /Soy docente/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Mi clase de hoy' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Navegación de la docente' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hoy', 'Clase', 'Evidencia', 'Reportes', 'Ajustes']);
    expect(within(tabs).getByRole('tab', { name: 'Hoy' })).toHaveAttribute('aria-selected', 'true');
    expect(useSesion.getState().rol).toBe('docente');
  });

  it('a group goes to the join form first', async () => {
    await renderApp('/');
    await userEvent.click(screen.getByRole('button', { name: /Somos un grupo/ }));
    expect(await screen.findByRole('heading', { name: 'Entrar a la clase' })).toBeInTheDocument();
  });
});

describe('join by class code plus nickname', () => {
  it('names the fix next to each field and joins nothing while invalid', async () => {
    await renderApp('/entrar', { rol: 'grupo' });
    await userEvent.click(screen.getByRole('button', { name: 'Entrar al museo' }));
    expect(screen.getByText('Escribe los 6 caracteres del código, solo letras y números.')).toBeInTheDocument();
    expect(screen.getByText('Elige el apodo de tu grupo.')).toBeInTheDocument();
    expect(useSesion.getState().codigoClase).toBeNull();
  });

  it('enters the museum with the student tabs and remembers the class', async () => {
    await renderApp('/entrar', { rol: 'grupo' });
    await userEvent.type(screen.getByLabelText('Código de la clase'), 'cyt-2b4');
    await userEvent.selectOptions(screen.getByLabelText('Apodo del grupo'), 'Puma');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar al museo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Museo Rikuy' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Navegación del grupo' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Museo', 'Lab', 'Cerebro', 'Quipu', 'Yo']);
    expect(useSesion.getState()).toMatchObject({ codigoClase: 'CYT2B4', apodo: 'Puma' });
  });

  it('asks how the group wants to work today, and "con apoyo" turns the audio mode on', async () => {
    await renderApp('/entrar', { rol: 'grupo' });
    const grupo = screen.getByRole('radiogroup', { name: '¿Cómo queremos trabajar hoy?' });
    expect(within(grupo).getAllByRole('radio')).toHaveLength(3);
    await userEvent.click(within(grupo).getByRole('radio', { name: /Con apoyo/ }));
    await userEvent.type(screen.getByLabelText('Código de la clase'), 'ABC123');
    await userEvent.selectOptions(screen.getByLabelText('Apodo del grupo'), 'Alpaca');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar al museo' }));
    await screen.findByRole('heading', { level: 1, name: 'Museo Rikuy' });
    expect(useSesion.getState().nivel).toBe('apoyo');
    expect(useAjustesA11y.getState().modoAudio).toBe(true);
  });
});

describe('student tabs', () => {
  it('lists every tab with its screen', async () => {
    await renderApp('/museo', GRUPO);
    expect(screen.getByRole('tab', { name: 'Museo' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Vestíbulo del Museo Rikuy' })).toBeInTheDocument();
    for (const [tab, titulo] of [['Lab', 'Lab'], ['Cerebro', 'Mi Cerebro Rikuy'], ['Quipu', 'Quipu de logros'], ['Yo', 'Yo']] as const) {
      await userEvent.click(screen.getByRole('tab', { name: tab }));
      expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    }
  });

  it('the quipu shows the three knot types with a legend and no ranking', async () => {
    await renderApp('/quipu', GRUPO);
    expect(screen.getByText('Nudo simple: terminaron una exhibición')).toBeInTheDocument();
    expect(screen.getByText('Nudo largo: explicaron algo a otro grupo')).toBeInTheDocument();
    expect(screen.getByText('Nudo en ocho: resolvieron algo juntos')).toBeInTheDocument();
    expect(screen.queryByText(/ranking|puntos|racha/i)).toBeNull();
  });

  it('a student without a class cannot see the museum: back to the entry', async () => {
    const { router } = await renderApp('/museo', { rol: 'grupo' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
  });

  it('nobody without a role gets past the entry', async () => {
    const { router } = await renderApp('/hoy');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});

describe('Mi clase de hoy', () => {
  it('shows the four-stage stepper and the empty state when there is no class', async () => {
    useJornada.getState().cerrar();
    await renderApp('/hoy', { rol: 'docente' });
    const pasos = screen.getByRole('list', { name: 'Los cuatro tramos de tu clase' });
    expect(within(pasos).getAllByRole('listitem')).toHaveLength(4);
    expect(within(pasos).getByRole('link', { name: /Preparar/ })).toHaveAttribute('aria-current', 'step');
    expect(within(pasos).getByRole('link', { name: /Museo/ }).textContent).toContain('después');
    expect(screen.getByText('Aún no hay una clase abierta')).toBeInTheDocument();
  });

  it('with an open class it shows the code, the groups and one main action', async () => {
    await renderApp('/hoy', { rol: 'docente' });
    act(() => useJornada.getState().abrir({ titulo: 'Péndulo: ¿de qué depende lo que tarda?', codigo: 'CYT2B4', grupos: 6, tramo: 'museo' }));
    expect(await screen.findByText('Péndulo: ¿de qué depende lo que tarda?')).toBeInTheDocument();
    expect(screen.getByText('Código de la clase: CYT2B4')).toBeInTheDocument();
    expect(screen.getByText('6 grupos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir el museo' })).toBeInTheDocument();
    const pasos = screen.getByRole('list', { name: 'Los cuatro tramos de tu clase' });
    expect(within(pasos).getByRole('link', { name: /Museo/ })).toHaveAttribute('aria-current', 'step');
    expect(within(pasos).getByRole('link', { name: /Preparar/ }).textContent).toContain('lista');
    act(() => useJornada.getState().cerrar());
  });
});

describe('top bar status', () => {
  it('names where the data is: offline is a normal state', async () => {
    await renderApp('/museo', GRUPO);
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Con red, todo guardado')).toBe(true);
    act(() => useRed.getState().reportar({ enLinea: false }));
    expect(await screen.findByText('Sin red, todo guardado')).toBeInTheDocument();
    act(() => useRed.getState().reportar({ pendientes: 3 }));
    expect(await screen.findByText('3 mediciones por enviar')).toBeInTheDocument();
  });

  it('shows the camera pill while a camera is active, with a kill-switch', async () => {
    await renderApp('/museo', GRUPO);
    expect(screen.queryByText('Cámara activa')).toBeNull();
    const apagar = vi.fn();
    act(() => useCamara.getState().reportar(true, apagar));
    expect(await screen.findByText('Cámara activa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Apagar la cámara' }));
    expect(apagar).toHaveBeenCalledOnce();
  });
});

describe('versión nueva banner', () => {
  it('appears when a new worker waits and updates on demand', async () => {
    await renderApp('/');
    expect(screen.queryByText('Hay una versión nueva de Rikuy.')).toBeNull();
    const aplicar = vi.fn();
    act(() => useVersion.setState({ nueva: true, aplicar }));
    expect(await screen.findByText('Hay una versión nueva de Rikuy.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(aplicar).toHaveBeenCalledOnce();
  });

  it('can be dismissed with "Después"', async () => {
    await renderApp('/');
    act(() => useVersion.setState({ nueva: true, aplicar: vi.fn() }));
    await userEvent.click(await screen.findByRole('button', { name: 'Después' }));
    expect(screen.queryByText('Hay una versión nueva de Rikuy.')).toBeNull();
  });
});

describe('old URLs', () => {
  it('display.html redirects to the hologram route keeping the query', async () => {
    const { router } = await renderApp('/display.html?sala=ABC');
    await waitFor(() => expect(router.state.location.pathname).toBe('/holo'));
    expect(router.state.location.search).toBe('?modo=display&sala=ABC');
  });
});

describe('settings: language, theme and accessibility', () => {
  it('switching to Quechua keeps unreviewed strings in Spanish and updates the html language', async () => {
    await renderApp('/ajustes', { rol: 'docente' });
    await userEvent.selectOptions(screen.getByLabelText('Lengua de la aplicación'), 'quy');
    await waitFor(() => expect(document.documentElement.lang).toBe('quy'));
    expect(screen.getByRole('tab', { name: 'Hoy' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clase' })).toBeInTheDocument();
    expect(useUi.getState().lengua).toBe('quy');
    expect(screen.getByText('0 de 5 frases revisadas por hablantes')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Lengua de la aplicación'), 'es');
  });

  it('theme selector sets data-theme (Luz, Noche, Holograma) and automatic removes it', async () => {
    await renderApp('/ajustes', { rol: 'docente' });
    const tema = screen.getByRole('radiogroup', { name: 'Tema' });
    await userEvent.click(within(tema).getByRole('radio', { name: 'Noche' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await userEvent.click(within(tema).getByRole('radio', { name: 'Holograma' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'holo');
    await userEvent.click(within(tema).getByRole('radio', { name: 'Luz' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await userEvent.click(within(tema).getByRole('radio', { name: 'Automática' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('the accessibility panel is reachable from Ajustes and from Yo', async () => {
    const a = await renderApp('/ajustes', { rol: 'docente' });
    expect(screen.getByRole('switch', { name: 'Modo audio' })).toBeInTheDocument();
    a.unmount();
    await renderApp('/yo', GRUPO);
    expect(screen.getByRole('switch', { name: 'Modo audio' })).toBeInTheDocument();
  });

  it('applies the text size to the whole app through the root', async () => {
    await renderApp('/ajustes', { rol: 'docente' });
    await userEvent.click(screen.getByRole('button', { name: 'Texto más grande' }));
    expect(document.documentElement.style.getPropertyValue('--rk-text-scale')).toBe('1.25');
  });
});

describe('every card has a speak / stop button', () => {
  it('the empty-state cards offer "Escuchar"', async () => {
    await renderApp('/quipu', GRUPO);
    expect(screen.getAllByRole('button', { name: 'Escuchar' }).length).toBeGreaterThanOrEqual(1);
  });
});

describe('axe: no serious violations on the main screens', () => {
  const casos: [string, string, Parameters<typeof renderApp>[1]][] = [
    ['entry', '/', {}],
    ['join', '/entrar', { rol: 'grupo' }],
    ['museo', '/museo', GRUPO],
    ['lab', '/lab', GRUPO],
    ['cerebro', '/cerebro', GRUPO],
    ['quipu', '/quipu', GRUPO],
    ['yo', '/yo', GRUPO],
    ['hoy', '/hoy', { rol: 'docente' }],
    ['clase', '/clase', { rol: 'docente' }],
    ['evidencia', '/evidencia', { rol: 'docente' }],
    ['reportes', '/reportes', { rol: 'docente' }],
    ['ajustes', '/ajustes', { rol: 'docente' }],
  ];
  it.each(casos)('%s', async (_nombre, ruta, opciones) => {
    const { container } = await renderApp(ruta, opciones);
    await waitFor(() => expect(container.querySelector('h1')).not.toBeNull());
    await expectSinViolacionesGraves(container);
  });
});
