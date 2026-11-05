/**
 * The group on this device. The app sets it from the F1 class join (`fijarGrupoLocal`); before a join
 * (tests, the bare museum route) it is the demo group. One avatar per device represents the whole group.
 */
export interface GrupoLocal {
  id: string;
  /** Class of the join (absent for the demo group). */
  claseId?: string;
  dispositivo: string;
  apodo: string;
  color: string;
  integrantes: number;
}

export const GRUPO_DEMO: GrupoLocal = {
  id: '01JC0000000000000000000G01',
  dispositivo: 'GRUPO00001',
  apodo: 'Vizcacha',
  color: '#075E6C',
  integrantes: 3,
};

/** Group colours for peers: closed list, never ranking-related. */
export const COLORES_GRUPO = ['#9E3206', '#435F0F', '#6E4A2F', '#33494F', '#04474F', '#8A2C05', '#3A5209', '#5A3A20'];

let actual: GrupoLocal = GRUPO_DEMO;

/** The group of this device (F1 join session), or the demo group before a join. */
export function grupoActual(): GrupoLocal {
  return actual;
}

export function fijarGrupoLocal(g: GrupoLocal | null): void {
  actual = g ?? GRUPO_DEMO;
}
