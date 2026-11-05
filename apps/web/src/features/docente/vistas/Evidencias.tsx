import { ETIQUETA_INDICADOR, nombreCapacidad, type IndicadorVista } from '@rikuy/evidencia';
import { useAcciones, useClase, useProyeccion } from '../Proveedor.tsx';

const NIVELES = ['0', '1', '2', '3', 'NO'] as const;

function Fila({ i, apodo }: { i: IndicadorVista; apodo: string }) {
  const acciones = useAcciones();
  const etiqueta = ETIQUETA_INDICADOR[i.indicador];

  if (i.cita === null) {
    return (
      <div className="dc-cita dc-cita--no" data-indicador={i.indicador}>
        <span className="dc-chip dc-chip--off">{i.sinEvidencia ? 'Sin evidencia aún' : 'No evaluable'}</span>
        <strong>{etiqueta}</strong>
        <span className="dc-muted">Todavía no hay una frase del grupo sobre esto. La docente decide cómo seguir.</span>
      </div>
    );
  }
  const nivel = i.nivel === 'NO' ? 'No evaluable' : `Nivel ${i.nivel}`;
  return (
    <div className={i.estado === 'dudoso' ? 'dc-cita dc-cita--dudoso' : 'dc-cita'} data-indicador={i.indicador}>
      <span className="dc-row">
        <span className="dc-chip dc-chip--sync">Frase literal</span>
        {i.estado === 'dudoso' ? <span className="dc-chip dc-chip--warn">Dudoso · revisar</span> : null}
        {i.confirmada ? <span className="dc-chip dc-chip--ok">Confirmada por ti</span> : null}
      </span>
      <blockquote>«{i.cita}»</blockquote>
      <span className="dc-muted">
        {etiqueta} · {nombreCapacidad(i.capacidad)} · {nivel}
        {i.autores.length ? ` · ${i.autores.join(', ')}` : ''}
      </span>
      {i.evidenciaId ? (
        <span className="dc-row">
          <button type="button" className="dc-btn dc-btn--tonal" onClick={() => acciones.confirmar(i.evidenciaId as string)} disabled={i.confirmada && !i.corregidaPorDocente}>
            Confirmar
          </button>
          <label className="dc-muted" htmlFor={`corr-${i.evidenciaId}`}>Corregir nivel de {apodo}</label>
          <select
            id={`corr-${i.evidenciaId}`}
            className="dc-input"
            style={{ width: 'auto' }}
            value=""
            onChange={(e) => {
              const v = e.currentTarget.value;
              if (v) acciones.confirmar(i.evidenciaId as string, v === 'NO' ? 'NO' : (Number(v) as 0 | 1 | 2 | 3));
            }}
          >
            <option value="">Elegir…</option>
            {NIVELES.map((n) => (
              <option key={n} value={n}>{n === 'NO' ? 'No evaluable' : `Nivel ${n}`}</option>
            ))}
          </select>
        </span>
      ) : null}
    </div>
  );
}

/** T-09: the group's own words per indicator. Groups appear in join order, never sorted by level. */
export function Evidencias() {
  const { vista } = useProyeccion();
  const padron = useClase((s) => s.padron);
  const confirmadas = vista.grupos.reduce((n, g) => n + g.indicadores.filter((i) => i.cita !== null && i.confirmada).length, 0);
  if (vista.grupos.length === 0) {
    return (
      <section className="dc-card">
        <h2>Aún no hay evidencia</h2>
        <p className="dc-muted">Cuando recibas a un grupo en «Recibir», sus frases aparecerán aquí. «Sin evidencia aún» no es cero.</p>
      </section>
    );
  }
  return (
    <>
      <p className="dc-muted" role="note">
        Orienta, no califica. «No evaluable» no es cero. Ves {vista.porConfirmar} {vista.porConfirmar === 1 ? 'frase' : 'frases'} por confirmar
        {confirmadas > 0 ? ` y ${confirmadas} ya ${confirmadas === 1 ? 'confirmada' : 'confirmadas'}` : ''}.
        {Object.keys(padron).length ? ' Los alias (E07) coinciden con tu lista privada.' : ''}
      </p>
      {vista.grupos.map((g) => (
        <section key={g.grupoId} className="dc-card" aria-labelledby={`g-${g.grupoId}`}>
          <h2 id={`g-${g.grupoId}`}>Grupo {g.apodo}</h2>
          {g.indicadores.map((i) => (
            <Fila key={i.indicador} i={i} apodo={g.apodo} />
          ))}
        </section>
      ))}
    </>
  );
}
