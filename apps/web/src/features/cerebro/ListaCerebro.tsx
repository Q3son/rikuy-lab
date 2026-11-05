import type { MapaCerebro, NodoMapa } from '@rikuy/cerebro';
import { ETIQUETA_ESTADO } from '@rikuy/cerebro';

export interface ListaCerebroProps {
  mapa: MapaCerebro;
  onSeleccionar(nodoId: string): void;
}

/** Accessible alternative to the SVG: same data, grouped by competency, state spelled out. */
export function ListaCerebro({ mapa, onSeleccionar }: ListaCerebroProps) {
  const hubs = mapa.nodos.filter((n) => n.tipo === 'competencia');
  const hijosDe = (hubId: string): NodoMapa[] => mapa.nodos.filter((n) => n.padre === hubId);
  return (
    <div>
      {hubs.map((h) => (
        <section key={h.id} aria-label={h.etiqueta}>
          <h3>
            {h.etiqueta} · {ETIQUETA_ESTADO[h.estado]}
          </h3>
          <ul>
            {hijosDe(h.id).map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => onSeleccionar(n.id)}>
                  {n.etiqueta} · {ETIQUETA_ESTADO[n.estado]}
                  {n.preguntaAbierta ? ` · ${ETIQUETA_ESTADO.pregunta_abierta} pregunta abierta` : ''}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
