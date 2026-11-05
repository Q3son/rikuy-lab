/**
 * Feature flags (ARQUITECTURA 5.3 item 4). All start off. `iaNube` stays off in class; `senales`
 * and `gestos` stay off until consent exists. They can be switched on in development through
 * localStorage["rikuy.flags"], never from a URL.
 */
export interface Flags {
  senales: boolean;
  gestos: boolean;
  webrtc: boolean;
  iaLocal: boolean;
  iaNube: boolean;
  /** Guardián level 2 (FUNCIONES_EXTRA): off until the school signs the consent and the protocol. */
  guardianNivel2: boolean;
}

export const FLAGS_POR_DEFECTO: Flags = { senales: false, gestos: false, webrtc: false, iaLocal: false, iaNube: false, guardianNivel2: false };

export function leerFlags(json: string | null): Flags {
  if (!json) return { ...FLAGS_POR_DEFECTO };
  try {
    const crudo = JSON.parse(json) as Record<string, unknown>;
    const flags = { ...FLAGS_POR_DEFECTO };
    for (const clave of Object.keys(flags) as (keyof Flags)[]) if (crudo[clave] === true) flags[clave] = true;
    return flags;
  } catch {
    return { ...FLAGS_POR_DEFECTO };
  }
}

export function flagsActuales(): Flags {
  try {
    return leerFlags(globalThis.localStorage?.getItem('rikuy.flags') ?? null);
  } catch {
    return { ...FLAGS_POR_DEFECTO };
  }
}
