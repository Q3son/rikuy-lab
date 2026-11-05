import type { MapaCerebro } from '@rikuy/cerebro';
import { porQueEstaAsi } from '@rikuy/cerebro';

export interface PlacaNodoProps {
  mapa: MapaCerebro;
  nodoId: string;
  onCerrar(): void;
}

/** "¿Por qué está así?": the entries and the literal quote that back the node. */
export function PlacaNodo({ mapa, nodoId, onCerrar }: PlacaNodoProps) {
  const p = porQueEstaAsi(mapa, nodoId);
  return (
    <section role="dialog" aria-label="¿Por qué está así?" style={{ border: '2px solid var(--rk-border, #d3d9cc)', borderRadius: 16, padding: 16, background: 'var(--rk-surface, #fff)' }}>
      <h3>{p.nodo.etiqueta}</h3>
      <p>
        <strong>{p.estadoEtiqueta}</strong>
        {p.nodo.preguntaAbierta ? ' · ?' : ''}
      </p>
      <p>{p.frase}</p>
      {p.citas.map((c) => (
        <blockquote key={c}>«{c}»</blockquote>
      ))}
      {p.entradas.length > 0 && (
        <ul>
          {p.entradas.map((e, i) => (
            <li key={i}>{e.resumen}</li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onCerrar}>Cerrar</button>
    </section>
  );
}
