/**
 * E-01 Vestíbulo and E-02 Sala: the walkable museum. Container: builds the scene from content, runs the
 * director and wires presence. The canvas is optional; destinations are real buttons.
 */
import { type Destino, type Escena, SALAS_CONTENIDO, dirigir, estiloSala } from '@rikuy/campus';
import { RUTAS } from '@rikuy/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { EXHIBICION_DEL_DIA, EXHIBICIONES_DEMO, TITULOS_DEMO, construirMuseo } from './catalogo.ts';
import { ControladorMundo } from './controlador.ts';
import { registroMuseo, visita } from './eventos.ts';
import { GRUPO_DEMO } from './grupo.ts';
import { Glifo, Rikuy } from './Iconos.tsx';
import { PanelAyudante } from './ayudante/PanelAyudante.tsx';
import { useAyudante } from './ayudante/servicio.ts';
import { colorDeSala } from './paleta.ts';
import { Reacciones } from './presencia/Reacciones.tsx';
import { usePresencia } from './presencia/usePresencia.ts';
import { VistaMundo } from './VistaMundo.tsx';
import './mundo.css';

function textoBloqueo(d: Destino): string | null {
  if (d.bloqueada) {
    const nudos = d.bloqueada.startsWith('quipu:') ? d.bloqueada.slice(6) : '';
    return nudos ? `Cerrada: se abre con ${nudos} nudos del quipu del aula` : 'Cerrada por ahora';
  }
  if (d.trasReja) return 'Detrás de la reja: responde la pregunta del curador';
  return null;
}

/** Opens a destination: records the exhibit visit (no positions) and goes to its route. */
function abrirDestino(d: Destino, navegar: (ruta: string) => void) {
  if (d.exhibicionId && d.salaId) registroMuseo.registrar(visita(d.salaId, GRUPO_DEMO.id, d.exhibicionId));
  navegar(d.destino);
}

function primeraVisita(): boolean {
  try {
    if (sessionStorage.getItem('rk-museo-visto')) return false;
    sessionStorage.setItem('rk-museo-visto', '1');
  } catch {
    // storage unavailable: greet anyway
  }
  return true;
}

export function MuseoPagina() {
  const { salaId } = useParams();
  const navegar = useNavigate();
  const museo = useMemo(() => construirMuseo(), []);
  const escena: Escena | undefined = salaId ? museo.salas[salaId] : museo.vestibulo;
  const [parametros] = useSearchParams();
  const sim = parametros.get('sim');
  const simulados = sim !== null && /^\d{1,3}$/.test(sim) ? Number(sim) : null;
  const [saludo] = useState(primeraVisita);
  const presencia = usePresencia(museo, escena?.id ?? 'vestibulo', simulados);
  const ayudante = useAyudante((s) => s.estado);
  const animado = useRef(false);
  const alActivar = useCallback((activo: boolean) => {
    animado.current = activo;
  }, []);

  const controlador = useMemo(
    () =>
      escena
        ? new ControladorMundo(escena, (d) => abrirDestino(d, navegar))
        : null,
    [escena, navegar],
  );

  useEffect(() => {
    if (escena && escena.id !== 'vestibulo') registroMuseo.registrar(visita(escena.id, GRUPO_DEMO.id));
  }, [escena]);

  if (!escena || !controlador) {
    return (
      <main className="rk-mundo">
        <div className="rk-burbuja" role="status">
          <Rikuy expresion="piensa" />
          <p>Esta sala aún no existe. ¿Volvemos al vestíbulo?</p>
        </div>
        <Link className="rk-btn" to={RUTAS.museo}>
          Volver al vestíbulo
        </Link>
      </main>
    );
  }

  const sala = SALAS_CONTENIDO.find((s) => s.id === escena.id);
  const estilo = sala ? estiloSala(sala) : null;
  const hoyExh = EXHIBICIONES_DEMO.find((e) => e.id === EXHIBICION_DEL_DIA);
  const hoySala = hoyExh && SALAS_CONTENIDO.find((s) => s.id === hoyExh.salaId);
  const direccion = dirigir({
    escenaId: escena.id,
    primeraVisita: saludo,
    gruposEnSala: presencia.gruposEnSala,
    sinRed: typeof navigator !== 'undefined' && navigator.onLine === false,
    ...(hoyExh && hoySala
      ? { hoy: { exhibicionId: hoyExh.id, salaId: hoyExh.salaId, titulo: TITULOS_DEMO[hoyExh.id] ?? hoyExh.id, sala: estiloSala(hoySala).nombre } }
      : {}),
  });
  const sugerencia = direccion.senalar ? controlador.caminoA(direccion.senalar) : [];
  const exhibicionesSala = escena.destinos.filter((d) => d.tipo === 'exhibicion' && d.exhibicionId);
  const exhibicionAyuda =
    exhibicionesSala.find((d) => d.exhibicionId === EXHIBICION_DEL_DIA)?.exhibicionId ?? exhibicionesSala[0]?.exhibicionId ?? EXHIBICION_DEL_DIA;
  const pidoAyuda = ayudante.pedidos.some((p) => p.grupoPideId === GRUPO_DEMO.id && ['ofrecido', 'en_curso', 'escalado'].includes(p.estado));

  const ir = (d: Destino) => {
    if (textoBloqueo(d)) return;
    // Without the animated world (no canvas) the door opens at once; otherwise the group walks there.
    if (!animado.current || !controlador.irA(d.id)) abrirDestino(d, navegar);
  };

  return (
    <main className="rk-mundo" aria-labelledby="titulo-escena">
      <header className="rk-sign" style={{ background: estilo ? colorDeSala(escena.id) : 'var(--m-primary)' }}>
        <span className="rk-glifo">
          <Glifo nombre={estilo?.glifo ?? 'museo'} />
        </span>
        <div>
          <h1 id="titulo-escena">{estilo ? `Sala ${estilo.nombre}` : 'Vestíbulo del Museo Rikuy'}</h1>
          {estilo?.sublabel && <small lang="qu">{estilo.sublabel}</small>}
        </div>
      </header>

      <div className="rk-burbuja" role="status" aria-live="polite">
        <Rikuy expresion={direccion.expresion} />
        <p>{direccion.mensaje}</p>
      </div>

      <VistaMundo
        controlador={controlador}
        alActivar={alActivar}
        etiqueta={estilo ? `Mapa de la Sala ${estilo.nombre}` : 'Mapa del vestíbulo'}
        fuente={{
          jugador: () => ({
            id: GRUPO_DEMO.dispositivo,
            x: controlador.pos.x,
            y: controlador.pos.y,
            dir: controlador.dir,
            color: GRUPO_DEMO.color,
            etiqueta: GRUPO_DEMO.apodo,
            integrantes: GRUPO_DEMO.integrantes,
            propio: true,
            pideAyuda: pidoAyuda,
          }),
          otros: presencia.otros,
          alPaso: () => presencia.actualizar(controlador.pos.x, controlador.pos.y, controlador.dir),
          resaltado: () => direccion.senalar,
          sugerencia: () => sugerencia,
        }}
      />

      <nav aria-label="Destinos">
        <ul className="rk-destinos">
          {escena.destinos.map((d) => {
            const bloqueo = textoBloqueo(d);
            const verbo = d.tipo === 'puerta' && d.destino !== RUTAS.museo ? 'Ir a la sala' : 'Ir a';
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className="rk-btn"
                  data-primario={d.id === direccion.senalar ? '' : undefined}
                  aria-disabled={bloqueo ? 'true' : undefined}
                  aria-describedby={bloqueo ? `bloqueo-${d.id}` : undefined}
                  onClick={() => ir(d)}
                >
                  {d.tipo === 'puerta' && d.salaId && d.destino !== RUTAS.museo && (
                    <Glifo nombre={estiloSala(SALAS_CONTENIDO.find((s) => s.id === d.salaId)!).glifo} />
                  )}
                  {d.destino === RUTAS.museo ? d.etiqueta : `${verbo} ${d.etiqueta}`}
                </button>
                {bloqueo && (
                  <span id={`bloqueo-${d.id}`} className="rk-chip">
                    {bloqueo}
                  </span>
                )}
              </li>
            );
          })}
          <li>
            <Link className="rk-btn" to="/museo/lista">
              Ver el museo como lista
            </Link>
          </li>
        </ul>
      </nav>

      {ayudante.config.activo && escena.id === 'vestibulo' && (
        <p className="rk-chip" style={{ margin: '0 16px' }}>
          El Ayudante del museo está encendido: pueden pedir y dar ayuda entre grupos.
        </p>
      )}
      <PanelAyudante
        exhibicionId={exhibicionAyuda}
        {...(escena.destinos.some((d) => d.exhibicionId === exhibicionAyuda)
          ? { alIrAExhibicion: () => controlador.irA(`exh-${exhibicionAyuda}`, { abrir: false }) }
          : {})}
      />

      <Reacciones alReaccionar={presencia.reaccionar} />
    </main>
  );
}
