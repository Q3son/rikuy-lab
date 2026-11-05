/**
 * Museum content owned by F5 (`content/museo/`): Tiled templates per hall type and the hall catalog.
 * Exhibits are NOT here: they come from the approved practices catalog (F9) at runtime.
 */
import { Sala } from '@rikuy/contracts';
import auditorio from '../../../content/museo/plantillas/auditorio.json';
import patio from '../../../content/museo/plantillas/patio.json';
import salaTematica from '../../../content/museo/plantillas/sala-tematica.json';
import vestibulo from '../../../content/museo/plantillas/vestibulo.json';
import salas from '../../../content/museo/salas.json';
import { type MapaMundo, cargarMapaTiled } from './tiled.ts';

export type NombrePlantilla = 'vestibulo' | 'sala-tematica' | 'patio' | 'auditorio';

export const PLANTILLAS: Record<NombrePlantilla, MapaMundo> = {
  vestibulo: cargarMapaTiled(vestibulo),
  'sala-tematica': cargarMapaTiled(salaTematica),
  patio: cargarMapaTiled(patio),
  auditorio: cargarMapaTiled(auditorio),
};

export const SALAS_CONTENIDO: Sala[] = Sala.array().parse(salas);
