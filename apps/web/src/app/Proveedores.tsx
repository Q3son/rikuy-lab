import type { i18n as I18n } from 'i18next';
import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { cambiarLengua } from '../platform/i18n/i18n.ts';
import { aplicarAjustes, useAjustesA11y } from '../shell/accesibilidad/ajustes.ts';
import { AnunciosProvider } from '../shell/accesibilidad/anuncios.tsx';
import { NarradorProvider } from '../shell/accesibilidad/narracion.tsx';
import { aplicarTema, useRed, useUi } from '../shell/estado.ts';

/** Writes theme, language and accessibility settings onto the document, and follows connectivity. */
function AplicadorDeAjustes({ i18n }: { i18n: I18n }) {
  const tema = useUi((s) => s.tema);
  const lengua = useUi((s) => s.lengua);
  const a11y = useAjustesA11y();

  useEffect(() => aplicarTema(document.documentElement, tema), [tema]);
  useEffect(() => {
    if (i18n.language !== lengua) void cambiarLengua(i18n, lengua);
  }, [i18n, lengua]);
  useEffect(() => aplicarAjustes(document.documentElement, a11y), [a11y.escalaTexto, a11y.movimiento, a11y.contraste, a11y.modoAudio, a11y.barrido]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const alCambiar = () => useRed.getState().reportar({ enLinea: navigator.onLine });
    window.addEventListener('online', alCambiar);
    window.addEventListener('offline', alCambiar);
    alCambiar();
    return () => {
      window.removeEventListener('online', alCambiar);
      window.removeEventListener('offline', alCambiar);
    };
  }, []);
  return null;
}

export function Proveedores({ i18n, children }: { i18n: I18n; children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <AnunciosProvider>
        <NarradorProvider>
          <AplicadorDeAjustes i18n={i18n} />
          {children}
        </NarradorProvider>
      </AnunciosProvider>
    </I18nextProvider>
  );
}
