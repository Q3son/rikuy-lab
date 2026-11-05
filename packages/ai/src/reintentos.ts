/** Retry helper shared by the HTTP adapters (4.5): 429 and 5xx, 2 retries, waiting 1 s then 2 s (pattern from Willay). */

export class ErrorHttp extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ErrorHttp';
    this.status = status;
  }
}

export interface OpcionesReintento {
  reintentos?: number;
  esperaBaseMs?: number;
  dormir?: (ms: number) => Promise<void>;
  esTransitorio?: (e: unknown) => boolean;
}

const ESTADOS_TRANSITORIOS = new Set([429, 500, 502, 503, 504]);

/** Rate limits, server errors, and a response id created a moment ago that is not visible yet (Meta). */
export function esTransitorioPorDefecto(e: unknown): boolean {
  if (!(e instanceof ErrorHttp)) return false;
  if (ESTADOS_TRANSITORIOS.has(e.status)) return true;
  return e.status === 400 && /referenced response not found/i.test(e.message);
}

const dormirReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function conReintentos<T>(fn: () => Promise<T>, opciones: OpcionesReintento = {}): Promise<T> {
  const { reintentos = 2, esperaBaseMs = 1000, dormir = dormirReal, esTransitorio = esTransitorioPorDefecto } = opciones;
  let intento = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (intento >= reintentos || !esTransitorio(e)) throw e;
      intento++;
      await dormir(esperaBaseMs * intento); // 1 s, then 2 s
    }
  }
}
