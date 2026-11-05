import type { ItemSalida } from '../entrega/salida.ts';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Contactos } from '../entrega/borradores.ts';
import { crearEntregaSimulada, ProveedorEntrega, type SenalSync } from '../entrega/servicios.tsx';
import { renderizarDocente } from '../pruebas.tsx';
import { Envios } from './Envios.tsx';

afterEach(cleanup);

function montar() {
  let items: ItemSalida[] = [];
  let contactos: Contactos = { familias: [] };
  let linea = false;
  const oyentes = new Set<() => void>();
  const senal: SenalSync = { suscribir: (cb) => (oyentes.add(cb), () => oyentes.delete(cb)) };
  const entrega = crearEntregaSimulada({
    almacen: { cargar: async () => JSON.parse(JSON.stringify(items)) as ItemSalida[], guardar: async (x) => void (items = JSON.parse(JSON.stringify(x)) as ItemSalida[]) },
    contactos: { leer: () => contactos, escribir: (c) => void (contactos = c) },
    enLinea: () => linea,
    ahora: () => Date.UTC(2026, 10, 6, 22, 0),
    senal,
  });
  const r = renderizarDocente(
    <ProveedorEntrega valor={entrega}>
      <Envios />
    </ProveedorEntrega>,
    { demo: true, grupos: ['Condor', 'Vizcacha', 'Puma', 'Kantu'] },
  );
  return { ...r, entrega, sincronizar: (enLinea: boolean) => { linea = enLinea; oyentes.forEach((f) => f()); } };
}

async function conContactos() {
  const m = montar();
  fireEvent.change(screen.getByLabelText('Tu correo'), { target: { value: 'rosa@example.pe' } });
  fireEvent.change(screen.getByLabelText(/Familias que pidieron/), { target: { value: 'E01, +51900000011, es\nE02, +51900000012, quy' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contactos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Preparar mensajes de la semana' }));
  await screen.findByText(/borradores listos/);
  return m;
}

describe('outbox screen (T-22)', () => {
  it('prepares drafts per contact and labels the data as simulated', async () => {
    await conContactos();
    expect(screen.getByText(/Datos simulados/)).toBeTruthy();
    expect((await screen.findAllByRole('article')).length).toBe(3); // tutor e-mail + 2 families
    expect(screen.getAllByText('Por aprobar').length).toBe(3);
  });

  it('does not let the teacher approve before opening the preview', async () => {
    await conContactos();
    const tarjeta = (await screen.findAllByRole('article'))[0];
    expect((within(tarjeta).getByRole('button', { name: 'Aprobar' }) as HTMLButtonElement).disabled).toBe(true);
    const detalle = tarjeta.querySelector('details') as HTMLDetailsElement;
    detalle.open = true;
    fireEvent(detalle, new Event('toggle'));
    await waitFor(() => expect((within(tarjeta).getByRole('button', { name: 'Aprobar' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('keeps approved messages queued with no network and sends them once the hub syncs', async () => {
    const m = await conContactos();
    for (const d of Array.from(document.querySelectorAll('details'))) {
      (d as HTMLDetailsElement).open = true;
      fireEvent(d, new Event('toggle'));
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar los que ya vi' }));
    await waitFor(() => expect(screen.getAllByText('En cola · se envía al sincronizar').length).toBe(3));

    m.sincronizar(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getAllByText('En cola · se envía al sincronizar').length).toBe(3);

    m.sincronizar(true);
    await waitFor(() => expect(screen.getAllByText('Entregado').length).toBe(3));
  });

  it('never shows an address in the visible list of messages', async () => {
    await conContactos();
    const tarjetas = await screen.findAllByRole('article');
    for (const t of tarjetas) expect(t.textContent).not.toMatch(/51900000011|rosa@example/);
  });
});
