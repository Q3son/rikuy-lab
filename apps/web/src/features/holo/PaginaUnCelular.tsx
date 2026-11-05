/** Single-phone mode (secondary): the hologram on screen, driven by this phone's hand gestures or touch. */
import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ViewerChannel, VisorExhibicion } from '@rikuy/holo';
import { practicaDeEscena } from '../mundo/catalogo.ts';
import { BotonesTactiles, CamaraActiva, EstadoCamara, GuiaGestos } from './componentes.tsx';
import { useGestosMano } from './useGestosMano.ts';

export function PaginaUnCelular() {
  const escena = useParams().escena ?? 'pendulo';
  // An exhibit of the museum comes back to the museum; the hologram hub is the default way back.
  const desdeMuseo = (useLocation().state as { volverA?: string } | null)?.volverA === '/museo';
  const canal = useMemo(() => new ViewerChannel(), []);
  const gestos = useGestosMano((a) => canal.send(a));
  const encendida = gestos.status === 'active' || gestos.status === 'slow' || gestos.status === 'loading';
  return (
    <main className="mx-auto flex max-w-md flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <Link to={desdeMuseo ? '/museo' : '/holo'} className="grid h-12 place-items-center underline">
          {desdeMuseo ? '‹ Volver al museo' : '‹ Volver'}
        </Link>
        {encendida && <CamaraActiva onApagar={gestos.stop} />}
      </header>
      <VisorExhibicion escena={escena} modo="pantalla" canal={canal} practica={practicaDeEscena(escena)} />
      {!encendida && gestos.status !== 'blocked' && (
        <button type="button" onClick={() => void gestos.start()} className="h-14 rounded-xl bg-[#075E6C] text-lg font-bold text-white">
          ✋ Activar cámara de manos
        </button>
      )}
      <EstadoCamara status={gestos.status} pose={gestos.pose} />
      {gestos.status === 'active' && <GuiaGestos />}
      <BotonesTactiles enviar={(a) => canal.send(a)} escena={escena} />
    </main>
  );
}
