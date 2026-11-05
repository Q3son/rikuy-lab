/**
 * Rikuy, the Socratic tutor, as a side panel of the desktop museum. Same rules agent and memory as the
 * tutor page (@rikuy/tutor, local-first, no paid AI): only the frame changes.
 */
import { MemoriaLocal } from '@rikuy/memoria';
import { useMemo } from 'react';
import { PRACTICA_DEMO, RECUERDO_DEMO, visorSimulado } from '../tutor/demo.ts';
import { TutorPanel } from '../tutor/TutorPanel.tsx';
import { grupoActual } from '../mundo/grupo.ts';
import { Rikuy } from '../mundo/Iconos.tsx';
import { useVozEnVivo } from './vozEnVivo.ts';

export function PanelRikuy() {
  const memoria = useMemo(() => {
    const m = new MemoriaLocal();
    m.cargar([RECUERDO_DEMO]);
    return m;
  }, []);
  const visor = useMemo(() => visorSimulado(), []);
  const voz = useVozEnVivo();
  return (
    <div className="ek-tutor">
      <div className="ek-tutor__guia">
        <Rikuy expresion="piensa" tam={40} />
        <p>
          <span className="ek-muted">Pregunta guía</span>
          {PRACTICA_DEMO.preguntaGuia}
        </p>
      </div>
      <TutorPanel practica={PRACTICA_DEMO} visor={visor} grupoId={grupoActual().id} eventosInterruptor={[]} memoria={memoria} estudianteId={RECUERDO_DEMO.estudianteId} />
      <button type="button" className="ek-voz" disabled={!voz.disponible} title={voz.motivo}>
        Voz en vivo entre grupos · no disponible
      </button>
    </div>
  );
}
