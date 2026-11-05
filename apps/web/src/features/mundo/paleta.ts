/** Resolves the Luz de Puna tokens (`--rk-*`) into the Canvas palette; falls back to the Luz values. */
import { type ColorSala, type Escena, SALAS_CONTENIDO, estiloSala } from '@rikuy/campus';
import type { Paleta } from '@rikuy/campus/canvas';

export const LUZ: Record<string, string> = {
  bg: '#F5F6F1',
  surface: '#FFFFFF',
  ink: '#0D2B33',
  'ink-2': '#33494F',
  sol: '#F5B301',
  foton: '#19CBEE',
  primary: '#075E6C',
  'primary-tint': '#DCEBEC',
  'hall-fisica': '#075E6C',
  'hall-fisica-tint': '#DCEBEC',
  'hall-bio': '#435F0F',
  'hall-bio-tint': '#E9F1D3',
  'hall-quim': '#9E3206',
  'hall-quim-tint': '#FBE4D8',
  'hall-tierra': '#6E4A2F',
  'hall-tierra-tint': '#F1E6D8',
  'ink-2-tint': '#E9ECE4',
  'sol-tint': '#FFF1CC',
  'ink-tint': '#E9ECE4',
};

export function token(nombre: string): string {
  const raiz = typeof document !== 'undefined' ? document.documentElement : null;
  const v = raiz ? getComputedStyle(raiz).getPropertyValue(`--rk-${nombre}`).trim() : '';
  return v || LUZ[nombre] || '#075E6C';
}

const tinte = (c: ColorSala) => (c.startsWith('hall-') ? `${c}-tint` : c === 'primary' ? 'primary-tint' : `${c}-tint`);

export function colorDeSala(salaId: string): string {
  const sala = SALAS_CONTENIDO.find((s) => s.id === salaId);
  return token(sala ? estiloSala(sala).color : 'primary');
}

export function paletaDe(escena: Escena): Paleta {
  const sala = SALAS_CONTENIDO.find((s) => s.id === escena.id);
  const color: ColorSala = sala ? estiloSala(sala).color : 'primary';
  const salas: Record<string, string> = {};
  for (const s of SALAS_CONTENIDO) salas[s.id] = token(estiloSala(s).color);
  return {
    bg: token('bg'),
    surface: token('surface'),
    ink: token('ink'),
    ink2: token('ink-2'),
    sol: token('sol'),
    foton: token('foton'),
    primary: token('primary'),
    hall: token(color),
    hallTint: token(tinte(color)),
    salas,
  };
}
