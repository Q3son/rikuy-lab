/**
 * Accessible list mode (1.3, DESIGN.md 7.4): every hall and exhibit of the museum as plain links and
 * plaques, for screen readers and for devices that cannot run the canvas. Nothing here needs the map.
 */
import { SALAS_CONTENIDO, estiloSala, rutaDeSala } from '@rikuy/campus';
import { RUTAS } from '@rikuy/contracts';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { PREGUNTAS_DEMO, construirMuseo } from './catalogo.ts';
import { Glifo } from './Iconos.tsx';
import { colorDeSala } from './paleta.ts';
import './mundo.css';

export function ListaMuseo({ retos = [] }: { retos?: { id: string; titulo: string }[] }) {
  const museo = useMemo(() => construirMuseo({ retos }), [retos]);
  return (
    <section className="rk-mundo" aria-labelledby="titulo-lista">
      <header className="rk-sign" style={{ background: 'var(--m-primary)' }}>
        <span className="rk-glifo">
          <Glifo nombre="museo" />
        </span>
        <h2 id="titulo-lista">Museo Rikuy en lista</h2>
      </header>
      <p style={{ padding: '8px 16px', margin: 0 }}>
        Todas las salas y exhibiciones del museo. <Link to={RUTAS.museo}>Volver al mapa</Link>
      </p>
      {SALAS_CONTENIDO.map((sala) => {
        const estilo = estiloSala(sala);
        const escena = museo.salas[sala.id];
        const destinos = (escena?.destinos ?? []).filter((d) => d.tipo !== 'puerta');
        const sinPedestal = escena?.sinPedestal ?? [];
        return (
          <section key={sala.id} className="rk-panel" aria-labelledby={`lista-${sala.id}`} style={{ borderLeft: `10px solid ${colorDeSala(sala.id)}` }}>
            <h2 id={`lista-${sala.id}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Glifo nombre={estilo.glifo} />
              Sala {estilo.nombre}
            </h2>
            {estilo.sublabel && (
              <small lang="qu" style={{ fontStyle: 'italic' }}>
                {estilo.sublabel}
              </small>
            )}
            <Link className="rk-btn" to={rutaDeSala(sala.id)}>
              Entrar a la Sala {estilo.nombre}
            </Link>
            {destinos.length === 0 && sinPedestal.length === 0 && sala.plantilla === 'sala-tematica' && (
              <p>Esta sala aún no tiene exhibiciones; visita la Sala Física.</p>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {destinos.map((d) => (
                <li key={d.id}>
                  <article className="rk-placa" style={{ borderLeftColor: colorDeSala(sala.id) }}>
                    <strong>{d.etiqueta}</strong>
                    {d.exhibicionId && PREGUNTAS_DEMO[d.exhibicionId] && <span>{PREGUNTAS_DEMO[d.exhibicionId]}</span>}
                    {d.bloqueada ? (
                      <span className="rk-chip">Cerrada: se abre con el quipu del aula</span>
                    ) : (
                      <Link className="rk-btn" data-primario="" to={d.destino}>
                        {d.tipo === 'reto' ? 'Jugar el reto' : d.tipo === 'exhibicion' ? 'Entrar a la exhibición' : 'Abrir'}{' '}
                        <span className="sr-only">{d.etiqueta}</span>
                      </Link>
                    )}
                  </article>
                </li>
              ))}
              {sinPedestal.map((e) => (
                <li key={e.id}>
                  <Link className="rk-btn" to={RUTAS.exhibicion.replace(':exhibicionId', e.id)}>
                    {e.id}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
