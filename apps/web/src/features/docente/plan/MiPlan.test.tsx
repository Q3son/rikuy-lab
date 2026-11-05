import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { crearAlmacenPlanMemoria } from './almacenPlan.ts';
import { ErrorSinRed, type ClientePlan } from './clientePlan.ts';
import { MiPlan } from './MiPlan.tsx';
import { lecturaDeEjemplo } from './revision.ts';

const AHORA = () => new Date('2026-11-05T15:00:00Z');
const EN_LINEA = () => true;
const SIN_RED = () => false;

function montar(cliente: ClientePlan, enLinea = EN_LINEA) {
  const almacen = crearAlmacenPlanMemoria();
  render(
    <MemoryRouter>
      <MiPlan cliente={cliente} almacen={almacen} ahora={AHORA} enLinea={enLinea} />
    </MemoryRouter>,
  );
  return almacen;
}
const pdf = () => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'plan.pdf', { type: 'application/pdf' });
const subirPdf = () => fireEvent.change(screen.getByLabelText('Subir PDF'), { target: { files: [pdf()] } });

describe('Mi plan', () => {
  it('reads a PDF, shows item, CNEB match and source side by side, and stores only the approved plan', async () => {
    const cliente: ClientePlan = { extraer: vi.fn(async () => lecturaDeEjemplo()) };
    const almacen = montar(cliente);
    subirPdf();
    expect(await screen.findByRole('heading', { name: 'Revisa lo que leímos' })).toBeVisible();
    expect(cliente.extraer).toHaveBeenCalledOnce();
    expect(screen.getByText(/Se quitaron \d+ nombres o datos personales/)).toBeVisible();

    const exacto = screen.getByRole('article', { name: 'Describe cómo a través de los procesos de fotosíntesis y respiración se produce la energía que la célula utiliza para producir sustancias orgánicas.' });
    expect(within(exacto).getByText(/CNEB exacta/)).toBeVisible();
    expect(within(exacto).getByText('secundaria-2:cyt:c2:d7')).toBeVisible();
    expect(within(exacto).getByText(/pág\. 3/)).toBeVisible();
    expect(within(exacto).getByRole('link', { name: 'Ver en holograma: respiratorio' })).toHaveAttribute('href', '/holo/ver/respiratorio');
    const leche = screen.getByRole('article', { name: 'Digestión de la leche: enzimas y lactosa' });
    expect(within(leche).getByRole('link', { name: 'Ver en holograma: lactasa' })).toBeVisible();

    const sin = screen.getByRole('article', { name: 'Participa en la campaña de limpieza del río Chili con su familia.' });
    expect(within(sin).getByText('Sin correspondencia CNEB')).toBeVisible();
    fireEvent.click(within(sin).getByRole('button', { name: 'Rechazar' }));
    expect(within(sin).getByRole('button', { name: 'Rechazar' })).toHaveAttribute('aria-pressed', 'true');

    // Edit one item: it is mapped again.
    const comprende = screen.getByRole('article', { name: 'Comprende el movimiento oscilatorio del péndulo y su periodo.' });
    fireEvent.click(within(comprende).getByRole('button', { name: 'Editar' }));
    fireEvent.change(within(comprende).getByLabelText('Tu redacción'), { target: { value: 'Describe el movimiento cualitativa y cuantitativamente relacionando la distancia, el tiempo y la velocidad.' } });
    fireEvent.click(within(comprende).getByRole('button', { name: 'Guardar cambio' }));
    const editado = screen.getByRole('article', { name: 'Describe el movimiento cualitativa y cuantitativamente relacionando la distancia, el tiempo y la velocidad.' });
    expect(within(editado).getByText('secundaria-2:cyt:c2:d5')).toBeVisible();

    // Suggestions are labelled, and a practice can be added to the calendar.
    fireEvent.click(screen.getByRole('button', { name: 'Mejorar la información' }));
    expect(screen.getByText('Son sugerencias: nada se agrega sin que lo elijas')).toBeVisible();
    expect(screen.getByText(/Diseña y construye soluciones tecnológicas/)).toBeVisible();
    const pendulo = screen.getAllByRole('checkbox').find((c) => c.closest('label')?.textContent?.includes('péndulo'))!;
    fireEvent.click(pendulo);

    expect(almacen.plan).toBeUndefined(); // nothing stored before approval
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar plan' }));
    expect(await screen.findByRole('heading', { name: 'Plan de clase aprobado' })).toBeVisible();
    const guardado = almacen.plan!;
    expect(guardado.aprobadoEn).toBe('2026-11-05T15:00:00.000Z');
    expect(JSON.stringify(guardado)).not.toContain('Participa en la campaña');
    expect(JSON.stringify(guardado)).not.toContain('Quispe');
    expect(guardado.practicas.map((p) => p.slug)).toEqual(['pendulo']);
  });

  it('works without a gateway with the sample plan', async () => {
    montar({ extraer: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: 'Usar plan de ejemplo' }));
    expect(await screen.findByText('Datos simulados: plan de ejemplo, sin IA real')).toBeVisible();
  });

  it('queues the upload when there is no network, and explains it', async () => {
    const cliente: ClientePlan = { extraer: vi.fn() };
    const almacen = montar(cliente, SIN_RED);
    subirPdf();
    expect(await screen.findByText(/Sin conexión: guardamos tu documento en este celular/)).toBeVisible();
    expect(cliente.extraer).not.toHaveBeenCalled();
    expect(almacen.cola).toHaveLength(1);
  });

  it('queues the upload when the request fails for lack of network', async () => {
    const almacen = montar({ extraer: vi.fn(async () => Promise.reject(new ErrorSinRed('x'))) });
    subirPdf();
    await waitFor(() => expect(almacen.cola).toHaveLength(1));
    expect(screen.getByText(/lo leeremos cuando vuelva la red/)).toBeVisible();
  });
});
