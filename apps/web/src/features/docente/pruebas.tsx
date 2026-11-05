/* eslint-disable react-refresh/only-export-components -- test helpers */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { crearAlmacenClase, type AlmacenMemoria } from './estado/clase.ts';
import { ProveedorDocente } from './Proveedor.tsx';
import type { ServiciosDocente } from './puertos.ts';
import { serviciosSimulados } from './simulacion/receptor.ts';

export const memoriaVolatil = (): AlmacenMemoria => {
  let v: string | null = null;
  return { leer: () => v, escribir: (x) => void (v = x) };
};

export interface OpcionesPrueba {
  demo?: boolean;
  /** Group nicknames whose evidence is already received. */
  grupos?: string[];
  servicios?: Partial<ServiciosDocente>;
  ruta?: string;
}

export function renderizarDocente(ui: ReactElement, o: OpcionesPrueba = {}) {
  const servicios: ServiciosDocente = { ...serviciosSimulados, ...o.servicios };
  const almacen = crearAlmacenClase(servicios, memoriaVolatil());
  if (o.demo) almacen.getState().cargarDemo();
  for (const g of o.grupos ?? []) almacen.getState().recibirGrupoDeEjemplo(g);
  const r = render(
    <MemoryRouter initialEntries={[o.ruta ?? '/docente']}>
      <ProveedorDocente valor={{ almacen, servicios }}>{ui}</ProveedorDocente>
    </MemoryRouter>,
  );
  return { ...r, almacen };
}
