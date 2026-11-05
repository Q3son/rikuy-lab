import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QrAnimado } from './QrAnimado.tsx';
import { matrizQr } from './qr.ts';
import { QrSvg } from './QrSvg.tsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('QrSvg', () => {
  it('draws a square module matrix with finder patterns', () => {
    const m = matrizQr('RK1:J:ABCD:1:1:XYZ:HOLA');
    expect(m.length).toBe(m[0].length);
    expect(m[0].slice(0, 7).every(Boolean)).toBe(true); // top-left finder, first row
  });

  it('is labelled for assistive technology', () => {
    render(<QrSvg texto="RK1:J:ABCD:1:1:XYZ:HOLA" etiqueta="Código de unión" />);
    expect(screen.getByRole('img', { name: 'Código de unión' })).toBeTruthy();
  });

  it('is deterministic', () => {
    expect(matrizQr('abc')).toEqual(matrizQr('abc'));
  });
});

describe('QrAnimado', () => {
  it('cycles through the frames and tells which part is on screen', () => {
    vi.useFakeTimers();
    render(<QrAnimado marcos={['RK1:E:AAAA:1:2:X:A', 'RK1:E:AAAA:2:2:X:B']} etiqueta="Paquete" ritmoMs={500} />);
    expect(screen.getByText(/Parte 1 de 2/)).toBeTruthy();
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByText(/Parte 2 de 2/)).toBeTruthy();
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByText(/Parte 1 de 2/)).toBeTruthy();
  });

  it('shows no part counter for a single frame', () => {
    render(<QrAnimado marcos={['RK1:J:AAAA:1:1:X:A']} etiqueta="Unión" />);
    expect(screen.queryByText(/Parte/)).toBeNull();
  });
});
