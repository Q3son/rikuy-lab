import { useId, useState } from 'react';
import { TEXTO_CONFIDENCIALIDAD, type DestinoAyuda } from '@rikuy/senales';
import './guardian.css';

export interface SolicitudHablar {
  destino: DestinoAyuda;
  /** Declared by the student: someone is hurting them or they are in danger (SíseVe path). */
  urgente: boolean;
}

export interface NecesitoHablarProps {
  onPedir(s: SolicitudHablar): void;
  onCancelar(): void;
}

/** E-20d: reachable at any time, no grid, no justification. The student chooses with whom. */
export function NecesitoHablar({ onPedir, onCancelar }: NecesitoHablarProps) {
  const base = useId();
  const [destino, setDestino] = useState<DestinoAyuda>('docente');
  const [urgente, setUrgente] = useState(false);
  return (
    <section className="rk-gd" aria-labelledby={`${base}-t`}>
      <h2 id={`${base}-t`}>Necesito hablar</h2>
      <div role="radiogroup" aria-label="¿Con quién quieres hablar?">
        <strong>¿Con quién quieres hablar?</strong>
        <div className="rk-gd-fila">
          <label className="rk-gd-radio">
            <input type="radio" name={`${base}-d`} checked={destino === 'docente'} onChange={() => setDestino('docente')} />
            mi docente
          </label>
          <label className="rk-gd-radio">
            <input type="radio" name={`${base}-d`} checked={destino === 'otro_adulto'} onChange={() => setDestino('otro_adulto')} />
            otro adulto del colegio
          </label>
        </div>
      </div>
      <label className="rk-gd-radio">
        <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
        Alguien me hace daño o estoy en peligro
      </label>
      <p className="rk-gd-aviso">{TEXTO_CONFIDENCIALIDAD}</p>
      <div className="rk-gd-fila">
        <button type="button" className="rk-primario" onClick={() => onPedir({ destino, urgente })}>Avisar</button>
        <button type="button" onClick={onCancelar}>Ahora no</button>
      </div>
    </section>
  );
}
