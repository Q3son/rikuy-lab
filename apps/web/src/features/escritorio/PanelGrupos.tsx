/** Groups present in the current hall (presence sampled once a second; never ordered by performance). */
import type { AvatarRender } from '@rikuy/campus';
import { useEffect, useState } from 'react';

/** Peers are not React state (they move 6 times a second); the panel samples them once a second. */
function useMuestreo<T>(leer: () => T, ms = 1000): T {
  const [v, setV] = useState(leer);
  useEffect(() => {
    const id = setInterval(() => setV(leer()), ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
  return v;
}

export function PanelGrupos({
  otros,
  propio,
  sala,
}: {
  otros: () => readonly AvatarRender[];
  /** The own group; absent for the teacher, who watches. */
  propio?: { apodo: string; color: string; integrantes: number };
  sala: string;
}) {
  const lista = useMuestreo(() => otros().map((o) => ({ id: o.id, etiqueta: o.etiqueta, color: o.color, integrantes: o.integrantes, pideAyuda: !!o.pideAyuda })));
  return (
    <section className="ek-card" aria-labelledby="ek-grupos">
      <header className="ek-card__head">
        <h3 id="ek-grupos">Grupos en {sala}</h3>
        <span className="ek-pill">{lista.length + (propio ? 1 : 0)}</span>
      </header>
      <ul className="ek-grupos">
        {propio ? (
          <li>
            <span className="ek-punto" style={{ background: propio.color }} aria-hidden="true" />
            <span className="ek-grupos__nombre">{propio.apodo}</span>
            <span className="ek-tag ek-tag--propio">Ustedes · {propio.integrantes}</span>
          </li>
        ) : null}
        {lista.map((g) => (
          <li key={g.id}>
            <span className="ek-punto" style={{ background: g.color }} aria-hidden="true" />
            <span className="ek-grupos__nombre">{g.etiqueta}</span>
            {g.pideAyuda ? <span className="ek-tag ek-tag--ayuda">Pide ayuda</span> : <span className="ek-tag">Explorando</span>}
          </li>
        ))}
      </ul>
      {lista.length === 0 ? <p className="ek-muted">{propio ? 'Por ahora están solos en esta sala.' : 'Ningún grupo en esta sala ahora.'}</p> : null}
    </section>
  );
}

