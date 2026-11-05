/**
 * The group on this device. E-00 (F1) will provide it from the class join; until then a demo group.
 * One avatar per device represents the whole group (members are dots on the token).
 */
export interface GrupoLocal {
  id: string;
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
