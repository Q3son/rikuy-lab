import { useClassEventCount, useClassState } from '@rikuy/store-dexie/react';
import { Reassembler } from '@rikuy/sync';
import { useCallback, useRef, useState } from 'react';
import { getRelevo } from './almacen.ts';
import { LectorQr } from './LectorQr.tsx';
import { QrCarrusel } from './QrCarrusel.tsx';
import type { Relevo as RelevoService } from './relevo.ts';

type Rol = 'docente' | 'grupo';

/** QR relay page (6.3): the teacher creates the class and reads the groups; a group joins and shows its events. */
export function Relevo({ servicio }: { servicio?: RelevoService }) {
  const relevo = servicio ?? getRelevo();
  const [rol, setRol] = useState<Rol>('docente');
  const [claseId, setClaseId] = useState<string>();
  const [frames, setFrames] = useState<{ titulo: string; frames: string[] } | null>(null);
  const [aviso, setAviso] = useState<string>();
  const [progreso, setProgreso] = useState<string>();
  const reassembler = useRef(new Reassembler());
  const estado = useClassState(relevo.store.db, claseId);
  const eventos = useClassEventCount(relevo.store.db, claseId);

  const run = useCallback(async (f: () => Promise<void>) => {
    try {
      await f();
    } catch (e) {
      setAviso(`Error: ${(e as Error).message}`);
    }
  }, []);

  const onText = useCallback(
    (text: string) => {
      const r = reassembler.current.add(text);
      if (r.status === 'progress' && !r.duplicate) setProgreso(`Leídos ${r.have} de ${r.n} cuadros`);
      if (r.status === 'error') setAviso(`Error: ${r.reason}`);
      if (r.status !== 'complete') return;
      setProgreso(`Leídos ${r.n} de ${r.n} cuadros`);
      void run(async () => {
        const res = await relevo.receive(r.paquete);
        if (res.kind === 'joined') {
          setClaseId(res.claseId);
          setAviso(`Unido a la clase ${res.codigo}`);
        } else if (res.kind === 'events') {
          setAviso(`Eventos recibidos: ${res.accepted} nuevos, ${res.duplicates} repetidos, ${res.rejected} rechazados`);
          if (r.paquete.claseId) setFrames({ titulo: 'QR de confirmación', frames: await relevo.ackFrames(r.paquete.claseId) });
        } else if (res.kind === 'ack') {
          setAviso('La docente confirmó la entrega');
          setFrames(null);
        }
      });
    },
    [relevo, run],
  );

  const mediciones = estado ? Object.keys(estado.mediciones).length : 0;
  const grupos = estado ? Object.keys(estado.grupos).length : 0;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Relevo por QR</h1>
      <div role="tablist" className="flex gap-2">
        {(['docente', 'grupo'] as const).map((r) => (
          <button key={r} role="tab" aria-selected={rol === r} type="button" className={`rounded px-3 py-1 ${rol === r ? 'bg-neutral-100 text-neutral-900' : 'border border-neutral-600'}`} onClick={() => setRol(r)}>
            {r === 'docente' ? 'Docente' : 'Grupo'}
          </button>
        ))}
      </div>

      {rol === 'docente' ? (
        <section className="flex flex-col gap-3">
          {!claseId && (
            <button type="button" className="rounded bg-emerald-700 px-3 py-2" onClick={() => void run(async () => {
              const c = await relevo.createClass();
              setClaseId(c.id);
              setFrames({ titulo: 'QR de unión', frames: await relevo.joinFrames(c.id) });
            })}>
              Crear clase
            </button>
          )}
          {estado?.clase && <p>Clase <strong data-testid="codigo-clase">{estado.clase.codigo}</strong></p>}
          {claseId && <LectorQr label="Leer QR de un grupo" onText={onText} />}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          {!claseId && <LectorQr label="Leer QR de unión" onText={onText} />}
          {claseId && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded border border-neutral-600 px-3 py-2" onClick={() => void run(() => relevo.recordDemoMeasurements(claseId, 50))}>
                Registrar 50 mediciones de prueba
              </button>
              <button type="button" className="rounded bg-emerald-700 px-3 py-2" onClick={() => void run(async () => setFrames({ titulo: 'QR de eventos', frames: await relevo.eventFrames(claseId) }))}>
                Mostrar QR de eventos
              </button>
            </div>
          )}
          {claseId && <LectorQr label="Leer QR de confirmación" onText={onText} />}
        </section>
      )}

      {frames && <QrCarrusel frames={frames.frames} label={frames.titulo} />}

      <dl className="grid grid-cols-2 gap-1 text-sm" aria-label="Estado de la clase">
        <dt>Eventos</dt>
        <dd data-testid="total-eventos">{eventos ?? 0}</dd>
        <dt>Grupos</dt>
        <dd data-testid="total-grupos">{grupos}</dd>
        <dt>Mediciones</dt>
        <dd data-testid="total-mediciones">{mediciones}</dd>
      </dl>
      {progreso && <p aria-live="polite">{progreso}</p>}
      {aviso && <p role="status">{aviso}</p>}
    </main>
  );
}
