import { MemoriaLocal } from '@rikuy/memoria';
import { useMemo } from 'react';
import { PRACTICA_DEMO, RECUERDO_DEMO, visorSimulado } from './demo.ts';
import { TutorPanel } from './TutorPanel.tsx';

/** Stand-alone page for the tutor (the real one lives as a layer over exhibits, E-08). */
export function TutorPagina() {
  const memoria = useMemo(() => {
    const m = new MemoriaLocal();
    m.cargar([RECUERDO_DEMO]);
    return m;
  }, []);
  const visor = useMemo(() => visorSimulado(), []);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Tutor Rikuy</h1>
      <p className="text-neutral-400">{PRACTICA_DEMO.preguntaGuia}</p>
      <TutorPanel practica={PRACTICA_DEMO} visor={visor} grupoId="demo" eventosInterruptor={[]} memoria={memoria} estudianteId={RECUERDO_DEMO.estudianteId} />
    </main>
  );
}
