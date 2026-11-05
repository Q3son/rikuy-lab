/**
 * Desktop museum (>= 1024 px): the world large and central, with side panels instead of the tab bar.
 *
 * Layout and HUD adapted from AulaQuipu (team project) (https://github.com/paoloose/aulaquipu),
 * `apps/web-app/components/campus/campus-shell.tsx` (hackathon MVP, reuse agreed with its team; credits in
 * docs/ATRIBUCIONES.md): the current-space badge, the "press a key near something" prompt, the guide that
 * walks you with a trail ("Sigue las huellas") and its cancel button. Adapted: rooms are CNEB halls, the
 * guide is Rikuy, the agents are our curators and the Socratic tutor (no paid AI), and the side panels show
 * group presence, the Rikuy chat, the current exhibit and the cooperative class quipu (no ranking).
 * Presentational: MuseoPagina owns the scene, the controller and the presence.
 */
import type { AvatarRender, Destino, Escena, Expresion, Glifo as NombreGlifo } from '@rikuy/campus';
import { KnotIcon } from '@rikuy/ui';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';
import { Glifo, Rikuy } from '../mundo/Iconos.tsx';
import { ChatSala } from './ChatSala.tsx';
import { PanelGrupos } from './PanelGrupos.tsx';
import { type TemaGuia, type TemaGuiaId } from './guia.ts';
import { PanelRikuy } from './PanelRikuy.tsx';
import './escritorio.css';

export interface DatosSala {
  titulo: string;
  sublabel?: string;
  glifo: NombreGlifo;
  color: string;
}

interface Props {
  sala: DatosSala;
  /** The canvas world (VistaMundo with `llenar`). */
  mundo: ReactNode;
  mensaje: string;
  expresion: Expresion;
  destinos: readonly { destino: Destino; etiqueta: string; bloqueo: string | null; primario: boolean; glifo?: ReactNode }[];
  alIr: (d: Destino) => void;
  cercano: Destino | undefined;
  /** Plaque question of an exhibit (reviewed text), when there is one. */
  preguntaDe: (exhibicionId: string) => string | undefined;
  alAbrir: (d: Destino) => void;
  temas: readonly TemaGuia[];
  guiando: TemaGuia | null;
  alGuiar: (t: TemaGuiaId) => void;
  alCancelarGuia: () => void;
  otros: () => readonly AvatarRender[];
  propio: { apodo: string; color: string; integrantes: number };
  posicion: () => { x: number; y: number };
  escena: Escena;
  quipu: { total: number };
  /** Existing museum panels (Ayudante, reactions, curator dialog). */
  extras: ReactNode;
}

function PanelQuipu({ total }: { total: number }) {
  const dibujados = Math.min(total, 14);
  return (
    <section className="ek-card ek-card--quipu" aria-labelledby="ek-quipu">
      <header className="ek-card__head">
        <h3 id="ek-quipu">Quipu del aula</h3>
        <Link to="/quipu" className="ek-link">
          Ver
        </Link>
      </header>
      <div className="ek-cordon" aria-hidden="true">
        {Array.from({ length: dibujados }, (_, i) => (
          <KnotIcon key={i} tipo={i % 5 === 4 ? 'ocho' : i % 3 === 2 ? 'largo' : 'simple'} size={22} />
        ))}
      </div>
      <p className="ek-muted">
        {total === 0 ? 'Aún no hay nudos: se ganan ayudando.' : `${total} ${total === 1 ? 'nudo' : 'nudos'} hechos entre todos. Nada se gasta.`}
      </p>
    </section>
  );
}

export function MuseoEscritorio(p: Props) {
  const [pestana, setPestana] = useState<'rikuy' | 'charla'>('rikuy');
  const cerca = p.cercano;
  const pregunta = cerca?.exhibicionId ? p.preguntaDe(cerca.exhibicionId) : undefined;
  const bloqueoCerca = cerca ? p.destinos.find((d) => d.destino.id === cerca.id)?.bloqueo : null;

  return (
    <section className="ek-museo" aria-labelledby="titulo-escena">
      <aside className="ek-col ek-col--izq" aria-label="Sala y destinos">
        <header className="ek-sala" style={{ ['--ek-sala' as string]: p.sala.color }}>
          <span className="ek-sala__glifo">
            <Glifo nombre={p.sala.glifo} />
          </span>
          <div>
            <h2 id="titulo-escena">{p.sala.titulo}</h2>
            {p.sala.sublabel ? <small lang="qu">{p.sala.sublabel}</small> : <small>Museo Rikuy</small>}
          </div>
        </header>

        <div className="ek-rikuy" role="status" aria-live="polite">
          <span className="ek-rikuy__mascota">
            <Rikuy expresion={p.expresion} />
          </span>
          <p>{p.mensaje}</p>
        </div>

        <section className="ek-card" aria-labelledby="ek-llevame">
          <header className="ek-card__head">
            <h3 id="ek-llevame">Rikuy, llévanos</h3>
          </header>
          <div className="ek-temas">
            {p.temas.map((t) => (
              <button key={t.id} type="button" className="ek-tema" aria-pressed={p.guiando?.id === t.id} onClick={() => p.alGuiar(t.id)}>
                {t.etiqueta}
              </button>
            ))}
          </div>
        </section>

        <nav className="ek-card" aria-label="Destinos">
          <header className="ek-card__head">
            <h3>Destinos</h3>
          </header>
          <ul className="ek-destinos">
            {p.destinos.map(({ destino, etiqueta, bloqueo, primario, glifo }) => (
              <li key={destino.id}>
                <button
                  type="button"
                  className="ek-destino"
                  data-primario={primario ? '' : undefined}
                  aria-disabled={bloqueo ? 'true' : undefined}
                  aria-describedby={bloqueo ? `ek-bloqueo-${destino.id}` : undefined}
                  onClick={() => p.alIr(destino)}
                >
                  {glifo}
                  <span>{etiqueta}</span>
                </button>
                {bloqueo ? (
                  <span id={`ek-bloqueo-${destino.id}`} className="ek-muted ek-bloqueo">
                    {bloqueo}
                  </span>
                ) : null}
              </li>
            ))}
            <li>
              <Link className="ek-destino" to="/museo/piedra">
                <span>Nuestra piedra</span>
              </Link>
            </li>
            <li>
              <Link className="ek-destino" to="/museo/lista">
                <span>Ver el museo como lista</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="ek-extras">{p.extras}</div>
      </aside>

      <div className="ek-escenario">
        <div className="ek-lienzo">{p.mundo}</div>
        {p.guiando ? null : (
          <span className="ek-hud ek-hud--sala" aria-hidden="true">
            {p.sala.titulo}
          </span>
        )}
        {p.guiando ? (
          <div className="ek-hud ek-hud--guia" role="status">
            <span className="ek-hud__mascota">
              <Rikuy expresion="curiosa" tam={44} />
            </span>
            <div>
              <strong>Sigan el camino dorado</strong>
              <span>{p.guiando.dice}</span>
            </div>
            <button type="button" className="ek-hud__cancelar" onClick={p.alCancelarGuia}>
              Cancelar
            </button>
          </div>
        ) : null}
        {cerca ? (
          <button
            type="button"
            className="ek-hud ek-hud--cerca"
            aria-disabled={bloqueoCerca ? 'true' : undefined}
            onClick={() => !bloqueoCerca && p.alAbrir(cerca)}
          >
            <kbd>E</kbd>
            {bloqueoCerca ?? (cerca.tipo === 'curador' ? 'Hablar con el curador' : cerca.tipo === 'puerta' ? `Entrar: ${cerca.etiqueta}` : `Abrir ${cerca.etiqueta}`)}
          </button>
        ) : (
          <p className="ek-hud ek-hud--ayuda" aria-hidden="true">
            Flechas o clic para caminar · E para abrir lo que está cerca
          </p>
        )}
      </div>

      <aside className="ek-col ek-col--der" aria-label="Paneles del grupo">
        <section className="ek-card ek-card--exhibicion" aria-labelledby="ek-actual">
          <header className="ek-card__head">
            <h3 id="ek-actual">{cerca ? 'Cerca de ustedes' : 'Exhibición de hoy'}</h3>
          </header>
          {cerca ? (
            <>
              <p className="ek-exhibicion__titulo">{cerca.etiqueta}</p>
              {pregunta ? <p className="ek-exhibicion__pregunta">{pregunta}</p> : null}
              <button type="button" className="ek-primario" disabled={!!bloqueoCerca} onClick={() => p.alAbrir(cerca)}>
                {bloqueoCerca ?? (cerca.tipo === 'exhibicion' ? 'Abrir la práctica' : cerca.tipo === 'curador' ? 'Hablar con el curador' : 'Entrar')}
              </button>
            </>
          ) : (
            <>
              <p className="ek-muted">Acérquense a una placa para ver su pregunta, o pidan a Rikuy que los lleve.</p>
              <button type="button" className="ek-primario" onClick={() => p.alGuiar('exhibicion')}>
                Llévanos a la exhibición de hoy
              </button>
            </>
          )}
        </section>

        <PanelGrupos otros={p.otros} propio={p.propio} sala={p.escena.id === 'vestibulo' ? 'el vestíbulo' : 'la sala'} />

        <section className="ek-card ek-card--chat" aria-label="Conversación">
          <div className="ek-segmentos" role="tablist" aria-label="Conversación">
            <button type="button" role="tab" aria-selected={pestana === 'rikuy'} onClick={() => setPestana('rikuy')}>
              Rikuy, tutor
            </button>
            <button type="button" role="tab" aria-selected={pestana === 'charla'} onClick={() => setPestana('charla')}>
              Charla de cerca
            </button>
          </div>
          {pestana === 'rikuy' ? <PanelRikuy /> : <ChatSala salaId={p.escena.id} posicion={p.posicion} otros={p.otros} />}
        </section>

        <PanelQuipu total={p.quipu.total} />
      </aside>
    </section>
  );
}
