/**
 * "Charla de cerca": short messages that only the groups near you in this hall read. The rules (clean,
 * mask, no links or phone numbers, rate limit, radius) are AulaQuipu's proximity chat ported to
 * @rikuy/campus `charla.ts`. Without the hub the messages stay on this device; the panel says so.
 */
import { type AvatarRender, LARGO_MAXIMO, TAM_HISTORIAL, lectoresCerca, limitarRitmo, prepararMensaje } from '@rikuy/campus';
import { useRef, useState } from 'react';

interface Linea {
  id: number;
  texto: string;
  lectores: string[];
}

export function ChatSala({ salaId, posicion, otros }: { salaId: string; posicion: () => { x: number; y: number }; otros: () => readonly AvatarRender[] }) {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [valor, setValor] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const enviados = useRef<number[]>([]);
  const siguiente = useRef(1);

  const enviar = () => {
    const r = prepararMensaje(valor);
    if (!r.ok) {
      setAviso(r.motivo);
      return;
    }
    const espera = limitarRitmo(enviados.current, Date.now());
    if (espera) {
      setAviso(espera);
      return;
    }
    const lectores = lectoresCerca(posicion(), otros()).map((o) => o.etiqueta);
    setLineas((prev) => [...prev, { id: siguiente.current++, texto: r.texto, lectores }].slice(-TAM_HISTORIAL));
    setValor('');
    setAviso(null);
  };

  return (
    <div className="ek-charla" data-sala={salaId}>
      <ol role="log" aria-live="polite" className="ek-charla__log">
        {lineas.length === 0 ? <li className="ek-muted">Escriban algo corto a los grupos que están cerca. Nada de datos personales.</li> : null}
        {lineas.map((l) => (
          <li key={l.id} className="ek-charla__linea">
            <span>{l.texto}</span>
            <small className="ek-muted">{l.lectores.length ? `Lo leen: ${l.lectores.join(', ')}` : 'Nadie cerca: acérquense a otro grupo'}</small>
          </li>
        ))}
      </ol>
      <form
        className="ek-charla__form"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <label className="sr-only" htmlFor="ek-charla-entrada">
          Mensaje para los grupos cercanos
        </label>
        <input id="ek-charla-entrada" value={valor} maxLength={LARGO_MAXIMO} onChange={(e) => setValor(e.target.value)} placeholder="Mensaje corto" />
        <button type="submit" className="ek-primario">
          Enviar
        </button>
      </form>
      <p role="status" className="ek-muted ek-charla__aviso">
        {aviso ?? 'Sin hub, los mensajes se quedan en este equipo.'}
      </p>
    </div>
  );
}
