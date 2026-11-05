/**
 * Is this page served by the Rikuy hub (F8)? The hub answers `GET api/hub` with its name, URLs, the
 * presence nonce and the WebSocket path. Anything else (static hosting, `vite preview`, offline) means
 * "no hub": features stay on their local transports (BroadcastChannel, QR).
 */
export interface InfoHub {
  nombre: 'Rikuy hub';
  urls: string[];
  nonce: string;
  ws: string;
  ia?: string;
}

type Buscar = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export async function consultarHub(href = globalThis.location?.href ?? 'http://localhost/', buscar: Buscar = (u, i) => fetch(u, i), esperaMs = 2500): Promise<InfoHub | null> {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctrl?.abort(), esperaMs);
  try {
    const r = await buscar(new URL('api/hub', href.split('#')[0]).href, ctrl ? { signal: ctrl.signal } : undefined);
    if (!r.ok) return null;
    const info = (await r.json()) as Partial<InfoHub> | null;
    return info?.nombre === 'Rikuy hub' && typeof info.ws === 'string' ? (info as InfoHub) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let cache: Promise<InfoHub | null> | null = null;

/** Asked once per page load. */
export function hubDeEstaPagina(): Promise<InfoHub | null> {
  cache ??= consultarHub();
  return cache;
}
