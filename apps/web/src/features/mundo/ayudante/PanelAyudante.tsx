/**
 * E-26 Pedir ayuda and E-27 Ayudar (guía del ayudante). Closed chips only: no free text to other groups,
 * no chat. The restated phrase stays on this device and only goes to the judge.
 */
import { GUIA_AYUDANTE, NECESIDADES, type Necesidad, RESULTADOS, type ResultadoAyuda } from '@rikuy/campus';
import { useEffect, useState } from 'react';
import { grupoActual } from '../grupo.ts';
import { NODOS_EXHIBICION, apodoDe, etiquetaNodo, juzgarFrase, useAyudante } from './servicio.ts';

const PISTA_1: Record<string, string> = {
  'exh-pendulo': 'Pista 1: ¿qué cambiaron entre una medición y otra? Mira solo esa columna de tu tabla.',
};

export function PanelAyudante({ exhibicionId, alIrAExhibicion }: { exhibicionId: string; alIrAExhibicion?: () => void }) {
  const { estado, despachar, ultimoError } = useAyudante();
  const [pidiendo, setPidiendo] = useState(false);
  const [pistaVista, setPistaVista] = useState(false);
  const [nodo, setNodo] = useState<string | null>(null);
  const [necesidad, setNecesidad] = useState<Necesidad | null>(null);
  const [frase, setFrase] = useState('');

  useEffect(() => {
    const t = setInterval(() => despachar({ tipo: 'tick' }), 15_000);
    return () => clearInterval(t);
  }, [despachar]);

  if (!estado.config.activo) return null;
  const nodos = NODOS_EXHIBICION[exhibicionId] ?? [];
  const mio = [...estado.pedidos].reverse().find((p) => p.grupoPideId === grupoActual().id && ['ofrecido', 'en_curso', 'escalado'].includes(p.estado));
  const invitaciones = estado.pedidos.flatMap((p) =>
    p.estado === 'ofrecido' ? p.ofertas.filter((o) => o.estado === 'enviada' && o.grupoAyudaId === grupoActual().id).map((o) => ({ p, o })) : [],
  );
  const ayudando = estado.pedidos.find((p) => p.estado === 'en_curso' && p.grupoAyudaId === grupoActual().id);

  const enviar = () => {
    if (!nodo || !necesidad) return;
    despachar({ tipo: 'pedir', grupoPideId: grupoActual().id, exhibicionId, nodoId: nodo, necesidad });
    setPidiendo(false);
  };

  const cerrar = (resultado: ResultadoAyuda) => {
    if (!mio) return;
    const conFrase = frase.trim();
    despachar({
      tipo: 'cerrar',
      pedidoId: mio.id,
      grupoId: grupoActual().id,
      resultado,
      ...(conFrase ? { frase: conFrase, nivelJuez: juzgarFrase(conFrase) } : {}),
    });
    setFrase('');
  };

  return (
    <section className="rk-panel" aria-labelledby="titulo-ayudante">
      <h2 id="titulo-ayudante">Ayudante del museo</h2>

      {invitaciones.map(({ p, o }) => (
        <div key={o.id} className="rk-placa" style={{ borderLeftColor: 'var(--m-sol)' }}>
          <strong>
            El grupo {apodoDe(p.grupoPideId)} necesita ayuda con «{etiquetaNodo(p.nodoId)}».
          </strong>
          <span>Piden: {NECESIDADES[p.necesidad].toLowerCase()}.</span>
          <div className="rk-fila">
            <button type="button" className="rk-btn" data-primario="" onClick={() => despachar({ tipo: 'responder', ofertaId: o.id, grupoId: grupoActual().id, acepta: true })}>
              Vamos
            </button>
            <button type="button" className="rk-btn" onClick={() => despachar({ tipo: 'responder', ofertaId: o.id, grupoId: grupoActual().id, acepta: false })}>
              Ahora no
            </button>
          </div>
        </div>
      ))}

      {ayudando && (
        <div className="rk-placa" style={{ borderLeftColor: 'var(--m-ichu)' }}>
          <strong>Guía del ayudante: vayan a la mesa del grupo {apodoDe(ayudando.grupoPideId)} (3 a 5 minutos)</strong>
          <ol style={{ margin: 0, paddingLeft: 24 }}>
            {GUIA_AYUDANTE.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
          <span>No les den la respuesta: ayúdenlos a encontrarla.</span>
          {alIrAExhibicion && (
            <button type="button" className="rk-btn" onClick={alIrAExhibicion}>
              Encontrarse en la exhibición
            </button>
          )}
        </div>
      )}

      {!mio && !pidiendo && (
        <button type="button" className="rk-btn" onClick={() => setPidiendo(true)}>
          Pedir ayuda a otro grupo
        </button>
      )}

      {pidiendo && !pistaVista && PISTA_1[exhibicionId] && (
        <div className="rk-placa" style={{ borderLeftColor: 'var(--m-sol)' }}>
          <span>Rikuy primero: ¿quieres ver la pista 1 antes de pedir ayuda?</span>
          <p style={{ margin: 0 }} aria-live="polite">
            {PISTA_1[exhibicionId]}
          </p>
          <div className="rk-fila">
            <button type="button" className="rk-btn" onClick={() => setPistaVista(true)}>
              Ya la vimos, seguir
            </button>
            <button type="button" className="rk-btn" onClick={() => setPistaVista(true)}>
              Saltar la pista
            </button>
          </div>
        </div>
      )}

      {pidiendo && (pistaVista || !PISTA_1[exhibicionId]) && (
        <fieldset className="rk-placa" style={{ borderLeftColor: 'var(--m-sol)' }}>
          <legend>¿Con qué necesitan ayuda?</legend>
          <div className="rk-fila" role="group" aria-label="Concepto">
            {nodos.map((n) => (
              <button key={n.id} type="button" className="rk-btn" aria-pressed={nodo === n.id} onClick={() => setNodo(n.id)}>
                {n.etiqueta}
              </button>
            ))}
          </div>
          <div className="rk-fila" role="group" aria-label="Qué necesitan">
            {(Object.keys(NECESIDADES) as Necesidad[]).map((k) => (
              <button key={k} type="button" className="rk-btn" aria-pressed={necesidad === k} onClick={() => setNecesidad(k)}>
                {NECESIDADES[k]}
              </button>
            ))}
          </div>
          <div className="rk-fila">
            <button type="button" className="rk-btn" data-primario="" aria-disabled={!nodo || !necesidad ? 'true' : undefined} onClick={enviar}>
              Enviar pedido
            </button>
            <button type="button" className="rk-btn" onClick={() => setPidiendo(false)}>
              Cancelar
            </button>
          </div>
        </fieldset>
      )}

      {mio && (
        <div className="rk-placa" style={{ borderLeftColor: 'var(--m-sol)' }} aria-live="polite">
          <strong>Pedido: «{etiquetaNodo(mio.nodoId)}»</strong>
          {mio.estado === 'ofrecido' && <span>Rikuy busca un grupo que ya lo razonó…</span>}
          {mio.estado === 'escalado' && <span>Levanta la mano: tu docente verá tu pedido y va para allá.</span>}
          {mio.estado === 'en_curso' && (
            <>
              <span>
                {mio.ayudaDocente ? 'Tu docente viene a tu mesa.' : `El grupo ${apodoDe(mio.grupoAyudaId!)} viene a tu mesa.`} Cuando terminen:
              </span>
              <label htmlFor="frase-ayuda">¿Lo puedes decir con tus palabras?</label>
              <textarea
                id="frase-ayuda"
                value={frase}
                maxLength={280}
                rows={3}
                onChange={(e) => setFrase(e.target.value)}
                style={{ font: 'inherit', padding: 8, border: '2px solid var(--m-border)', borderRadius: 12 }}
              />
              <small>Tu frase se queda en este celular y la revisa Rikuy por reglas. No se envía a otros grupos.</small>
              <div className="rk-fila">
                {(Object.keys(RESULTADOS) as ResultadoAyuda[]).map((r) => (
                  <button key={r} type="button" className="rk-btn" data-primario={r === 'nos_ayudo' ? '' : undefined} onClick={() => cerrar(r)}>
                    {RESULTADOS[r]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {ultimoError === 'pedido_abierto' && <p role="alert">Ya tienen un pedido abierto.</p>}
    </section>
  );
}
