import { citaRepresentativa, type CapacidadId } from '@rikuy/evidencia';
import { useProyeccion } from '../Proveedor.tsx';

/** T-13: report by competency. The rest of each bar is "sin evidencia aún", not "no logrado". */
export function ReporteCompetencia() {
  const { cobertura, vista, p } = useProyeccion();
  const total = vista.grupos.length;
  const cita = citaRepresentativa(vista, 'analiza') ?? citaRepresentativa(vista, 'evalua') ?? citaRepresentativa(vista, 'problematiza');
  const clase = p.clase;
  return (
    <section className="dc-card" aria-labelledby="competencia">
      <h2 id="competencia">Indaga mediante métodos científicos para construir sus conocimientos</h2>
      <p className="dc-muted">
        {clase ? `${clase.grado}.º ${clase.seccion}` : 'Clase'} · {total} {total === 1 ? 'grupo' : 'grupos'} · generado en tu celular
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {cobertura.map((c) => (
          <li key={c.id} data-capacidad={c.id as CapacidadId}>
            <div className="dc-row" style={{ justifyContent: 'space-between' }}>
              <span>{c.nombre}</span>
              <strong>{c.gruposConEvidencia} de {total}</strong>
            </div>
            <div className="dc-barra" role="img" aria-label={`${c.gruposConEvidencia} de ${total} grupos con evidencia; el resto, sin evidencia aún`}>
              <span style={{ width: `${total ? (c.gruposConEvidencia / total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="dc-muted">El resto de cada barra es «sin evidencia aún», no «no logrado». Orienta, no califica.</p>
      {cita ? <blockquote style={{ margin: 0 }}>«{cita.texto}» · Grupo {cita.apodo}</blockquote> : null}
      <button type="button" className="dc-btn dc-noprint" onClick={() => window.print()}>
        Imprimir o guardar PDF
      </button>
    </section>
  );
}
