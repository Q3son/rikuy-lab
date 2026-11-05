/**
 * Containers of the Caja de dudas (F10): the student box (Yo) and the teacher heatmap (Reportes > Dudas).
 * The concepts are the ones of the CNEB concept graph (F9) that the pendulum exhibit talks about.
 */
import { conceptoPorId } from '@rikuy/curriculum-cneb';
import { mapaDeCalorDudas } from '@rikuy/reportes';
import { useMemo, useState } from 'react';
import { hlcAhora, nuevoIdGuardian, useBandejaGuardian } from '../guardian/bandeja.ts';
import { CajaDeDudas } from './CajaDeDudas.tsx';
import { CONCEPTOS_DUDAS, EXHIBICION_PENDULO, EXHIBICIONES } from './conceptos.ts';
import { MapaCalorDudas } from './MapaCalorDudas.tsx';

const etiqueta = (id: string) => CONCEPTOS_DUDAS.find((c) => c.id === id)?.etiqueta ?? conceptoPorId(id)?.label ?? id;

export function CajaDeDudasPagina({ identidad }: { identidad: { estudianteId: string; claseId: string } }) {
  const agregarDuda = useBandejaGuardian((s) => s.agregarDuda);
  const [enviada, setEnviada] = useState(false);
  if (enviada)
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <p role="status">Tu duda llegó a tu docente. No lleva tu nombre.</p>
        <button type="button" className="dc-btn" onClick={() => setEnviada(false)}>
          Tengo otra duda
        </button>
      </div>
    );
  return (
    <CajaDeDudas
      conceptos={CONCEPTOS_DUDAS}
      onEnviar={(d) => {
        agregarDuda({ id: nuevoIdGuardian(), claseId: identidad.claseId, grupoId: identidad.estudianteId, exhibicionId: EXHIBICION_PENDULO, conceptoId: d.conceptoId, ...(d.frase ? { frase: d.frase } : {}), hlc: hlcAhora() });
        setEnviada(true);
      }}
    />
  );
}

export function DudasDocentePagina() {
  const { dudas, esDemo } = useBandejaGuardian();
  const mapa = useMemo(() => mapaDeCalorDudas(dudas, { nombreConcepto: etiqueta }), [dudas]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2>Caja de dudas de la clase</h2>
      {esDemo ? <span className="rk-gd-chip">Datos de ejemplo</span> : null}
      <MapaCalorDudas mapa={mapa} nombreExhibicion={(id) => EXHIBICIONES[id] ?? id} />
    </div>
  );
}
