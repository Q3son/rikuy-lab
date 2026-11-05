import { expectSinViolacionesGraves } from '@rikuy/ui/testing';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from '../../test-utils.tsx';
import { useAyudante } from './ayudante/servicio.ts';
import { useEstadoGrupo } from './estadoGrupo.ts';

const abrir = () => renderApp('/quipu', { rol: 'grupo', codigo: 'ABC123', apodo: 'Puma' });
const SIN_PUNTAJES = /ranking|puntos|racha|comprar|tienda/i;

beforeEach(() => {
  useEstadoGrupo.getState().reiniciar();
  useAyudante.setState((s) => ({ estado: { ...s.estado, nudos: [] } }));
});

const NUDOS = Array.from({ length: 3 }, (_, i) => ({
  id: `nudo-${i}`,
  pedidoId: `pedido-${i}`,
  grupoAyudaId: `01JC0000000000000000000H0${i}`,
  grupoPideId: `01JC0000000000000000000P0${i}`,
  nodoId: `nodo-${i}`,
  estado: 'confirmado' as const,
  ts: 1_762_300_800_000 + i * 60_000,
}));

describe('Quipu tab (class cord from the @rikuy/quipu ledger)', () => {
  it('starts with an empty cord that says how knots are earned, without any score', async () => {
    await abrir();
    expect(screen.getByRole('heading', { level: 1, name: 'Quipu de logros' })).toBeTruthy();
    expect(screen.getByText('Aún no hay nudos. Los nudos se ganan ayudando al grupo.')).toBeTruthy();
    expect(screen.queryByText(SIN_PUNTAJES)).toBeNull();
  });

  it('shows the class balance from the confirmed help knots and what it already opened for everyone', async () => {
    useAyudante.setState((s) => ({ estado: { ...s.estado, nudos: NUDOS } }));
    await abrir();
    const total = Number(/tiene (\d+) nudos/.exec(screen.getByText(/El quipu del aula tiene/).textContent ?? '')?.[1]);
    expect(total).toBeGreaterThanOrEqual(5);
    // cooperative reason: help between groups, never a list of groups ordered by knots
    expect(screen.getByText('Ayudar a otro grupo')).toBeTruthy();
    const abiertas = screen.getByRole('list', { name: 'Ya se abrió para todos' });
    expect(within(abiertas).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Nuestra piedra/ }).getAttribute('href')).toBe('/museo/piedra');
    expect(screen.queryByText(SIN_PUNTAJES)).toBeNull();
  });

  it('does not count knots still waiting for the teacher', async () => {
    useAyudante.setState((s) => ({ estado: { ...s.estado, nudos: NUDOS.map((n) => ({ ...n, estado: 'por_confirmar' as const })) } }));
    await abrir();
    expect(screen.getByText(/Aún no hay nudos/)).toBeTruthy();
  });

  it('keeps the legend of the three knot types and passes axe', async () => {
    const { container } = await abrir();
    expect(screen.getByText('Nudo simple: terminaron una exhibición')).toBeTruthy();
    expect(screen.getByText('Nudo largo: explicaron algo a otro grupo')).toBeTruthy();
    expect(screen.getByText('Nudo en ocho: resolvieron algo juntos')).toBeTruthy();
    await expectSinViolacionesGraves(container);
  });
});
