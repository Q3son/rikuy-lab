/**
 * Global live regions, used with restraint (FUNCIONES_EXTRA 4.2).
 * - Two regions, always mounted: polite (saves, sync, knots) and assertive (camera stopped, data not
 *   saved). A region that appears together with its text is often not announced.
 * - Messages with the same `clave` closer than one second apart are dropped, so nothing can chatter
 *   (never announce each tick of the stopwatch). Assertive messages are never dropped.
 * - The same sentence twice in a row is still announced: an invisible character alternates.
 */
import { LiveRegion } from '@rikuy/ui';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type Urgencia = 'polite' | 'assertive';
export type Anunciar = (mensaje: string, urgencia?: Urgencia, opciones?: { clave?: string }) => void;

export const INTERVALO_MIN_MS = 1000;
const ALTERNADOR = '​';

const Contexto = createContext<Anunciar>(() => {});

export function AnunciosProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const ultimos = useRef(new Map<string, number>());
  const alterna = useRef({ polite: false, assertive: false });

  const anunciar = useCallback<Anunciar>((mensaje, urgencia = 'polite', opciones = {}) => {
    const ahora = Date.now();
    if (urgencia === 'polite' && opciones.clave) {
      const antes = ultimos.current.get(opciones.clave);
      if (antes !== undefined && ahora - antes < INTERVALO_MIN_MS) return;
      ultimos.current.set(opciones.clave, ahora);
    }
    alterna.current[urgencia] = !alterna.current[urgencia];
    const texto = alterna.current[urgencia] ? mensaje : mensaje + ALTERNADOR;
    if (urgencia === 'assertive') setAssertive(texto);
    else setPolite(texto);
  }, []);

  const valor = useMemo(() => anunciar, [anunciar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <LiveRegion mensaje={polite} />
      <LiveRegion mensaje={assertive} urgencia="assertive" />
    </Contexto.Provider>
  );
}

export function useAnunciar(): Anunciar {
  return useContext(Contexto);
}
