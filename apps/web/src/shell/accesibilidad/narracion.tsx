import type { Lengua, } from '@rikuy/contracts';
import type { Narracion } from '@rikuy/ui';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAjustesA11y } from './ajustes.ts';
import { crearNarrador, type EstadoNarrador, type Fragmento, type Narrador, type Rango } from './narrador.ts';
import { buscarEnManifiesto, crearPuertoAudioNavegador, crearPuertoVozNavegador } from './puertos-navegador.ts';

const Contexto = createContext<{ narrador: Narrador; version: number } | null>(null);

/**
 * Provides the narrator. By default it is built over the browser (speechSynthesis, Audio and the
 * manifest registry) and follows the language and the settings live; tests inject their own.
 */
export function NarradorProvider({ narrador, children }: { narrador?: Narrador; children: ReactNode }) {
  const { i18n } = useTranslation();
  const [version, setVersion] = useState(0);

  const porDefecto = useMemo(
    () =>
      crearNarrador({
        lengua: () => i18n.language as Lengua,
        voz: crearPuertoVozNavegador(),
        audio: crearPuertoAudioNavegador(),
        manifiesto: buscarEnManifiesto,
        enLinea: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
        velocidad: () => useAjustesA11y.getState().velocidadVoz,
        soloLectorPantalla: () => useAjustesA11y.getState().soloLectorPantalla,
      }),
    [i18n],
  );
  const activo = narrador ?? porDefecto;

  // Chrome on Android loads the voices after the page: wait for `voiceschanged` and re-evaluate.
  useEffect(() => {
    const synth = globalThis.speechSynthesis;
    if (!synth?.addEventListener) return;
    const alCambiar = () => setVersion((v) => v + 1);
    synth.addEventListener('voiceschanged', alCambiar);
    return () => synth.removeEventListener('voiceschanged', alCambiar);
  }, []);

  // Language or settings changes can make the current narration wrong: stop it.
  useEffect(() => {
    const alCambiarIdioma = () => activo.detener();
    i18n.on('languageChanged', alCambiarIdioma);
    const baja = useAjustesA11y.subscribe((s, previo) => {
      if (s.soloLectorPantalla !== previo.soloLectorPantalla || s.velocidadVoz !== previo.velocidadVoz) {
        activo.detener();
        setVersion((v) => v + 1);
      }
    });
    return () => {
      i18n.off('languageChanged', alCambiarIdioma);
      baja();
    };
  }, [activo, i18n]);

  const valor = useMemo(() => ({ narrador: activo, version }), [activo, version]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNarrador(): Narrador {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useNarrador needs a NarradorProvider');
  return ctx.narrador;
}

export function useEstadoNarrador(): EstadoNarrador {
  const narrador = useNarrador();
  return useSyncExternalStore(narrador.suscribir, narrador.estado, narrador.estado);
}

export type NarracionConResaltado = Narracion & { resaltado: Rango | null };

/**
 * Props for the speak / stop button of a card or plaque. `texto` should be the main text the card
 * shows, so the highlighted range lines up with what is on screen.
 */
export function useNarracion(fragmento: Fragmento): NarracionConResaltado {
  const { t } = useTranslation();
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useNarracion needs a NarradorProvider');
  const { narrador } = ctx;
  const estado = useEstadoNarrador();
  const disponibilidad = narrador.disponibilidad(fragmento);
  const hablando = estado.hablando === fragmento.id;

  const motivo =
    disponibilidad === 'sin-grabacion'
      ? t('a11y.audio.sinGrabacion')
      : disponibilidad === 'sin-voz'
        ? t('a11y.audio.sinVoz')
        : disponibilidad === 'lector-externo'
          ? t('a11y.audio.lectorExterno')
          : undefined;

  return {
    hablando,
    onToggle: () => void narrador.alternar(fragmento),
    hablarLabel: t('a11y.escuchar'),
    detenerLabel: t('a11y.detener'),
    disabled: motivo !== undefined && !hablando,
    motivo,
    resaltado: hablando ? estado.resaltado : null,
  };
}
