import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ejemplos } from '@rikuy/contracts/fixtures';
import { renderizarDocente } from '../docente/pruebas.tsx';
import { codificarEnlace, decodificarEnlace } from './enlace.ts';
import { PaginaFamilia } from './PaginaFamilia.tsx';
import { ParaLlevar } from './ParaLlevar.tsx';

afterEach(cleanup);

describe('Para llevar (T-14, T-15, T-16)', () => {
  it('previews a WhatsApp message with no child name and shares a link that decodes to the practice', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    renderizarDocente(<ParaLlevar deps={{ share, abrir: vi.fn() }} base="https://rikuy.app/" />, { demo: true });
    const vista = screen.getByLabelText('Vista previa del mensaje').textContent ?? '';
    expect(vista).toContain('su hijo o hija');
    expect(vista).toContain('responda BAJA');

    fireEvent.click(screen.getByRole('button', { name: 'Compartir por WhatsApp' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const arg = share.mock.calls[0][0] as { url: string; text: string };
    expect(arg.url.startsWith('https://rikuy.app/#/p/')).toBe(true);
    expect(arg.text).not.toContain(arg.url);
    const r = decodificarEnlace(arg.url.split('#/p/')[1]);
    expect(r.ok && (r.valor as { cuerpo: { id: string } }).cuerpo.id).toBe(ejemplos.practica.id);
    expect(await screen.findByText(/Preparado en WhatsApp/)).toBeTruthy();
  });

  it('never claims delivery: it counts what was prepared', () => {
    renderizarDocente(<ParaLlevar deps={{ abrir: vi.fn() }} base="https://rikuy.app/" />, { demo: true });
    expect(screen.getByText(/Registrar no es entregar/)).toBeTruthy();
    expect(screen.queryByText(/entregad/i)).toBeNull();
  });

  it('offers the A4 sheet and refuses Quechua that is not reviewed', () => {
    renderizarDocente(<ParaLlevar deps={{ abrir: vi.fn() }} base="https://rikuy.app/" />, { demo: true });
    expect(screen.getByLabelText('Hoja para llevar a casa')).toBeTruthy();
    expect(screen.getByText(/Solo se imprime quechua con estado «revisado por hablante»/)).toBeTruthy();
  });

  it('shows the QR package of the practice', () => {
    renderizarDocente(<ParaLlevar base="https://rikuy.app/" />, { demo: true });
    expect(screen.getByRole('img', { name: 'Código QR del paquete para llevar' })).toBeTruthy();
  });
});

describe('family page (F-02) opened from the link, with the network down', () => {
  const carga = codificarEnlace({ ...ejemplos.paquetePractica });

  function abrir() {
    return render(
      <MemoryRouter initialEntries={[`/p/${carga}`]}>
        <Routes>
          <Route path="/p/:carga" element={<PaginaFamilia />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the sheet without a single network request', () => {
    const fetchEspia = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchEspia);
    abrir();
    expect(screen.getByRole('heading', { level: 1, name: ejemplos.practica.titulo })).toBeTruthy();
    expect(screen.getByRole('list').children.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('img', { name: 'Código para mostrar al volver al colegio' })).toBeTruthy();
    expect(fetchEspia).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('says what to do when the link is broken', () => {
    render(
      <MemoryRouter initialEntries={['/p/roto.zz']}>
        <Routes>
          <Route path="/p/:carga" element={<PaginaFamilia />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert').textContent).toMatch(/Pídele a la profesora/);
  });
});
