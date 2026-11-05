import { QrSvg } from '../docente/componentes/QrSvg.tsx';
import type { Hoja } from './hoja.ts';
import { Pictograma } from './Pictograma.tsx';

/** T-15 preview and F-03 print: one A4 page, black and white safe, pictograms plus a data table. */
export function HojaA4({ hoja }: { hoja: Hoja }) {
  return (
    <article className="a4-hoja" aria-label="Hoja para llevar a casa">
      <header>
        <p className="dc-muted" style={{ margin: 0 }}>Rikuy · Para llevar</p>
        <h1>{hoja.titulo}</h1>
        <p style={{ margin: 0 }}>{hoja.preguntaGuia}</p>
        {hoja.preguntaQuechua ? <p style={{ margin: 0 }} lang="quy">{hoja.preguntaQuechua}</p> : null}
        {hoja.avisoQuechua ? <p className="dc-muted" style={{ margin: 0 }}>{hoja.avisoQuechua}</p> : null}
      </header>
      <section aria-labelledby="a4-necesitas">
        <h2 id="a4-necesitas" style={{ fontSize: '14pt', margin: '0 0 2mm' }}>Necesitas</h2>
        <div className="fa-picto-fila">
          {hoja.materiales.map((m) => (
            <Pictograma key={m.nombre} id={m.picto} etiqueta={m.nombre} />
          ))}
        </div>
      </section>
      <section aria-labelledby="a4-pasos">
        <h2 id="a4-pasos" style={{ fontSize: '14pt', margin: '0 0 2mm' }}>Pasos</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '2mm' }}>
          {hoja.pasos.map((p, i) => (
            <li key={p.texto} className="fa-paso">
              <b>{i + 1}</b>
              <span>{p.texto}</span>
            </li>
          ))}
        </ol>
      </section>
      <table className="fa-tabla">
        <caption style={{ textAlign: 'left', fontWeight: 700 }}>Tabla de datos</caption>
        <thead>
          <tr>
            <th scope="col">{hoja.tabla.encabezados[0]}</th>
            <th scope="col">{hoja.tabla.encabezados[1]}</th>
          </tr>
        </thead>
        <tbody>
          {hoja.tabla.filas.map((f) => (
            <tr key={f}>
              <th scope="row">{f}</th>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="a4-dibujo">{hoja.dibuja}</div>
      <footer className="a4-pie">
        <p style={{ margin: 0, flex: 1 }}>Cuando vuelvas al colegio, muestra este código a tu profesor o profesora.</p>
        <QrSvg texto={hoja.retorno} tamano={110} etiqueta="Código para mostrar al volver al colegio" />
      </footer>
    </article>
  );
}
