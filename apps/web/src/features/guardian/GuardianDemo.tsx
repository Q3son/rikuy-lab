import { useMemo, useState } from 'react';
import {
  construirAutorreporte,
  construirPedidoDeAyuda,
  crearControlCheckIn,
  itemsDelPulso,
  type PedidoDeAyuda,
} from '@rikuy/senales';
import type { AutorreporteMomento } from '@rikuy/contracts';
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
}

let contador = 0;
const nuevoId = () => `01JC${'0'.repeat(18)}D${String(++contador).padStart(3, '0')}`.slice(0, 26).padEnd(26, '0');
const hlcAhora = () => `${String(Date.now()).padStart(13, '0')}-0000-demo0001`;

/** Container: wires the pure Guardián logic (@rikuy/senales) to the presentational components. */
export function GuardianDemo({ onAutorreporte, onPedido }: GuardianDemoProps) {
  const control = useMemo(() => crearControlCheckIn({ ventanaMs: 90_000 }), []);
  const [vista, setVista] = useState<Vista>('checkin');
  const [aviso, setAviso] = useState(() => control.requiereAviso(MOCK.estudianteId));
  const [activo, setActivo] = useState(true);

  const resultado = (r: SalidaCheckIn) => {
    control.registrarResultado(MOCK.sesion, 'medir', { tipo: r.tipo });
    if (r.tipo === 'respuesta') {
      onAutorreporte?.(
        construirAutorreporte({ id: nuevoId(), estudianteId: MOCK.estudianteId, claseId: MOCK.claseId, pasoId: 'medir', hlc: hlcAhora(), ...r.datos }),
      );
    }
    setVista('pulso');
  };
  const pedir = (s: SolicitudHablar) => {
    onPedido?.(construirPedidoDeAyuda({ id: nuevoId(), estudianteId: MOCK.estudianteId, claseId: MOCK.claseId, hlc: hlcAhora(), ...s }));
    setVista('fin');
  };

  if (!activo) return <p>Rikuy Guardián está apagado. Todo funciona igual.</p>;
  return (
    <main style={{ display: 'grid', gap: 12, padding: 16 }}>
      <IndicadorGuardian activo={activo} onApagar={() => setActivo(false)} />
      <span className="rk-gd-chip">Prototipo · datos de ejemplo</span>
      {vista === 'checkin' && (
        <CheckInMomento
          pasoEtiqueta="medir 10 oscilaciones"
          requiereAviso={aviso}
          onAvisoVisto={() => {
            control.confirmarAviso(MOCK.estudianteId);
            setAviso(false);
          }}
          onResultado={resultado}
          onNecesitoHablar={() => setVista('hablar')}
        />
      )}
      {vista === 'hablar' && <NecesitoHablar onPedir={pedir} onCancelar={() => setVista('checkin')} />}
      {vista === 'pulso' && <PulsoDelCurso items={itemsDelPulso(MOCK.semana, MOCK.estudianteId)} onEnviar={() => setVista('fin')} />}
      {vista === 'fin' && <p>Listo. Gracias.</p>}
    </main>
  );
}
