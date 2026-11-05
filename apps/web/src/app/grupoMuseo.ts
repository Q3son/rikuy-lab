/**
 * Hands the F1 join session to the museum (F5): the group of this device is the one that joined with
 * the class code, with pseudonymous ids derived by `identidadDeGrupo`. Without a join, the demo group.
 */
import { COLORES_GRUPO, fijarGrupoLocal, type GrupoLocal } from '../features/mundo/grupo.ts';
import { es } from '../platform/i18n/catalogos/es.ts';
import { useSesion } from '../shell/sesion.ts';
import { idDeterministico, identidadDeGrupo } from './identidad.ts';

export function grupoDeSesion(codigo: string | null, apodo: string | null): GrupoLocal | null {
  if (!codigo || !apodo) return null;
  const { estudianteId, claseId } = identidadDeGrupo(codigo, apodo);
  const nombre = (es.cadenas as Record<string, string>)[`apodos.${apodo}`] ?? apodo;
  const color = COLORES_GRUPO[[...apodo].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORES_GRUPO.length]!;
  return { id: estudianteId, claseId, dispositivo: idDeterministico(`dispositivo:${codigo}:${apodo}`).slice(-10), apodo: nombre, color, integrantes: 3 };
}

const aplicar = (s: { codigoClase: string | null; apodo: string | null }) => fijarGrupoLocal(grupoDeSesion(s.codigoClase, s.apodo));
aplicar(useSesion.getState());
useSesion.subscribe(aplicar);
