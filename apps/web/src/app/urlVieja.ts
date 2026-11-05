/**
 * Old multi-page URLs redirect to the hash router (ARQUITECTURA 1.2). `display.html?sala=X`
 * becomes `#/holo?modo=display&sala=X`. Works in any subfolder (GitHub Pages, local hub).
 * The legacy pages stay served until F3 ports the hologram; this mapping is what the server
 * fallback and the SPA boot use once they go away.
 */
const DESTINOS: Record<string, { ruta: string; modo?: string }> = {
  'display.html': { ruta: '/holo', modo: 'display' },
  'control.html': { ruta: '/holo', modo: 'control' },
  'clasico.html': { ruta: '/holo', modo: 'clasico' },
  'panel.html': { ruta: '/docente' },
};

export function mapearUrlVieja(url: URL): string | null {
  const archivo = url.pathname.split('/').pop() ?? '';
  const destino = DESTINOS[archivo];
  if (!destino) return null;
  const consulta = new URLSearchParams();
  if (destino.modo) consulta.set('modo', destino.modo);
  url.searchParams.forEach((valor, clave) => consulta.append(clave, valor));
  const texto = consulta.toString();
  return `#${destino.ruta}${texto ? `?${texto}` : ''}`;
}

/** At boot: if the SPA was opened through an old URL, replace it with the new hash route. */
export function redirigirSiUrlVieja(ventana: Pick<Window, 'location' | 'history'> = window): boolean {
  const hash = mapearUrlVieja(new URL(ventana.location.href));
  if (!hash) return false;
  const base = ventana.location.pathname.replace(/[^/]*$/, '');
  ventana.history.replaceState(null, '', `${base}${hash}`);
  return true;
}
