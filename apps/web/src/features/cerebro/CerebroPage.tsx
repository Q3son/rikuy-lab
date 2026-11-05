import { useState } from 'react';
import { construirMapa, type MapaCerebro } from '@rikuy/cerebro';
import { GRAFO_DEMO, memoriaDemo } from './datosDemo.ts';
import { ListaCerebro } from './ListaCerebro.tsx';
import { MapaCerebroSvg } from './MapaCerebroSvg.tsx';
import { PlacaNodo } from './PlacaNodo.tsx';

export interface CerebroPageProps {
  /** Injected by the container that reads the student's own memory; defaults to mock data. */
  mapaInicial?: MapaCerebro;
}

const LEYENDA = ['Sin explorar', 'Explorado', 'Por revisar', 'Razonado', '? pregunta abierta'];

/** Mi Cerebro Rikuy (E-19): the student sees only their own evidence. The shell top bar holds the h1. */
export function CerebroPage({ mapaInicial }: CerebroPageProps) {
  const [mapa] = useState<MapaCerebro>(() => mapaInicial ?? construirMapa({ grafo: GRAFO_DEMO, ...memoriaDemo() }));
  const [lista, setLista] = useState(false);
  const [nodoId, setNodoId] = useState<string | undefined>();
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 className="sr-only">Mi Cerebro Rikuy</h2>
      <p>Cada luz de tu cerebro es algo que tú dijiste.</p>
      {mapa.vacio && <p>Rikuy aún no recuerda nada de ti</p>}
      <button type="button" onClick={() => setLista((v) => !v)}>{lista ? 'Ver como mapa' : 'Ver como lista'}</button>
      {lista ? (
        <ListaCerebro mapa={mapa} onSeleccionar={setNodoId} />
      ) : (
        <MapaCerebroSvg mapa={mapa} seleccionado={nodoId} onSeleccionar={setNodoId} />
      )}
      <ul aria-label="Leyenda" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, listStyle: 'none', padding: 0 }}>
        {LEYENDA.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {nodoId && <PlacaNodo mapa={mapa} nodoId={nodoId} onCerrar={() => setNodoId(undefined)} />}
    </div>
  );
}
