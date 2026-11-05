import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IndicadorGuardian } from './IndicadorGuardian.tsx';

afterEach(cleanup);

describe('IndicadorGuardian', () => {
  it('says "Guardián activo" in text and exposes the kill switch', async () => {
    const u = userEvent.setup();
    const onApagar = vi.fn();
    render(<IndicadorGuardian activo onApagar={onApagar} />);
    expect(screen.getByText('Guardián activo')).toBeTruthy();
    await u.click(screen.getByRole('button', { name: 'Apagar Guardián' }));
    expect(onApagar).toHaveBeenCalled();
  });

  it('renders nothing when Guardián is off (it never runs without its indicator)', () => {
    const { container } = render(<IndicadorGuardian activo={false} onApagar={() => {}} />);
    expect(container.textContent).toBe('');
  });
});
