/**
 * Navigation of the shell: which tabs each role sees and which tab owns a route.
 * Paths that exist in the shared route table of contracts are taken from it; the others (hoy,
 * evidencia, reportes, lab home, quipu, yo) are proposed in PROPUESTAS_CONTRATOS.md.
 */
import { RUTAS } from '@rikuy/contracts/rutas';

export type Rol = 'docente' | 'grupo';
export type TabEstudiante = 'museo' | 'lab' | 'cerebro' | 'quipu' | 'yo';
export type TabDocente = 'hoy' | 'clase' | 'evidencia' | 'reportes' | 'ajustes';

export interface TabDef<T extends string> {
  id: T;
  ruta: string;
  /** i18n key of the label. */
  clave: `tabs.${T}`;
}

export const TABS_ESTUDIANTE: TabDef<TabEstudiante>[] = [
  { id: 'museo', ruta: RUTAS.museo, clave: 'tabs.museo' },
  { id: 'lab', ruta: '/lab', clave: 'tabs.lab' },
  { id: 'cerebro', ruta: RUTAS.cerebro, clave: 'tabs.cerebro' },
  { id: 'quipu', ruta: '/quipu', clave: 'tabs.quipu' },
  { id: 'yo', ruta: '/yo', clave: 'tabs.yo' },
];

export const TABS_DOCENTE: TabDef<TabDocente>[] = [
  { id: 'hoy', ruta: '/hoy', clave: 'tabs.hoy' },
  { id: 'clase', ruta: RUTAS.clase, clave: 'tabs.clase' },
  { id: 'evidencia', ruta: '/evidencia', clave: 'tabs.evidencia' },
  { id: 'reportes', ruta: '/reportes', clave: 'tabs.reportes' },
  { id: 'ajustes', ruta: RUTAS.ajustes, clave: 'tabs.ajustes' },
];

/** First match wins, so longer prefixes come first. Routes owned by other fronts map to a tab. */
const PREFIJOS: Record<Rol, [string, string][]> = {
  grupo: [
    ['/museo', 'museo'],
    ['/retos', 'museo'],
    ['/lab', 'lab'],
    ['/exhibicion', 'lab'],
    ['/cerebro', 'cerebro'],
    ['/quipu', 'quipu'],
    ['/yo', 'yo'],
    ['/relevo', 'yo'],
  ],
  docente: [
    ['/hoy', 'hoy'],
    ['/clase', 'clase'],
    ['/creador', 'clase'],
    ['/docente/evidencias', 'evidencia'],
    ['/docente/evidencia', 'evidencia'],
    ['/evidencia', 'evidencia'],
    ['/relevo', 'evidencia'],
    ['/docente', 'hoy'],
    ['/reportes', 'reportes'],
    ['/ajustes', 'ajustes'],
  ],
};

const coincide = (ruta: string, prefijo: string) => ruta === prefijo || ruta.startsWith(`${prefijo}/`);

export function tabActivo(ruta: string, rol: Rol): string | null {
  return PREFIJOS[rol].find(([prefijo]) => coincide(ruta, prefijo))?.[1] ?? null;
}

/** Old multi-page URLs: they only redirect, so they never need a role. */
const RUTAS_VIEJAS = ['/display.html', '/control.html', '/panel.html', '/clasico.html'];

/** Entry screens, the family page (no install, no role) and the display phone have no chrome. */
export function rutaSinMarco(ruta: string): boolean {
  return ruta === '/' || ruta === '/entrar' || coincide(ruta, '/p') || coincide(ruta, '/holo') || RUTAS_VIEJAS.includes(ruta);
}

export const INICIO_POR_ROL: Record<Rol, string> = { docente: '/hoy', grupo: '/museo' };
