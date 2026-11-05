import type { MapaCalorDudas as Mapa } from '@rikuy/reportes';

export interface MapaCalorDudasProps {
  mapa: Mapa;
  nombreExhibicion(exhibicionId: string): string;
}

/** Class-level heatmap of doubts by concept and exhibit. Count in the cell (never color alone); no names. */
export function MapaCalorDudas({ mapa, nombreExhibicion }: MapaCalorDudasProps) {
  if (mapa.celdas.length === 0) return <p>Todavía no hay dudas.</p>;
  const conceptos = [...new Map(mapa.celdas.map((c) => [c.conceptoId, c.etiqueta])).entries()];
  const exhibiciones = [...new Set(mapa.celdas.map((c) => c.exhibicionId))];
  const celda = (cId: string, eId: string) => mapa.celdas.find((c) => c.conceptoId === cId && c.exhibicionId === eId);
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <p>{mapa.aviso}</p>
      <table aria-label="Dudas por tema y exhibición" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th scope="col">Tema</th>
            {exhibiciones.map((e) => (
              <th key={e} scope="col">{nombreExhibicion(e)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {conceptos.map(([cId, etiqueta]) => (
            <tr key={cId}>
              <th scope="row">{etiqueta}</th>
              {exhibiciones.map((e) => {
                const c = celda(cId, e);
                return (
                  <td
                    key={e}
                    style={{
                      border: '2px solid var(--rk-border-strong, #6a7568)',
                      padding: 8,
                      textAlign: 'center',
                      background: c && !c.suprimido ? `rgba(7, 94, 108, ${0.15 + 0.6 * c.intensidad})` : 'transparent',
                    }}
                  >
                    {c ? (c.suprimido ? 'Pocas dudas' : c.dudas) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {mapa.temasParaReforzar.length > 0 && (
        <div>
          <h3>Temas para reforzar</h3>
          <ol>
            {mapa.temasParaReforzar.map((t) => (
              <li key={t.conceptoId}>
                {t.etiqueta} · {t.dudas} {t.dudas === 1 ? 'duda' : 'dudas'}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
