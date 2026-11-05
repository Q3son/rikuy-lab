import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import './estilos.css';
import { ProveedorDocente, useClase, useProyeccion } from './Proveedor.tsx';

export function usarEnLinea(): boolean {
  const [en, setEn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setEn(true);
    const off = () => setEn(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return en;
}

/** Neutral network chip: offline is a normal state, never red (IA section 5). */
export function ChipRed() {
  const enLinea = usarEnLinea();
  return <span className="dc-chip dc-chip--off">{enLinea ? 'En línea' : 'Sin red · todo funciona'}</span>;
}

const TABS = [
  { a: '/docente', t: 'Hoy', fin: true },
  { a: '/docente/clase', t: 'Clase' },
  { a: '/docente/evidencia', t: 'Evidencia' },
  { a: '/docente/reportes', t: 'Reportes' },
  { a: '/docente/ajustes', t: 'Ajustes' },
] as const;

function Marco() {
  const { p } = useProyeccion();
  const esDemo = useClase((s) => s.esDemo);
  const etiqueta = p.clase ? `${p.clase.grado}.º ${p.clase.seccion} · Ciencia y Tec.` : 'Mi clase de hoy';
  return (
    <div className="dc-app">
      <header className="dc-top">
        <h1>{etiqueta}</h1>
        <span className="dc-row">
          {esDemo ? <span className="dc-chip dc-chip--warn">Datos de ejemplo</span> : null}
          <ChipRed />
        </span>
      </header>
      <main className="dc-main">
        <Outlet />
      </main>
      <nav className="dc-tabs" aria-label="Secciones">
        {TABS.map((x) => (
          <NavLink key={x.a} to={x.a} end={'fin' in x}>
            {x.t}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PanelDocente() {
  return (
    <ProveedorDocente>
      <Marco />
    </ProveedorDocente>
  );
}

export function Segmentos({ items }: { items: { a: string; t: string; fin?: boolean }[] }) {
  return (
    <nav className="dc-seg" aria-label="Vistas">
      {items.map((x) => (
        <NavLink key={x.a} to={x.a} end={x.fin}>
          {x.t}
        </NavLink>
      ))}
    </nav>
  );
}
