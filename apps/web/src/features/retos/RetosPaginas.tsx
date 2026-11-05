/**
 * E-13 Patio de juegos and E-13b one challenge. Group progress only (`reto.progreso`): no scores, no speed,
 * no ranking. A wrong answer gets a question from Rikuy; the hint appears after two tries.
 */
import { RUTAS } from '@rikuy/contracts';
import { RETOS, type ProgresoReto, RepositorioProgresoMemoria, iniciar, responder } from '@rikuy/retos';
import { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import { registroMuseo } from '../mundo/eventos.ts';
import { grupoActual } from '../mundo/grupo.ts';
import { Glifo, Rikuy } from '../mundo/Iconos.tsx';
import '../mundo/mundo.css';

/** Progress repository of this device (Dexie adapter by the integrator, F2). */
const progresoRetos = new RepositorioProgresoMemoria();

export function PatioRetos() {
  return (
    <main className="rk-mundo" aria-labelledby="titulo-patio">
      <header className="rk-sign" style={{ background: 'var(--m-sol)', color: 'var(--m-ink)' }}>
        <span className="rk-glifo">
          <Glifo nombre="juego" />
        </span>
        <h1 id="titulo-patio">Patio de juegos</h1>
      </header>
      <p style={{ padding: '8px 16px', margin: 0 }}>Retos cortos con contexto de aquí. Se juegan en grupo y sin apuro.</p>
      <ul style={{ listStyle: 'none', padding: '0 16px', display: 'grid', gap: 8 }}>
        {RETOS.map((r) => (
          <li key={r.id} className="rk-placa" style={{ borderLeftColor: 'var(--m-sol)' }}>
            <strong>{r.titulo}</strong>
            <span>{r.contexto}</span>
            <small>{r.competencia}</small>
            <Link className="rk-btn" data-primario="" to={`${RUTAS.retos}/${r.id}`}>
              Jugar «{r.titulo}»
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ padding: '0 16px' }}>
        <Link to={RUTAS.museo}>Volver al vestíbulo</Link>
      </p>
    </main>
  );
}

export function RetoPagina() {
  const { retoId } = useParams();
  const reto = RETOS.find((r) => r.id === retoId);
  const [progreso, setProgreso] = useState<ProgresoReto | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [pista, setPista] = useState(false);
  const idCampo = useId();

  useEffect(() => {
    if (!reto) return;
    let vivo = true;
    void progresoRetos.obtener(reto.id, grupoActual().id).then((p) => {
      if (vivo) setProgreso(p ?? iniciar(reto, grupoActual().id));
    });
    return () => {
      vivo = false;
    };
  }, [reto]);

  if (!reto) {
    return (
      <main className="rk-mundo">
        <p>Ese reto no existe.</p>
        <Link className="rk-btn" to={RUTAS.retos}>
          Volver al Patio
        </Link>
      </main>
    );
  }
  if (!progreso) return <main className="rk-mundo" aria-busy="true" />;

  const paso = reto.pasos[progreso.paso];
  const enviar = (valor: string) => {
    const r = responder(reto, progreso, valor, intentos);
    setMensaje(r.mensaje);
    setIntentos(r.intentos);
    setPista(r.mostrarPista);
    if (r.evento) {
      registroMuseo.registrar({ tipo: 'reto.progreso', datos: r.evento });
      void progresoRetos.guardar(r.progreso);
      setProgreso(r.progreso);
      setRespuesta('');
    }
  };

  return (
    <main className="rk-mundo" aria-labelledby="titulo-reto">
      <header className="rk-sign" style={{ background: 'var(--m-sol)', color: 'var(--m-ink)' }}>
        <span className="rk-glifo">
          <Glifo nombre="juego" />
        </span>
        <div>
          <h1 id="titulo-reto">{reto.titulo}</h1>
          <small style={{ fontStyle: 'normal' }}>
            Paso {Math.min(progreso.paso + 1, reto.pasos.length)} de {reto.pasos.length}
          </small>
        </div>
      </header>
      <p style={{ padding: '8px 16px', margin: 0 }}>{reto.contexto}</p>
      {paso && !progreso.completado ? (
        <section className="rk-panel" aria-labelledby="enunciado">
          <h2 id="enunciado">{paso.enunciado}</h2>
          {paso.tipo === 'numero' ? (
            <form
              className="rk-fila"
              onSubmit={(e) => {
                e.preventDefault();
                enviar(respuesta);
              }}
            >
              <label htmlFor={idCampo}>Respuesta ({paso.unidad})</label>
              <input
                id={idCampo}
                inputMode="decimal"
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                style={{ font: 'inherit', minHeight: 48, padding: '0 12px', border: '2px solid var(--m-border)', borderRadius: 12 }}
              />
              <button type="submit" className="rk-btn" data-primario="">
                Comprobar
              </button>
            </form>
          ) : (
            <div className="rk-fila" role="group" aria-label="Opciones">
              {paso.opciones.map((o, i) => (
                <button key={o} type="button" className="rk-btn" onClick={() => enviar(String(i))}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="rk-panel">
          <h2>¡Reto resuelto en grupo!</h2>
        </section>
      )}
      <div className="rk-burbuja" role="status" aria-live="polite">
        <Rikuy expresion={progreso.completado ? 'celebra' : mensaje ? 'piensa' : 'curiosa'} />
        <p>{mensaje || '¿Qué datos del problema te sirven?'}</p>
      </div>
      {pista && paso && <p className="rk-panel">Pista: {paso.pista}</p>}
      <p style={{ padding: '0 16px' }} className="rk-fila">
        <Link className="rk-btn" to={RUTAS.retos}>
          Volver al Patio
        </Link>
        <Link className="rk-btn" to="/museo/patio">
          Volver al museo
        </Link>
      </p>
    </main>
  );
}
