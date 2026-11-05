import { PaqueteValidado } from '@rikuy/contracts';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import '../docente/estilos.css';
import { QrSvg } from '../docente/componentes/QrSvg.tsx';
import { decodificarEnlace } from './enlace.ts';
import { construirHoja } from './hoja.ts';
import { Pictograma } from './Pictograma.tsx';

/**
 * F-02: the light page a family opens from WhatsApp. It decodes the fragment in the browser
 * (no request, no tracking, no account) so it keeps working with no network.
 */
export function PaginaFamilia() {
  const { carga = '' } = useParams();
  const [lengua, setLengua] = useState<'es' | 'quy'>('es');
  const datos = useMemo(() => {
    const r = decodificarEnlace(carga);
    if (!r.ok) return { error: r.error } as const;
    const p = PaqueteValidado.safeParse(r.valor);
    if (!p.success || p.data.tipo !== 'practica') return { error: 'Este enlace no es de una hoja de Rikuy.' } as const;
    return { practica: p.data.cuerpo, claseId: p.data.claseId } as const;
  }, [carga]);

  if ('error' in datos) {
    return (
      <main className="fa-pagina">
        <h1>No se pudo abrir la hoja</h1>
        <p role="alert">{datos.error} Pídele a la profesora que te lo envíe otra vez o que te dé la hoja impresa.</p>
      </main>
    );
  }
  const hoja = construirHoja(datos.practica, { lengua, codigoClase: datos.claseId?.slice(-6) ?? 'AULA' });
  const hayQuechua = datos.practica.textos?.quy?.revisado === true;
  return (
    <main className="fa-pagina">
      <header style={{ display: 'grid', gap: 8 }}>
        <p className="dc-muted" style={{ margin: 0 }}>Para llevar · funciona sin internet una vez abierto</p>
        <h1 style={{ margin: 0 }}>{hoja.titulo}</h1>
        {hayQuechua ? (
          <div className="dc-row" role="group" aria-label="Lengua">
            <button type="button" className="dc-btn" aria-pressed={lengua === 'es'} onClick={() => setLengua('es')}>Castellano</button>
            <button type="button" className="dc-btn" aria-pressed={lengua === 'quy'} onClick={() => setLengua('quy')}>Quechua</button>
          </div>
        ) : null}
        <p style={{ margin: 0 }}>{hoja.preguntaGuia}</p>
        {hoja.preguntaQuechua ? <p style={{ margin: 0 }} lang="quy">{hoja.preguntaQuechua}</p> : null}
      </header>
      <section aria-labelledby="fa-necesitas">
        <h2 id="fa-necesitas">Necesitas</h2>
        <div className="fa-picto-fila">
          {hoja.materiales.map((m) => (
            <Pictograma key={m.nombre} id={m.picto} etiqueta={m.nombre} />
          ))}
        </div>
      </section>
      <section aria-labelledby="fa-pasos">
        <h2 id="fa-pasos">Pasos</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
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
      <section aria-labelledby="fa-vuelta" className="dc-card">
        <h2 id="fa-vuelta">Cuando vuelvas al colegio</h2>
        <p style={{ margin: 0 }}>Muestra este código a tu profesora o profesor.</p>
        <QrSvg texto={hoja.retorno} tamano={176} etiqueta="Código para mostrar al volver al colegio" />
      </section>
    </main>
  );
}
