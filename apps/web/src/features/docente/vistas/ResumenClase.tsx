import { useProyeccion } from '../Proveedor.tsx';

/** T-11: three parts with real counts and real quotes, generated on the phone. */
export function ResumenClase() {
  const { resumen, p } = useProyeccion();
  if (p.grupos.length === 0) {
    return (
      <section className="dc-card">
        <h2>Resumen de la clase</h2>
        <p className="dc-muted">El resumen aparece cuando recibas al menos un grupo.</p>
      </section>
    );
  }
  const { vimos, costo, ejercicios } = resumen;
  return (
    <>
      <section className="dc-card" aria-labelledby="r1">
        <h2 id="r1">1 · Lo que vimos</h2>
        <p style={{ margin: 0 }}>{vimos.texto}</p>
        {vimos.cita ? <p className="dc-muted" style={{ margin: 0 }}>«{vimos.cita.texto}» · Grupo {vimos.cita.apodo}</p> : null}
      </section>
      <section className="dc-card" aria-labelledby="r2">
        <h2 id="r2">2 · Lo que les costó</h2>
        <p style={{ margin: 0 }}>{costo.texto}</p>
        {costo.cita ? <p className="dc-muted" style={{ margin: 0 }}>«{costo.cita.texto}» · Grupo {costo.cita.apodo}</p> : null}
      </section>
      <section className="dc-card" aria-labelledby="r3">
        <h2 id="r3">3 · Tres ejercicios para mañana</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {ejercicios.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
