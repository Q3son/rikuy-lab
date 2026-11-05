import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PulsoDelCurso } from './PulsoDelCurso.tsx';

afterEach(cleanup);

const items = [
  { id: 'p1', texto: 'En mi curso nos cuidamos entre todos.' },
  { id: 'p2', texto: 'Puedo pedir ayuda en el curso.' },
  { id: 'p3', texto: 'En mi curso nos respetamos.' },
];

describe('PulsoDelCurso', () => {
  it('shows the weekly collective items, each skippable with "prefiero no decir"', () => {
    render(<PulsoDelCurso items={items} onEnviar={() => {}} />);
    expect(screen.getByText('Pulso del curso')).toBeTruthy();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(3);
    expect(screen.getAllByRole('radio', { name: 'Prefiero no decir' })).toHaveLength(3);
  });

  it('sends one answer per item and nothing preselected', async () => {
    const u = userEvent.setup();
    const onEnviar = vi.fn();
    render(<PulsoDelCurso items={items} onEnviar={onEnviar} />);
    expect(screen.getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    const g1 = screen.getByRole('radiogroup', { name: items[0]?.texto });
    await u.click(within(g1).getByRole('radio', { name: 'Muy de acuerdo' }));
    await u.click(within(screen.getByRole('radiogroup', { name: items[1]?.texto })).getByRole('radio', { name: 'Prefiero no decir' }));
    await u.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onEnviar).toHaveBeenCalledWith([
      { itemId: 'p1', valor: 4 },
      { itemId: 'p2', valor: 'prefiero_no_decir' },
    ]);
  });

  it('can be skipped entirely', async () => {
    const u = userEvent.setup();
    const onEnviar = vi.fn();
    render(<PulsoDelCurso items={items} onEnviar={onEnviar} />);
    await u.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(onEnviar).toHaveBeenCalledWith([]);
  });
});
