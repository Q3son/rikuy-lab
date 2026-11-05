/**
 * T-23 Tablero de ayudas (teacher). Requests open, in progress, escalated and closed; knots to confirm or
 * revoke; "yo ayudo", pause the Ayudante (switch, off by default) and silence a group. No ranking: groups
 * are never ordered by number of helps. Exported so F6 can embed it in the teacher panel.
 */
import { type PedidoAyuda, tableroAyudas } from '@rikuy/campus';
import { Link } from 'react-router';
import { GRUPO_DEMO } from '../grupo.ts';
import '../mundo.css';
import { GRUPOS_SIMULADOS, apodoDe, etiquetaNodo, simularPedidoEntrante, useAyudante } from './servicio.ts';

const ESTADO: Record<PedidoAyuda['estado'], string> = {
  abierto: 'Abierto',
  ofrecido: 'Buscando ayudante',
  en_curso: 'En curso',
  escalado: 'Espera a la docente',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

export function TableroAyudas() {
  const { estado, despachar } = useAyudante();
  const t = tableroAyudas(estado);
  const filas = [...t.escalados, ...t.abiertos, ...t.enCurso, ...t.cerrados];
  return (
    <main className="rk-mundo" aria-labelledby="titulo-tablero">
      <header className="rk-sign" style={{ background: 'var(--m-primary)' }}>
        <h1 id="titulo-tablero">Tablero de ayudas entre grupos</h1>
      </header>
      <section className="rk-panel" aria-label="Ajustes del Ayudante">
        <label className="rk-fila" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={estado.config.activo}
            onChange={(e) => despachar({ tipo: 'configurar', activo: e.target.checked })}
            style={{ width: 24, height: 24 }}
          />
          Ayudante del museo {estado.config.activo ? 'encendido' : 'apagado'}
        </label>
        <label className="rk-fila" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={estado.config.docenteConfirma}
            onChange={(e) => despachar({ tipo: 'configurar', docenteConfirma: e.target.checked })}
            style={{ width: 24, height: 24 }}
          />
          Confirmo yo cada nudo de ayuda
        </label>
        <small>Solo grupos de esta clase. Sin chat: pedidos con opciones fijas y ayuda en persona.</small>
        {estado.config.activo && (
          <button type="button" className="rk-btn" onClick={simularPedidoEntrante}>
            Simular un pedido de otro grupo (demo sin hub)
          </button>
        )}
      </section>

      <section className="rk-panel" aria-labelledby="titulo-pedidos">
        <h2 id="titulo-pedidos">Pedidos</h2>
        {filas.length === 0 && <p>Todavía no hay pedidos de ayuda.</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {filas.map((p) => (
            <li key={p.id} className="rk-placa">
              <strong>
                {apodoDe(p.grupoPideId)} · «{etiquetaNodo(p.nodoId)}»
              </strong>
              <span className="rk-chip">{ESTADO[p.estado]}</span>
              {p.grupoAyudaId && <span>Ayuda: grupo {apodoDe(p.grupoAyudaId)}</span>}
              {p.ayudaDocente && <span>Ayuda: la docente</span>}
              {p.cierre && <span>Cierre: {p.cierre.resultado === 'nos_ayudo' ? 'Nos ayudó' : p.cierre.resultado === 'casi' ? 'Casi' : 'Aún no'}</span>}
              {(p.estado === 'escalado' || p.estado === 'ofrecido') && (
                <button type="button" className="rk-btn" onClick={() => despachar({ tipo: 'yo_ayudo', pedidoId: p.id })}>
                  Yo ayudo
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rk-panel" aria-labelledby="titulo-nudos">
        <h2 id="titulo-nudos">Nudos de ayuda</h2>
        {estado.nudos.length === 0 && <p>Sin nudos de ayuda todavía.</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {estado.nudos.map((n) => (
            <li key={n.id} className="rk-placa">
              <span>
                Grupo {apodoDe(n.grupoAyudaId)} ayudó a {apodoDe(n.grupoPideId)} con «{etiquetaNodo(n.nodoId)}»
              </span>
              <span className="rk-chip">{n.estado === 'por_confirmar' ? 'Por confirmar' : n.estado === 'confirmado' ? 'Confirmado' : 'Revocado'}</span>
              <div className="rk-fila">
                {n.estado === 'por_confirmar' && (
                  <button type="button" className="rk-btn" data-primario="" onClick={() => despachar({ tipo: 'confirmar', nudoId: n.id })}>
                    Confirmar nudo
                  </button>
                )}
                {n.estado !== 'revocado' && (
                  <button type="button" className="rk-btn" onClick={() => despachar({ tipo: 'revocar', nudoId: n.id })}>
                    Revocar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rk-panel" aria-labelledby="titulo-silenciar">
        <h2 id="titulo-silenciar">Pausar a un grupo</h2>
        <div className="rk-fila">
          {[GRUPO_DEMO, ...GRUPOS_SIMULADOS].map((g) => {
            const silenciado = estado.silenciados.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className="rk-btn"
                aria-pressed={silenciado}
                onClick={() => despachar({ tipo: 'silenciar', grupoId: g.id, silenciado: !silenciado })}
              >
                {silenciado ? `Reactivar a ${g.apodo}` : `Pausar a ${g.apodo}`}
              </button>
            );
          })}
        </div>
      </section>

      {t.conceptos.length > 0 && (
        <section className="rk-panel" aria-labelledby="titulo-conceptos">
          <h2 id="titulo-conceptos">Lo que más costó</h2>
          <ul>
            {t.conceptos.map((c) => (
              <li key={c.nodoId}>
                {etiquetaNodo(c.nodoId)}: {c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p style={{ padding: '0 16px' }}>
        <Link to="/museo">Ir al museo</Link>
      </p>
    </main>
  );
}
