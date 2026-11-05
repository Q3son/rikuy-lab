import { useMemo } from 'react';
import { QrAnimado } from '../componentes/QrAnimado.tsx';
import { useAcciones, useProyeccion, useServicios } from '../Proveedor.tsx';

/** T-06a: the join code and QR. A group scans it once and is in, with no account. */
export function Museo() {
  const { p } = useProyeccion();
  const practica = useAcciones().practica;
  const srv = useServicios();
  const clase = p.clase;
  const marcos = useMemo(() => {
    if (!clase || !practica) return [];
    const paquete = {
      v: 1,
      tipo: 'union',
      claseId: clase.id,
      emisor: clase.docenteDispositivo,
      creado: clase.creada,
      firma: srv.cripto.firmar(`union:${clase.id}`),
      cuerpo: { claseId: clase.id, codigo: clase.codigo, practica, claveClaseMac: 'SIMULADA-clave-mac', claveClasePub: clase.claveClasePub },
    };
    return srv.codec.codificar('J', paquete);
  }, [clase, practica, srv]);

  if (!clase) return <p className="dc-card">Primero crea una clase en «Hoy».</p>;
  return (
    <>
      <section className="dc-card" aria-labelledby="entrada">
        <h2 id="entrada">Entrada al museo</h2>
        <p className="dc-codigo" aria-label={`Código de la clase ${clase.codigo.split('').join(' ')}`}>
          {clase.codigo}
        </p>
        <QrAnimado marcos={marcos} etiqueta={`Código QR para unirse a la clase ${clase.codigo}`} />
        <p className="dc-muted">Cada grupo escanea este código una vez. Sin cuenta, sin internet.</p>
      </section>
      <section className="dc-card" aria-labelledby="ordenes">
        <h2 id="ordenes">Órdenes en vivo</h2>
        <p className="dc-muted">Reunir a los grupos y pausar la clase necesitan el hub de la docente (celular o laptop).</p>
        <div className="dc-row">
          <button type="button" className="dc-btn" disabled>
            Reunir a todos
          </button>
          <button type="button" className="dc-btn" disabled>
            Pausar
          </button>
        </div>
        <span className="dc-chip dc-chip--off">Disponible con el hub</span>
      </section>
    </>
  );
}
