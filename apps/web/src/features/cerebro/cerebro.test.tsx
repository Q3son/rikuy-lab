import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { construirMapa } from '@rikuy/cerebro';
import { GRAFO_DEMO, memoriaDemo } from './datosDemo.ts';
import { CerebroPage } from './CerebroPage.tsx';
import { ListaCerebro } from './ListaCerebro.tsx';
import { MapaCerebroSvg } from './MapaCerebroSvg.tsx';

afterEach(cleanup);

const vacio = construirMapa({ grafo: GRAFO_DEMO, memoria: [], evidencias: [], exploraciones: [] });
const conLogro = construirMapa({ grafo: GRAFO_DEMO, ...memoriaDemo() });

describe('MapaCerebroSvg', () => {
  it('is one SVG with a summary label and a node per concept', () => {
    const { container } = render(<MapaCerebroSvg mapa={conLogro} onSeleccionar={() => {}} />);
    const svg = container.querySelector('svg[role="group"]');
    expect(svg?.getAttribute('aria-label')).toMatch(/Mi Cerebro Rikuy/);
    expect(container.querySelectorAll('[data-nodo]').length).toBe(GRAFO_DEMO.nodos.length);
  });

  it('unlit nodes are dashed hollow rings; lit ones are never dashed', () => {
    const { container } = render(<MapaCerebroSvg mapa={conLogro} onSeleccionar={() => {}} />);
    for (const n of conLogro.nodos) {
      const circulo = container.querySelector(`[data-nodo="${n.id}"] circle[data-cuerpo]`);
      const dashed = circulo?.getAttribute('stroke-dasharray');
      if (n.estado === 'sin_explorar') expect(dashed).toBeTruthy();
      else expect(dashed).toBeFalsy();
    }
  });

  it('shows "?" as a mark for an open question, and selection works by click', async () => {
    const u = userEvent.setup();
    const onSeleccionar = vi.fn();
    const { container } = render(<MapaCerebroSvg mapa={conLogro} onSeleccionar={onSeleccionar} />);
    expect(container.textContent).toContain('?');
    const nodo = container.querySelector('[data-nodo]') as SVGElement;
    await u.click(nodo);
    expect(onSeleccionar).toHaveBeenCalledWith(nodo.getAttribute('data-nodo'));
  });
});

describe('ListaCerebro (accessible alternative)', () => {
  it('spells the state of each node with the names of the IA', () => {
    render(<ListaCerebro mapa={conLogro} onSeleccionar={() => {}} />);
    const lista = screen.getAllByRole('list')[0] as HTMLElement;
    expect(lista).toBeTruthy();
    expect(screen.getAllByText(/Razonado|Por revisar|Explorado|Sin explorar/).length).toBeGreaterThan(3);
    expect(screen.queryByText(/en_camino|logrado/)).toBeNull();
  });
});

describe('CerebroPage', () => {
  it('shows the empty brain honestly', () => {
    render(<CerebroPage mapaInicial={vacio} />);
    expect(screen.getByText('Rikuy aún no recuerda nada de ti')).toBeTruthy();
  });

  it('opens "¿Por qué está así?" with the literal quote', async () => {
    const u = userEvent.setup();
    render(<CerebroPage mapaInicial={conLogro} />);
    await u.click(screen.getByRole('button', { name: 'Ver como lista' }));
    const item = screen.getByRole('button', { name: /Periodo/ });
    await u.click(item);
    const placa = screen.getByRole('dialog', { name: /¿Por qué está así\?/ });
    expect(within(placa).getByText(/Entre más larga la cuerda/)).toBeTruthy();
    expect(within(placa).getAllByText(/Razonado/).length).toBeGreaterThan(0);
  });

  it('has no completion percentage and no comparison with others', () => {
    const { container } = render(<CerebroPage mapaInicial={conLogro} />);
    expect(container.textContent).not.toMatch(/%|completado|ranking|compañeros/i);
  });
});
