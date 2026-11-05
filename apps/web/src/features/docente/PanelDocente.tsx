import { NavLink, Outlet } from 'react-router';
import './estilos.css';
import { ProveedorDocente, useClase, useEnLinea, useProyeccion } from './Proveedor.tsx';

/** Neutral network chip: offline is a normal state, never red (IA section 5). */
export function ChipRed() {
  const enLinea = useEnLinea();
  return <span className="dc-chip dc-chip--off">{enLinea ? 'En línea' : 'Sin red · todo funciona'}</span>;
}

/**
 * Inside the app shell: the shell owns the top bar (the one h1) and the teacher tab bar, which point at
 * these routes. The panel only adds the class line and its status chips.
 */
function Marco() {
  const { p } = useProyeccion();
  const esDemo = useClase((s) => s.esDemo);
  const etiqueta = p.clase ? `${p.clase.grado}.º ${p.clase.seccion} · Ciencia y Tec.` : 'Mi clase de hoy';
  return (
    <div className="dc-app dc-app--en-shell">
      <div className="dc-top dc-top--en-shell">
        <p className="dc-titulo">{etiqueta}</p>
        <span className="dc-row">
          {esDemo ? <span className="dc-chip dc-chip--warn">Datos de ejemplo</span> : null}
          <ChipRed />
        </span>
      </div>
      <div className="dc-main">
        <Outlet />
      </div>
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
