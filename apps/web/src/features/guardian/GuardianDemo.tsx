import { useMemo, useState } from 'react';
import {
  construirAutorreporte,
  construirPedidoDeAyuda,
  crearControlCheckIn,
  itemsDelPulso,
  type PedidoDeAyuda,
} from '@rikuy/senales';
import type { AutorreporteMomento } from '@rikuy/contracts';
import { hlcAhora, nuevoIdGuardian } from './bandeja.ts';
import { CheckInMomento, type SalidaCheckIn } from './CheckInMomento.tsx';
import { IndicadorGuardian } from './IndicadorGuardian.tsx';
import { NecesitoHablar, type SolicitudHablar } from './NecesitoHablar.tsx';
import { PulsoDelCurso } from './PulsoDelCurso.tsx';

/** Mock identifiers over the contracts until the class session (F6) and the lab (F3) provide real ones. */
const MOCK = {
  estudianteId: '01JC0000000000000000000E01',
  claseId: '01JC0000000000000000000C01',
  sesion: 'sesion-demo',
  semana: 45,
};

type Vista = 'checkin' | 'hablar' | 'pulso' | 'fin';

export interface GuardianDemoProps {
  onAutorreporte?(a: AutorreporteMomento): void;
  onPedido?(p: PedidoDeAyuda): void;
  /** Pseudonymous ids of the group and class of this device; without them the demo ids are used. */
  identidad?: { estudianteId: string; claseId: string };
}

const nuevoId = nuevoIdGuardian;

/** Container: wires the pure Guardián logic (@rikuy/senales) to the presentational components. */
export function GuardianDemo({ onAutorreporte, onPedido, identidad }: GuardianDemoProps) {
  const ids = identidad ?? MOCK;
  const control = useMemo(() => crearControlCheckIn({ ventanaMs: 90_000 }), []);
  const [vista, setVista] = useState<Vista>('checkin');
  const [aviso, setAviso] = useState(() => control.requiereAviso(ids.estudianteId));
  const [activo, setActivo] = useState(true);

  const resultado = (r: SalidaCheckIn) => {
    control.registrarResultado(MOCK.sesion, 'medir', { tipo: r.tipo });
    if (r.tipo === 'respuesta') {
      onAutorreporte?.(
        construirAutorreporte({ id: nuevoId(), estudianteId: ids.estudianteId, claseId: ids.claseId, pasoId: 'medir', hlc: hlcAhora(), ...r.datos }),
      );
    }
    setVista('pulso');
  };
  const pedir = (s: SolicitudHablar) => {
    onPedido?.(construirPedidoDeAyuda({ id: nuevoId(), estudianteId: ids.estudianteId, claseId: ids.claseId, hlc: hlcAhora(), ...s }));
    setVista('fin');
  };

  if (!activo) return <p>Rikuy Guardián está apagado. Todo funciona igual.</p>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <IndicadorGuardian activo={activo} onApagar={() => setActivo(false)} />
      {identidad ? null : <span className="rk-gd-chip">Prototipo · datos de ejemplo</span>}
      {vista === 'checkin' && (
        <CheckInMomento
          pasoEtiqueta="medir 10 oscilaciones"
          requiereAviso={aviso}
          onAvisoVisto={() => {
            control.confirmarAviso(ids.estudianteId);
            setAviso(false);
          }}
          onResultado={resultado}
          onNecesitoHablar={() => setVista('hablar')}
        />
      )}
      {vista === 'hablar' && <NecesitoHablar onPedir={pedir} onCancelar={() => setVista('checkin')} />}
      {vista === 'pulso' && <PulsoDelCurso items={itemsDelPulso(MOCK.semana, ids.estudianteId)} onEnviar={() => setVista('fin')} />}
      {vista === 'fin' && <p>Listo. Gracias.</p>}
    </div>
  );
}
