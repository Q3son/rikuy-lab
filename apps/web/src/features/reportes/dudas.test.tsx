import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapaDeCalorDudas, type DudaConcepto } from '@rikuy/reportes';
import { CajaDeDudas } from './CajaDeDudas.tsx';
import { MapaCalorDudas } from './MapaCalorDudas.tsx';

afterEach(cleanup);

const conceptos = [
  { id: 'periodo', etiqueta: 'Periodo' },
  { id: 'longitud', etiqueta: 'Longitud' },
];

describe('CajaDeDudas (student)', () => {
  it('sends a concept from a fixed list plus an optional short phrase, with no name field', async () => {
    const u = userEvent.setup();
    const onEnviar = vi.fn();
    render(<CajaDeDudas conceptos={conceptos} onEnviar={onEnviar} />);
    expect(screen.queryByLabelText(/nombre/i)).toBeNull();
    expect((screen.getByRole('button', { name: 'Enviar mi duda' }) as HTMLButtonElement).disabled).toBe(true);
    await u.click(screen.getByRole('radio', { name: 'Periodo' }));
    await u.type(screen.getByLabelText(/Si quieres, escribe una frase corta/), 'No entiendo qué es una oscilación');
    await u.click(screen.getByRole('button', { name: 'Enviar mi duda' }));
    expect(onEnviar).toHaveBeenCalledWith({ conceptoId: 'periodo', frase: 'No entiendo qué es una oscilación' });
  });

  it('is honest: the teacher sees the topic, and in a small class might guess who', () => {
    render(<CajaDeDudas conceptos={conceptos} onEnviar={() => {}} />);
    expect(screen.getByText(/Tu docente verá el tema, no tu nombre/)).toBeTruthy();
    expect(screen.getByText(/podría imaginar quién fue/)).toBeTruthy();
  });

  it('limits the phrase to 80 characters', () => {
    render(<CajaDeDudas conceptos={conceptos} onEnviar={() => {}} />);
    expect(screen.getByLabelText(/Si quieres, escribe una frase corta/).getAttribute('maxlength')).toBe('80');
  });
});

describe('MapaCalorDudas (teacher)', () => {
  const g = (n: number) => `01JC${'0'.repeat(18)}G${String(n).padStart(3, '0')}`;
  const d = (n: number, grupo: number, conceptoId: string): DudaConcepto => ({
    id: `01JC${'0'.repeat(18)}D${String(n).padStart(3, '0')}`, claseId: '01JC0000000000000000000C01', grupoId: g(grupo), exhibicionId: 'exh-pendulo', conceptoId, hlc: '1762300800000-0000-grupo001',
  });
  const mapa = mapaDeCalorDudas([d(1, 1, 'periodo'), d(2, 2, 'periodo'), d(3, 3, 'periodo'), d(4, 1, 'longitud')], { nombreConcepto: (c) => (c === 'periodo' ? 'Periodo' : 'Longitud') });

  it('shows a table with counts by concept and exhibit, hiding cells under 3 groups, without names', () => {
    render(<MapaCalorDudas mapa={mapa} nombreExhibicion={() => 'Péndulo'} />);
    const tabla = screen.getByRole('table', { name: /Dudas por tema/ });
    expect(within(tabla).getByText('3')).toBeTruthy();
    expect(within(tabla).getByText('Pocas dudas')).toBeTruthy();
    expect(screen.getByText(/anonimato real es imposible/)).toBeTruthy();
    expect(screen.getByText(/Temas para reforzar/)).toBeTruthy();
  });

  it('says there are no doubts yet instead of drawing an empty heatmap', () => {
    render(<MapaCalorDudas mapa={mapaDeCalorDudas([])} nombreExhibicion={(x) => x} />);
    expect(screen.getByText('Todavía no hay dudas.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
