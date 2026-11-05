import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ViewerAction, ViewerChannel } from '@rikuy/holo';
import { PaginaControl } from './PaginaControl.tsx';
import { PaginaProyector } from './PaginaProyector.tsx';
import { RoomChannel } from './sala/RoomChannel.ts';
import type { GestosMano } from './useGestosMano.ts';

const applied: ViewerAction[] = [];
vi.mock('@rikuy/holo', async (orig) => {
  const real = await orig<typeof import('@rikuy/holo')>();
  const { useEffect } = await import('react');
  return {
    ...real,
    VisorExhibicion: ({ canal, modo }: { canal?: ViewerChannel; modo?: string }) => {
      useEffect(() => canal?.subscribe((a) => applied.push(a)), [canal]);
      return <div data-testid="visor" data-modo={modo} />;
    },
  };
});

const localChannel = (room: string, role: 'display' | 'control') => new RoomChannel(room, role, { socket: null });

function fakeGestures(overrides: Partial<GestosMano> = {}): () => GestosMano {
  return () => ({ status: 'off', pose: null, detail: undefined, start: vi.fn(async () => true), stop: vi.fn(), ...overrides });
}

function renderAt(path: string, gestos = fakeGestures()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/holo/proyector/:sala" element={<PaginaProyector crearCanal={localChannel} />} />
        <Route path="/holo/control/:sala" element={<PaginaControl crearCanal={localChannel} usarGestos={gestos} />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  applied.length = 0;
  localStorage.clear();
});

describe('two-phone hologram: projector', () => {
  it('shows the room code and a QR to join, in pyramid mode', () => {
    renderAt('/holo/proyector/k7m2');
    expect(screen.getByText('K7M2')).toBeTruthy();
    expect(screen.getByRole('img', { name: /QR para unirse/ })).toBeTruthy();
    expect(screen.getByTestId('visor').dataset.modo).toBe('piramide');
  });

  it('applies a remote command and acknowledges it on the room channel', async () => {
    renderAt('/holo/proyector/k7m2');
    const control = localChannel('k7m2', 'control');
    const acks: string[] = [];
    control.on((m) => m.type === 'say' && acks.push(m.text));
    act(() => control.send({ type: 'command', commands: [{ tool: 'pausar', args: {} }], from: 'control' }));
    await waitFor(() => expect(applied).toEqual([{ type: 'pause' }]));
    await waitFor(() => expect(acks).toContain('✓ Pausa'));
    expect(await screen.findByText('Pausa')).toBeTruthy(); // short amber label on the projector
    control.close();
  });
});

describe('two-phone hologram: control', () => {
  it('sends a button command and shows the projector confirmation', async () => {
    const view = renderAt('/holo/control/k7m2');
    const projector = localChannel('k7m2', 'display');
    projector.on((m) => {
      if (m.type === 'command') projector.send({ type: 'say', speaker: 'agente', text: '✓ Pausa' });
    });
    fireEvent.click(screen.getByRole('button', { name: /Pausa/ }));
    expect(await screen.findByText(/El proyector hizo: Pausa/)).toBeTruthy();
    projector.close();
    view.unmount();
  });

  it('marks the projector as connected when it answers', async () => {
    renderAt('/holo/control/k7m2');
    const projector = localChannel('k7m2', 'display');
    act(() => projector.hello());
    expect(await screen.findByText(/Proyector conectado/)).toBeTruthy();
    projector.close();
  });

  it('falls back to touch and voice when the camera fails, without blocking', async () => {
    renderAt('/holo/control/k7m2', fakeGestures({ status: 'error', detail: 'NotAllowedError' }));
    expect(screen.getByText(/La cámara no funcionó/)).toBeTruthy();
    for (const name of [/Girar/, /Acercar/, /Pausa/, /Soltar/, /Centrar/]) expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('shows the camera-active pill with its power button while the camera runs', () => {
    const stop = vi.fn();
    renderAt('/holo/control/k7m2', fakeGestures({ status: 'active', stop }));
    expect(screen.getByText('Cámara activa')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Apagar cámara/ }));
    expect(stop).toHaveBeenCalled();
  });

  it('tells the group when the teacher switched gestures off', () => {
    renderAt('/holo/control/k7m2', fakeGestures({ status: 'blocked' }));
    expect(screen.getByText(/La profesora apagó los gestos/)).toBeTruthy();
  });
});
