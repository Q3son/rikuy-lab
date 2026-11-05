/**
 * PROYECTOR phone, under the pyramid (or the 45° box). Absolute black, the hologram in a cross of
 * four views, no text near the center (DESIGN 7.5). Before a control joins it shows the room code
 * and a QR; afterwards only short amber labels at the edge confirm each order received.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { actionLabel, messageToActions, ViewerChannel, VisorExhibicion, type ModoVisor } from '@rikuy/holo';
import { QrSvg } from './componentes.tsx';
import { ACK_PREFIX, controlUrl, newRoomCode, normalizeRoomCode } from './sala/room.ts';
import { RoomChannel } from './sala/RoomChannel.ts';

export interface PaginaProyectorProps {
  crearCanal?: (sala: string, rol: 'display') => RoomChannel;
}

const defaultCanal = (sala: string) => new RoomChannel(sala, 'display');
const ACK_THROTTLE_MS = 200;

export function PaginaProyector({ crearCanal = defaultCanal }: PaginaProyectorProps) {
  const params = useParams();
  const navigate = useNavigate();
  const sala = normalizeRoomCode(params.sala ?? '');
  const canalVisor = useMemo(() => new ViewerChannel(), []);
  const [modo, setModo] = useState<Extract<ModoVisor, 'piramide' | 'cajita'>>('piramide');
  const [espejo, setEspejo] = useState(false);
  const [unido, setUnido] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const lastAck = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!sala) navigate(`/holo/proyector/${newRoomCode()}`, { replace: true });
  }, [sala, navigate]);

  useEffect(() => {
    if (!sala) return;
    const canal = crearCanal(sala, 'display');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = canal.on((m) => {
      if (m.type === 'hello' && m.role === 'control') {
        setUnido(true);
        canal.hello(); // let a late control know the projector is here
        return;
      }
      if (m.type === 'peers' && m.roles.includes('control')) setUnido(true);
      for (const a of messageToActions(m, 'display')) {
        setUnido(true);
        canalVisor.send(a);
        const label = actionLabel(a);
        const now = performance.now();
        if (now - (lastAck.current[label] ?? -Infinity) >= ACK_THROTTLE_MS || (a.type !== 'rotate' && a.type !== 'zoom')) {
          lastAck.current[label] = now;
          canal.send({ type: 'say', speaker: 'agente', text: ACK_PREFIX + label });
        }
        setEtiqueta(label);
        clearTimeout(timer);
        timer = setTimeout(() => setEtiqueta(null), 1200);
      }
    });
    canal.hello();
    return () => {
      clearTimeout(timer);
      off();
      canal.close();
    };
  }, [sala, crearCanal, canalVisor]);

  useEffect(() => {
    // Keep the screen on while projecting.
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
    let lock: { release(): Promise<void> } | undefined;
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  if (!sala) return null;
  const enlace = controlUrl(sala, location.href);

  return (
    <main data-theme="holo" className="fixed inset-0 overflow-hidden bg-black text-[#5FE3FF]">
      <VisorExhibicion escena="pendulo" modo={modo} espejo={espejo} sinMarco canal={canalVisor} etiqueta="Holograma del péndulo para la pirámide" />

      {etiqueta && (
        <p aria-live="polite" className="absolute left-3 top-3 rounded-lg border-2 border-[#FFC14D] px-3 py-1 text-lg font-bold text-[#FFC14D]">
          {etiqueta}
        </p>
      )}

      {!unido && (
        <section aria-label="Unir el celular de control" className="absolute inset-x-4 bottom-4 mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-[#5FE3FF] bg-black p-4 text-center">
          <p className="text-lg font-bold">Abre el control en otro celular</p>
          <p className="text-sm text-[#BFE9F5]">Código de sala</p>
          <p className="text-5xl font-extrabold tracking-[0.3em] text-[#FFC14D]">{sala.toUpperCase()}</p>
          <QrSvg texto={enlace} etiqueta={`QR para unirse a la sala ${sala.toUpperCase()}`} tam={176} />
          <button type="button" onClick={() => setUnido(true)} className="h-12 w-full rounded-xl border-2 border-[#5FE3FF] font-semibold">
            Ocultar y proyectar
          </button>
        </section>
      )}

      <button type="button" aria-label="Ajustes del proyector" onClick={() => setAjustes((v) => !v)} className="absolute bottom-2 right-2 grid h-12 w-12 place-items-center rounded-full border-2 border-[#2A7587] text-xl">
        ⚙
      </button>
      {ajustes && (
        <section aria-label="Ajustes del proyector" className="absolute bottom-16 right-2 flex w-64 flex-col gap-2 rounded-2xl border-2 border-[#5FE3FF] bg-black p-3">
          <p className="font-bold">Tipo de proyector</p>
          <div className="grid grid-cols-2 gap-2">
            {(['piramide', 'cajita'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)} className={`h-12 rounded-xl border-2 ${modo === m ? 'border-[#FFC14D] text-[#FFC14D]' : 'border-[#2A7587]'}`}>
                {m === 'piramide' ? 'Pirámide' : 'Cajita'}
              </button>
            ))}
          </div>
          <button type="button" aria-pressed={espejo} onClick={() => setEspejo((v) => !v)} className="h-12 rounded-xl border-2 border-[#2A7587]">
            ⇋ Espejo {espejo ? '(activo)' : ''}
          </button>
          <button type="button" onClick={() => setUnido(false)} className="h-12 rounded-xl border-2 border-[#2A7587]">
            Mostrar código y QR
          </button>
        </section>
      )}
    </main>
  );
}
