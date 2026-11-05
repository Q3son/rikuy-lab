/** Share a take-home package by WhatsApp: Web Share API first, `wa.me` link as the fallback (T-14, T-16). */
export interface DatosCompartir {
  texto: string;
  url: string;
  titulo: string;
}

export interface DepsCompartir {
  share?: (d: { title: string; text: string; url: string }) => Promise<void>;
  abrir: (url: string) => void;
}

export type ResultadoCompartir = 'compartido' | 'cancelado' | 'enlace_wame';

export function enlaceWame(texto: string, telefono?: string): string {
  const num = telefono ? telefono.replace(/\D/g, '') : '';
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

export async function compartirPorWhatsApp(d: DatosCompartir, deps: DepsCompartir): Promise<ResultadoCompartir> {
  if (deps.share) {
    try {
      await deps.share({ title: d.titulo, text: d.texto, url: d.url });
      return 'compartido';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelado';
    }
  }
  deps.abrir(enlaceWame(`${d.texto}\n${d.url}`));
  return 'enlace_wame';
}

/** Browser dependencies, resolved lazily so tests can inject their own. */
export function depsDelNavegador(): DepsCompartir {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    share: nav?.share ? (d) => nav.share(d) : undefined,
    abrir: (url) => void window.open(url, '_blank', 'noopener'),
  };
}
