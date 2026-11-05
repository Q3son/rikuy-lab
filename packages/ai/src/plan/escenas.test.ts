import { SCENE_IDS } from '@rikuy/core';
import { describe, expect, it } from 'vitest';
import type { ItemExtraido } from './esquemas.ts';
import { curriculoCneb, mapearItem } from './mapeo.ts';
import { escenaParaItem } from './escenas.ts';

const cur = curriculoCneb();
const mapeado = (tipo: ItemExtraido['tipo'], texto: string) => {
  const i: ItemExtraido = { tipo, texto, confianza: 0.9, fuente: { pagina: 1, fragmento: texto } };
  return { ...i, correspondencia: mapearItem(i, cur, { nivel: 'secundaria', grado: 2 }) };
};

describe('escenaParaItem', () => {
  it('links topics by keyword to the matching hologram scene', () => {
    expect(escenaParaItem(mapeado('contenido', 'El péndulo simple: periodo y longitud'), SCENE_IDS)).toBe('pendulo');
    expect(escenaParaItem(mapeado('contenido', 'Digestión de la leche: enzimas y lactosa'), SCENE_IDS)).toBe('lactasa');
    expect(escenaParaItem(mapeado('contenido', 'Sistema digestivo humano'), SCENE_IDS)).toBe('digestivo');
    expect(escenaParaItem(mapeado('contenido', 'Respiración celular y frecuencia respiratoria'), SCENE_IDS)).toBe('respiratorio');
  });

  it('falls back to the CNEB id of the match', () => {
    expect(escenaParaItem(mapeado('desempeno', 'Describe el movimiento cualitativa y cuantitativamente relacionando la distancia, el tiempo y la velocidad.'), SCENE_IDS)).toBe('pendulo');
  });

  it('only returns scenes that exist, and nothing for unrelated items', () => {
    expect(escenaParaItem(mapeado('contenido', 'Sistema digestivo humano'), ['pendulo'])).toBeUndefined();
    expect(escenaParaItem(mapeado('evidencia', 'Afiche para la campaña del río'), SCENE_IDS)).toBeUndefined();
  });
});
