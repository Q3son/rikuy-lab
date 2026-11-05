import { useEffect, useMemo, useState } from 'react';
import { ayudasDeEjemplo, crearFuenteAyudas, ETIQUETA_NECESIDAD, type FuenteAyudas, type RegistroAyuda } from '../ayudas/tablero.ts';
import { useClase, useProyeccion } from '../Proveedor.tsx';

const RESULTADO = { nos_ayudo: 'Dijeron: nos ayudó', casi: 'Dijeron: casi', aun_no: 'Dijeron: aún no' } as const;

interface PropsTarjeta {
  r: RegistroAyuda;
  fuente: FuenteAyudas;
  nombre(id: string): string;
}

function Tarjeta({ r, fuente, nombre }: PropsTarjeta) {
  const ayudo = r.ofertas.find((o) => o.estado === 'aceptada');
  return (
    <article className="dc-card" aria-label={`Pedido de ${nombre(r.pedido.grupoPideId)}`}>
      <strong>{nombre(r.pedido.grupoPideId)} pide ayuda</strong>
      <span>Concepto: {r.pedido.nodoId}</span>
      <span className="dc-muted">{ETIQUETA_NECESIDAD[r.pedido.necesidad]}</span>
      {ayudo ? <span>Ayuda: {nombre(ayudo.grupoAyudaId)}</span> : null}
      {r.cierre ? <span className="dc-muted">{RESULTADO[r.cierre.resultado]}</span> : null}
      {r.pedido.estado === 'escalado' ? <span className="dc-chip dc-chip--sync">Lo atiendes tú</span> : null}
      {r.nudo === 'por_confirmar' ? <span className="dc-chip dc-chip--warn">Nudo por confirmar</span> : null}
      {r.nudo === 'confirmado' ? <span className="dc-chip dc-chip--ok">Nudo confirmado</span> : null}
      {r.nudo === 'revocado' ? <span className="dc-chip dc-chip--off">Nudo corregido (revocado)</span> : null}
      <span className="dc-row">
        {r.pedido.estado === 'abierto' || r.pedido.estado === 'ofrecido' ? (
          <button type="button" className="dc-btn dc-btn--tonal" onClick={() => fuente.yoAyudo(r.pedido.id)}>
            Yo ayudo
          </button>
        ) : null}
        {r.nudo === 'por_confirmar' ? (
          <button type="button" className="dc-btn dc-btn--primary" onClick={() => fuente.confirmarNudo(r.pedido.id)}>
            Confirmar nudo
          </button>
        ) : null}
        {r.nudo === 'por_confirmar' || r.nudo === 'confirmado' ? (
          <button type="button" className="dc-btn" onClick={() => fuente.revocarNudo(r.pedido.id)}>
            Revocar
          </button>
        ) : null}
      </span>
    </article>
  );
}

function Bloque({ titulo, lista, vacio, fuente, nombre }: { titulo: string; lista: RegistroAyuda[]; vacio: string; fuente: FuenteAyudas; nombre(id: string): string }) {
  return (
    <section aria-label={titulo} style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 'var(--rk-fs-title-sm)' }}>{titulo}</h2>
      {lista.length === 0 ? <p className="dc-muted" style={{ margin: 0 }}>{vacio}</p> : lista.map((r) => <Tarjeta key={r.pedido.id} r={r} fuente={fuente} nombre={nombre} />)}
    </section>
  );
}

/** T-23: help board. Open, in-progress and closed requests, knots to confirm. No ranking of groups. */
export function Ayudas({ fuente }: { fuente?: FuenteAyudas }) {
  const { p } = useProyeccion();
  const esDemo = useClase((s) => s.esDemo);
  const grupos = useMemo(() => p.grupos.map((g) => ({ id: g.id, apodo: g.apodo })), [p.grupos]);
  const propia = useMemo(() => fuente ?? crearFuenteAyudas(esDemo ? ayudasDeEjemplo(grupos) : []), [fuente, esDemo, grupos]);
  const [, setV] = useState(0);
  useEffect(() => propia.suscribir(() => setV((v) => v + 1)), [propia]);
  const t = propia.tablero();
  const est = propia.estado();
  const nombre = (id: string) => `Grupo ${grupos.find((g) => g.id === id)?.apodo ?? 'de otra mesa'}`;

  return (
    <>
      <section className="dc-card" aria-labelledby="ay">
        <h2 id="ay">Tablero de ayudas</h2>
        <p className="dc-muted">Los grupos se ayudan en persona, en la mesa, con tu clase mirando. Aquí ves quién pidió, quién ayudó y qué nudos confirmar. No hay ranking de grupos.</p>
        <div className="dc-switch-row">
          <span>
            <strong>Ayudante del museo</strong>
            <br />
            <span className="dc-muted">{est.activo ? 'Encendido: los grupos pueden pedir y ofrecer ayuda.' : 'Apagado (por defecto). Apágalo aquí cuando quieras pausarlo.'}</span>
          </span>
          <input type="checkbox" role="switch" className="dc-switch" aria-label="Ayudante del museo" checked={est.activo} onChange={(e) => propia.activar(e.currentTarget.checked)} />
        </div>
        {grupos.length ? (
          <div className="dc-field">
            <label htmlFor="silenciar">Silenciar a un grupo</label>
            <select id="silenciar" className="dc-input" value="" onChange={(e) => e.currentTarget.value && propia.silenciar(e.currentTarget.value, true)}>
              <option value="">Elegir grupo…</option>
              {grupos.filter((g) => !est.silenciados.includes(g.id)).map((g) => (
                <option key={g.id} value={g.id}>Grupo {g.apodo}</option>
              ))}
            </select>
            {est.silenciados.map((id) => (
              <button key={id} type="button" className="dc-btn" onClick={() => propia.silenciar(id, false)}>
                Quitar silencio a {nombre(id)}
              </button>
            ))}
          </div>
        ) : null}
        <span className="dc-chip dc-chip--warn">{t.nudosPorConfirmar} {t.nudosPorConfirmar === 1 ? 'nudo' : 'nudos'} por confirmar</span>
        {esDemo ? <span className="dc-chip dc-chip--warn">Datos de ejemplo</span> : null}
      </section>
      <Bloque titulo="Pedidos abiertos" fuente={propia} nombre={nombre} lista={t.abiertos} vacio="No hay pedidos abiertos." />
      <Bloque titulo="En curso" fuente={propia} nombre={nombre} lista={t.enCurso} vacio="Nadie está ayudando ahora." />
      <Bloque titulo="Cerrados" fuente={propia} nombre={nombre} lista={t.cerrados} vacio="Aún no se cierra ninguna ayuda." />
    </>
  );
}
