import { Link } from 'react-router';
import { useAcciones, useProyeccion } from '../Proveedor.tsx';

export function InterruptorTutor() {
  const { p } = useProyeccion();
  const acciones = useAcciones();
  const activo = p.interruptores.tutor ?? p.clase?.tutor.activo ?? true;
  return (
    <div className="dc-switch-row">
      <span>
        <strong>Tutor Rikuy</strong>
        <br />
        <span className="dc-muted">{activo ? 'Encendido: los grupos reciben pistas.' : 'Apagado: hoy trabajan sin Rikuy.'}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="dc-switch"
        aria-label="Tutor Rikuy"
        checked={activo}
        onChange={(e) => acciones.setTutor(e.currentTarget.checked)}
      />
    </div>
  );
}

const ETAPAS = ['Preparar', 'Museo', 'Cierre', 'Llevar'] as const;

export function Hoy() {
  const { p, avance } = useProyeccion();
  const acciones = useAcciones();
  const clase = p.clase;

  if (!clase) {
    return (
      <section className="dc-card" aria-labelledby="sin-clase">
        <h2 id="sin-clase">Aún no tienes una clase hoy</h2>
        <p className="dc-muted">Crea la clase, muestra el código a los grupos y empieza. No hace falta cuenta ni internet.</p>
        <Link className="dc-btn dc-btn--primary" to="/docente/nueva">
          Crear clase
        </Link>
        <button type="button" className="dc-btn" onClick={() => acciones.cargarDemo()}>
          Usar la clase de ejemplo
        </button>
      </section>
    );
  }

  const conGrupos = p.grupos.length > 0;
  const hayEvidencia = p.evidencias.length > 0;
  const actual = p.cerrada ? 3 : hayEvidencia ? 2 : 1;
  const accion = actual >= 2 ? { a: '/docente/evidencia', t: 'Recibir evidencia' } : { a: '/docente/clase/museo', t: 'Abrir el museo' };

  return (
    <>
      <section className="dc-card" aria-labelledby="hoy">
        <h2 id="hoy">Hoy</h2>
        <p style={{ margin: 0 }}>
          <strong>{acciones.practica?.titulo ?? 'Práctica'}</strong>
          <br />
          <span className="dc-muted">
            {p.grupos.length} {p.grupos.length === 1 ? 'grupo' : 'grupos'} · código <strong>{clase.codigo}</strong>
          </span>
        </p>
        <span className="dc-chip dc-chip--ok">Aprobada</span>
        <ol className="dc-stepper" aria-label="Los cuatro tramos del día">
          {ETAPAS.map((e, i) => (
            <li key={e} aria-current={i === actual ? 'step' : undefined} data-hecho={i < actual}>
              <b>{i + 1}</b>
              {e}
              <span className="dc-muted">{i < actual ? 'listo' : i === actual ? 'toca ahora' : 'después'}</span>
            </li>
          ))}
        </ol>
        <Link className="dc-btn dc-btn--primary" to={accion.a}>
          {accion.t}
        </Link>
      </section>

      <section className="dc-card" aria-labelledby="interruptores">
        <h2 id="interruptores">Interruptores</h2>
        <InterruptorTutor />
      </section>

      <section className="dc-card" aria-labelledby="avance">
        <h2 id="avance">Avance por grupo</h2>
        {!conGrupos ? <p className="dc-muted">Aún no se une ningún grupo. Muestra el código en «Abrir el museo».</p> : null}
        {avance.map((a) => {
          const nudos = 10;
          const hechos = a.medicionesEsperadas ? Math.min(nudos, Math.round((a.medicionesHechas / a.medicionesEsperadas) * nudos)) : 0;
          return (
            <div key={a.grupoId} className="dc-grupo">
              <strong>Grupo {a.apodo}</strong>
              <div className="dc-nudos" role="img" aria-label={`${a.medicionesHechas} de ${a.medicionesEsperadas} mediciones`}>
                {Array.from({ length: nudos }, (_, i) => (
                  <span key={i} className="dc-nudo" data-hecho={i < hechos} />
                ))}
              </div>
              <span className="dc-muted">
                {a.predijo ? (a.prediccionAntesDeMedir ? 'Predijo antes de medir' : 'Predijo después de medir') : 'Aún sin predicción'} · {a.medicionesHechas} de{' '}
                {a.medicionesEsperadas} mediciones · {a.concluyo ? 'con conclusión' : 'sin conclusión aún'}
              </span>
            </div>
          );
        })}
      </section>
    </>
  );
}
