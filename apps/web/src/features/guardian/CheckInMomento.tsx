import { useEffect, useId, useRef, useState } from 'react';
import { TEXTO_CONFIDENCIALIDAD, type NivelIntensidad } from '@rikuy/senales';
import type { EmocionAutorreporte } from '@rikuy/contracts';
import { AYUDAS, CELDAS, CUADRANTES } from './emociones.ts';
import './guardian.css';

export type AyudaElegida = (typeof AYUDAS)[number]['valor'];

export interface DatosCheckIn {
  emociones: { emocion: EmocionAutorreporte; intensidad: NivelIntensidad }[];
  ayuda?: AyudaElegida;
  texto?: string;
  visibilidad: 'solo_yo' | 'mi_docente';
}

export type SalidaCheckIn =
  | { tipo: 'respuesta'; datos: DatosCheckIn }
  | { tipo: 'no_se' }
  | { tipo: 'prefiero_no_decir' }
  | { tipo: 'omitido' };

export interface CheckInMomentoProps {
  /** Exact step the check-in is anchored to, e.g. "medir 10 oscilaciones". */
  pasoEtiqueta: string;
  requiereAviso: boolean;
  onAvisoVisto(): void;
  onResultado(r: SalidaCheckIn): void;
  onNecesitoHablar(): void;
  /** Answer window; when it closes the check-in counts as skipped. */
  ventanaMs?: number;
}

const INTENSIDADES: NivelIntensidad[] = ['poco', 'medio', 'mucho'];

function Forma({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** Presentational 10-15 s check-in. It keeps no record of previous answers (shared phones). */
export function CheckInMomento({ pasoEtiqueta, requiereAviso, onAvisoVisto, onResultado, onNecesitoHablar, ventanaMs = 90_000 }: CheckInMomentoProps) {
  const base = useId();
  const [seleccion, setSeleccion] = useState<{ emocion: EmocionAutorreporte; intensidad: NivelIntensidad }[]>([]);
  const [ayuda, setAyuda] = useState<AyudaElegida | undefined>();
  const [texto, setTexto] = useState('');
  const [visibilidad, setVisibilidad] = useState<'solo_yo' | 'mi_docente'>('solo_yo');
  const [terminado, setTerminado] = useState(false);
  const enviar = useRef(onResultado);
  useEffect(() => {
    enviar.current = onResultado;
  });

  useEffect(() => {
    if (terminado || requiereAviso) return;
    const t = setTimeout(() => {
      setTerminado(true);
      enviar.current({ tipo: 'omitido' });
    }, ventanaMs);
    return () => clearTimeout(t);
  }, [terminado, requiereAviso, ventanaMs]);

  const cerrar = (r: SalidaCheckIn) => {
    setSeleccion([]);
    setTexto('');
    setAyuda(undefined);
    setTerminado(true);
    onResultado(r);
  };

  if (requiereAviso) {
    return (
      <section className="rk-gd" aria-labelledby={`${base}-aviso`}>
        <h2 id={`${base}-aviso`}>Antes de empezar</h2>
        <p className="rk-gd-aviso">{TEXTO_CONFIDENCIALIDAD}</p>
        <div className="rk-gd-fila">
          <button type="button" className="rk-primario" onClick={onAvisoVisto}>Entendido</button>
          <button type="button" onClick={() => cerrar({ tipo: 'omitido' })}>Ahora no</button>
        </div>
      </section>
    );
  }

  if (terminado) {
    return (
      <section className="rk-gd" aria-live="polite">
        <h2>Gracias</h2>
        <p>Puedes seguir con tu actividad.</p>
        <button type="button" onClick={onNecesitoHablar}>Necesito hablar</button>
      </section>
    );
  }

  const alternar = (emocion: EmocionAutorreporte) =>
    setSeleccion((s) => (s.some((x) => x.emocion === emocion) ? s.filter((x) => x.emocion !== emocion) : [...s, { emocion, intensidad: 'medio' }]));
  const palabra = (e: EmocionAutorreporte) => CELDAS.find((c) => c.emocion === e)?.palabra ?? e;

  const enviarRespuesta = () => {
    const datos: DatosCheckIn = { emociones: seleccion, visibilidad };
    if (ayuda) datos.ayuda = ayuda;
    if (texto.trim()) datos.texto = texto.trim();
    cerrar({ tipo: 'respuesta', datos });
  };

  return (
    <section className="rk-gd" aria-labelledby={`${base}-t`}>
      <div>
        <span className="rk-gd-chip">en: {pasoEtiqueta}</span>
        <h2 id={`${base}-t`}>¿Cómo vas con esto?</h2>
      </div>

      <fieldset>
        <legend>Toca una o varias (energía y agrado)</legend>
        {CUADRANTES.map((q) => (
          <div key={q.id} role="group" aria-label={q.titulo}>
            <h3>{q.titulo}</h3>
            <div className="rk-gd-celdas">
              {CELDAS.filter((c) => c.cuadrante === q.id).map((c) => (
                <button key={c.emocion} type="button" aria-pressed={seleccion.some((x) => x.emocion === c.emocion)} onClick={() => alternar(c.emocion)}>
                  <Forma d={c.forma} />
                  {c.palabra}
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {seleccion.map((s) => (
        <div key={s.emocion} role="radiogroup" aria-label={`Intensidad de ${palabra(s.emocion)}`} className="rk-gd-fila">
          <span>{palabra(s.emocion)}:</span>
          {INTENSIDADES.map((n) => (
            <label key={n} className="rk-gd-radio">
              <input
                type="radio"
                name={`${base}-i-${s.emocion}`}
                checked={s.intensidad === n}
                onChange={() => setSeleccion((x) => x.map((y) => (y.emocion === s.emocion ? { ...y, intensidad: n } : y)))}
              />
              {n}
            </label>
          ))}
        </div>
      ))}

      <div className="rk-gd-fila">
        <button type="button" onClick={() => cerrar({ tipo: 'no_se' })}>No sé</button>
        <button type="button" onClick={() => cerrar({ tipo: 'prefiero_no_decir' })}>Prefiero no decir</button>
      </div>

      <div role="radiogroup" aria-label="¿Qué te ayudaría ahora?">
        <strong>¿Qué te ayudaría ahora?</strong>
        <div className="rk-gd-fila">
          {AYUDAS.map((a) => (
            <label key={a.valor} className="rk-gd-radio">
              <input type="radio" name={`${base}-ayuda`} checked={ayuda === a.valor} onChange={() => setAyuda(a.valor)} />
              {a.texto}
            </label>
          ))}
        </div>
      </div>

      <label>
        Si quieres, cuéntanos más (nadie lo analiza automáticamente)
        <textarea value={texto} maxLength={280} onChange={(e) => setTexto(e.target.value)} />
      </label>

      <div role="radiogroup" aria-label="¿Quién puede verlo?">
        <strong>¿Quién puede verlo?</strong>
        <div className="rk-gd-fila">
          <label className="rk-gd-radio">
            <input type="radio" name={`${base}-vis`} checked={visibilidad === 'solo_yo'} onChange={() => setVisibilidad('solo_yo')} />
            solo yo
          </label>
          <label className="rk-gd-radio">
            <input type="radio" name={`${base}-vis`} checked={visibilidad === 'mi_docente'} onChange={() => setVisibilidad('mi_docente')} />
            compartir con mi profe
          </label>
        </div>
      </div>

      <div className="rk-gd-fila">
        <button type="button" className="rk-primario" disabled={seleccion.length === 0} onClick={enviarRespuesta}>Enviar</button>
        <button type="button" onClick={() => cerrar({ tipo: 'omitido' })}>Ahora no</button>
        <button type="button" onClick={onNecesitoHablar}>Necesito hablar</button>
      </div>
    </section>
  );
}
