/**
 * Teacher on desktop: the same museum world, to watch the groups move hall by hall, next to the class
 * panel. The teacher is drawn as one marker ("Docente") and can walk too; presence is read-only here
 * (the teacher never sends a group position). Halls are the CNEB areas of @rikuy/campus.
 * Spectator idea from AulaQuipu's campus (paoloose), adapted; credits in docs/ATRIBUCIONES.md.
 */
import { SALAS_CONTENIDO, estiloSala } from '@rikuy/campus';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { construirMuseo } from '../mundo/catalogo.ts';
import { ControladorMundo } from '../mundo/controlador.ts';
import { colorDeSala } from '../mundo/paleta.ts';
import { usePresencia } from '../mundo/presencia/usePresencia.ts';
import { VistaMundo } from '../mundo/VistaMundo.tsx';
import { PanelGrupos } from './PanelGrupos.tsx';
import './escritorio.css';

const nada = () => {};

export function ObservarMuseo({ panel }: { panel: ReactNode }) {
  const museo = useMemo(() => construirMuseo(), []);
  const [salaId, setSalaId] = useState('vestibulo');
  const escena = salaId === 'vestibulo' ? museo.vestibulo : (museo.salas[salaId] ?? museo.vestibulo);
  const controlador = useMemo(() => new ControladorMundo(escena, nada), [escena]);
  const presencia = usePresencia(museo, escena.id, null);
  const activar = useCallback(() => {}, []);
  const salas = [{ id: 'vestibulo', nombre: 'Vestíbulo' }, ...SALAS_CONTENIDO.filter((s) => museo.salas[s.id]).map((s) => ({ id: s.id, nombre: estiloSala(s).nombre }))];
  const nombre = salas.find((s) => s.id === escena.id)?.nombre ?? 'Vestíbulo';

  return (
    <section className="ek-museo ek-docente" aria-labelledby="ek-observar">
      <div className="ek-docente__mundo">
        <div className="ek-docente__barra">
          <h2 id="ek-observar">Museo en vivo</h2>
          <div className="ek-salas" role="group" aria-label="Sala que miran">
            {salas.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === escena.id}
                style={s.id !== 'vestibulo' ? { ['--ek-sala' as string]: colorDeSala(s.id) } : undefined}
                onClick={() => setSalaId(s.id)}
              >
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="ek-escenario ek-escenario--docente">
          <div className="ek-lienzo">
            <VistaMundo
              llenar
              zoomMinimo={0.55}
              controlador={controlador}
              alActivar={activar}
              etiqueta={`Mapa de ${nombre}, vista de la docente`}
              fuente={{
                jugador: () => ({
                  id: 'docente',
                  x: controlador.pos.x,
                  y: controlador.pos.y,
                  dir: controlador.dir,
                  color: '#0D2B33',
                  etiqueta: 'Docente',
                  integrantes: 1,
                }),
                otros: presencia.otros,
                resaltado: () => undefined,
                sugerencia: () => [],
              }}
            />
          </div>
          <span className="ek-hud ek-hud--sala" aria-hidden="true">
            {nombre}
          </span>
        </div>
      </div>
      <aside className="ek-col" aria-label="Panel de la clase">
        <PanelGrupos otros={presencia.otros} sala={escena.id === 'vestibulo' ? 'el vestíbulo' : `la sala ${nombre}`} />
        {panel}
      </aside>
    </section>
  );
}
