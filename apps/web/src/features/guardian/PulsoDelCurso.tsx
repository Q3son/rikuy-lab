import { useId, useState } from 'react';
import { ESCALA_PULSO, type ItemPulso, type RespuestaPulso } from '@rikuy/senales';
import './guardian.css';

export interface RespuestaItem {
  itemId: string;
  valor: RespuestaPulso['valor'];
}

export interface PulsoDelCursoProps {
  items: ItemPulso[];
  onEnviar(respuestas: RespuestaItem[]): void;
}

/** Weekly "pulso del curso": collective wording, optional, "prefiero no decir" at equal weight. */
export function PulsoDelCurso({ items, onEnviar }: PulsoDelCursoProps) {
  const base = useId();
  const [valores, setValores] = useState<Record<string, RespuestaPulso['valor']>>({});
  const respuestas = items.flatMap((i) => (valores[i.id] !== undefined ? [{ itemId: i.id, valor: valores[i.id] as RespuestaPulso['valor'] }] : []));
  return (
    <section className="rk-gd" aria-labelledby={`${base}-t`}>
      <h2 id={`${base}-t`}>Pulso del curso</h2>
      <p>¿Cómo nos cuidamos en el curso? Responde lo que quieras.</p>
      {items.map((i) => (
        <div key={i.id} role="radiogroup" aria-label={i.texto}>
          <strong>{i.texto}</strong>
          <div className="rk-gd-fila">
            {ESCALA_PULSO.map((e) => (
              <label key={e.valor} className="rk-gd-radio">
                <input type="radio" name={`${base}-${i.id}`} checked={valores[i.id] === e.valor} onChange={() => setValores((v) => ({ ...v, [i.id]: e.valor }))} />
                {e.texto}
              </label>
            ))}
            <label className="rk-gd-radio">
              <input type="radio" name={`${base}-${i.id}`} checked={valores[i.id] === 'prefiero_no_decir'} onChange={() => setValores((v) => ({ ...v, [i.id]: 'prefiero_no_decir' }))} />
              Prefiero no decir
            </label>
          </div>
        </div>
      ))}
      <div className="rk-gd-fila">
        <button type="button" className="rk-primario" disabled={respuestas.length === 0} onClick={() => onEnviar(respuestas)}>Enviar</button>
        <button type="button" onClick={() => onEnviar([])}>Ahora no</button>
      </div>
    </section>
  );
}
