/**
 * Concept graph of the science and technology curriculum (3.10 memory, 3.12 Cerebro).
 * Ported from packages/core/src/curriculum.ts (CONCEPTS and EDGES) with the same ids.
 * Pure data and functions: no DOM, no storage, no network.
 */

export const SISTEMAS = ['digestivo', 'respiratorio', 'hepatico', 'quimica', 'fisica'] as const;
export type Sistema = (typeof SISTEMAS)[number];

export const NIVELES_CONCEPTO = ['sistema', 'organo', 'tejido', 'celula', 'molecula', 'fenomeno'] as const;
export type NivelConcepto = (typeof NIVELES_CONCEPTO)[number];

export const RELACIONES = ['contiene', 'produce', 'actua_sobre', 'depende_de', 'se_relaciona'] as const;
export type Relacion = (typeof RELACIONES)[number];

export interface ConceptoNodo {
  id: string;
  label: string;
  system: Sistema;
  level: NivelConcepto;
  /** Words or phrases that identify the concept in what a student writes. */
  synonyms: readonly string[];
  /** 3D scene that shows this concept, when one exists. */
  sceneId?: string;
}

export interface ConceptoArista {
  desde: string;
  hasta: string;
  relacion: Relacion;
}

export interface GrafoConceptos {
  nodos: readonly ConceptoNodo[];
  aristas: readonly ConceptoArista[];
}

export const CONCEPTOS: readonly ConceptoNodo[] = [
  // Digestivo, from the system down to the molecule
  { id: 'sistema_digestivo', label: 'Sistema digestivo', system: 'digestivo', level: 'sistema', synonyms: ['sistema digestivo', 'digestion', 'digestivo', 'digerir', 'digiere'], sceneId: 'digestivo' },
  { id: 'intestino_delgado', label: 'Intestino delgado', system: 'digestivo', level: 'organo', synonyms: ['intestino', 'intestino delgado', 'tripa'], sceneId: 'intestino' },
  { id: 'vellosidad', label: 'Vellosidad intestinal', system: 'digestivo', level: 'tejido', synonyms: ['vellosidad', 'vellosidades', 'velloso'], sceneId: 'vellosidad' },
  { id: 'enterocito', label: 'Enterocito', system: 'digestivo', level: 'celula', synonyms: ['enterocito', 'celula intestinal', 'borde en cepillo', 'microvellosidad'], sceneId: 'enterocito' },
  { id: 'lactasa', label: 'Lactasa', system: 'digestivo', level: 'molecula', synonyms: ['lactasa', 'enzima', 'enzimas'], sceneId: 'lactasa' },
  { id: 'lactosa', label: 'Lactosa', system: 'quimica', level: 'molecula', synonyms: ['lactosa', 'azucar de la leche', 'leche'], sceneId: 'lactasa' },
  { id: 'glucosa', label: 'Glucosa', system: 'quimica', level: 'molecula', synonyms: ['glucosa'] },
  { id: 'galactosa', label: 'Galactosa', system: 'quimica', level: 'molecula', synonyms: ['galactosa'] },
  { id: 'enlace_glucosidico', label: 'Enlace glucosídico', system: 'quimica', level: 'molecula', synonyms: ['enlace', 'enlace glucosidico', 'beta 1 4', 'union'] },
  { id: 'temperatura', label: 'Temperatura', system: 'fisica', level: 'fenomeno', synonyms: ['temperatura', 'calor', 'caliento', 'calentar', 'hervir', 'frio', 'grados'] },
  { id: 'ph', label: 'pH', system: 'quimica', level: 'fenomeno', synonyms: ['ph', 'acido', 'acidez', 'basico', 'alcalino'] },
  { id: 'desnaturalizacion', label: 'Desnaturalización', system: 'quimica', level: 'fenomeno', synonyms: ['desnaturaliza', 'desnaturalizacion', 'se rompe la enzima', 'se deforma'] },
  { id: 'intolerancia_lactosa', label: 'Intolerancia a la lactosa', system: 'digestivo', level: 'fenomeno', synonyms: ['intolerancia', 'intolerante', 'me cae mal la leche', 'leche deslactosada', 'sin lactosa'] },
  // Respiratorio
  { id: 'sistema_respiratorio', label: 'Sistema respiratorio', system: 'respiratorio', level: 'sistema', synonyms: ['respiratorio', 'respirar', 'respiracion', 'respiramos'], sceneId: 'respiratorio' },
  { id: 'pulmon', label: 'Pulmón', system: 'respiratorio', level: 'organo', synonyms: ['pulmon', 'pulmones'], sceneId: 'respiratorio' },
  { id: 'diafragma', label: 'Diafragma', system: 'respiratorio', level: 'organo', synonyms: ['diafragma'] },
  { id: 'altitud', label: 'Altitud', system: 'fisica', level: 'fenomeno', synonyms: ['altura', 'altitud', 'puna', 'soroche', 'msnm'] },
  // Hepático
  { id: 'higado', label: 'Hígado', system: 'hepatico', level: 'organo', synonyms: ['higado'], sceneId: 'higado' },
  { id: 'lobulillo_hepatico', label: 'Lobulillo hepático', system: 'hepatico', level: 'tejido', synonyms: ['lobulillo', 'lobulo', 'triada portal', 'vena central'], sceneId: 'lobulillo' },
  { id: 'hepatocito', label: 'Hepatocito', system: 'hepatico', level: 'celula', synonyms: ['hepatocito', 'celula del higado'] },
  // Física
  { id: 'pendulo', label: 'Péndulo simple', system: 'fisica', level: 'fenomeno', synonyms: ['pendulo', 'columpio', 'oscila', 'oscilacion'], sceneId: 'pendulo' },
  { id: 'periodo', label: 'Periodo de oscilación', system: 'fisica', level: 'fenomeno', synonyms: ['periodo', 'cuanto tarda', 'tiempo de ida y vuelta'] },
  { id: 'longitud', label: 'Longitud de la cuerda', system: 'fisica', level: 'fenomeno', synonyms: ['longitud', 'cuerda', 'largo', 'mas larga', 'mas corta'] },
  { id: 'gravedad', label: 'Gravedad', system: 'fisica', level: 'fenomeno', synonyms: ['gravedad', 'peso', 'cae'] },
];

export const ARISTAS: readonly ConceptoArista[] = [
  { desde: 'sistema_digestivo', hasta: 'intestino_delgado', relacion: 'contiene' },
  { desde: 'intestino_delgado', hasta: 'vellosidad', relacion: 'contiene' },
  { desde: 'vellosidad', hasta: 'enterocito', relacion: 'contiene' },
  { desde: 'enterocito', hasta: 'lactasa', relacion: 'produce' },
  { desde: 'lactasa', hasta: 'lactosa', relacion: 'actua_sobre' },
  { desde: 'lactosa', hasta: 'enlace_glucosidico', relacion: 'contiene' },
  { desde: 'lactosa', hasta: 'glucosa', relacion: 'produce' },
  { desde: 'lactosa', hasta: 'galactosa', relacion: 'produce' },
  { desde: 'lactasa', hasta: 'temperatura', relacion: 'depende_de' },
  { desde: 'lactasa', hasta: 'ph', relacion: 'depende_de' },
  { desde: 'temperatura', hasta: 'desnaturalizacion', relacion: 'produce' },
  { desde: 'lactasa', hasta: 'intolerancia_lactosa', relacion: 'se_relaciona' },
  { desde: 'sistema_respiratorio', hasta: 'pulmon', relacion: 'contiene' },
  { desde: 'sistema_respiratorio', hasta: 'diafragma', relacion: 'contiene' },
  { desde: 'diafragma', hasta: 'sistema_digestivo', relacion: 'se_relaciona' },
  { desde: 'altitud', hasta: 'sistema_respiratorio', relacion: 'actua_sobre' },
  { desde: 'higado', hasta: 'lobulillo_hepatico', relacion: 'contiene' },
  { desde: 'lobulillo_hepatico', hasta: 'hepatocito', relacion: 'contiene' },
  { desde: 'higado', hasta: 'sistema_digestivo', relacion: 'se_relaciona' },
  { desde: 'hepatocito', hasta: 'glucosa', relacion: 'actua_sobre' },
  { desde: 'pendulo', hasta: 'periodo', relacion: 'produce' },
  { desde: 'periodo', hasta: 'longitud', relacion: 'depende_de' },
  { desde: 'periodo', hasta: 'gravedad', relacion: 'depende_de' },
];

/** Structural checks; an empty list means the graph is well formed. */
export function validarGrafo(grafo: GrafoConceptos): string[] {
  const errores: string[] = [];
  const ids = new Set<string>();
  for (const nodo of grafo.nodos) {
    if (ids.has(nodo.id)) errores.push(`id duplicado: ${nodo.id}`);
    ids.add(nodo.id);
  }
  for (const arista of grafo.aristas) {
    if (!ids.has(arista.desde)) errores.push(`arista desde un concepto inexistente: ${arista.desde}`);
    if (!ids.has(arista.hasta)) errores.push(`arista hacia un concepto inexistente: ${arista.hasta}`);
    if (!(RELACIONES as readonly string[]).includes(arista.relacion)) errores.push(`relación desconocida: ${arista.relacion}`);
    if (arista.desde === arista.hasta) errores.push(`arista de un concepto consigo mismo: ${arista.desde}`);
  }
  return errores;
}

const porId = new Map(CONCEPTOS.map((n) => [n.id, n] as const));

export function conceptoPorId(id: string): ConceptoNodo | undefined {
  return porId.get(id);
}

/** Concepts linked to `id` by one edge in either direction (no transitive walk). */
export function vecinos(id: string, grafo: GrafoConceptos = { nodos: CONCEPTOS, aristas: ARISTAS }): ConceptoNodo[] {
  const ids = new Set<string>();
  for (const arista of grafo.aristas) {
    if (arista.desde === id) ids.add(arista.hasta);
    if (arista.hasta === id) ids.add(arista.desde);
  }
  return [...ids].map((x) => conceptoPorId(x)).filter((n): n is ConceptoNodo => n !== undefined);
}

/** Lowercase, no accents, single spaces: the form used to compare synonyms. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Concepts whose synonyms appear in `texto` as whole words (accent and case insensitive). */
export function conceptosMencionados(texto: string): ConceptoNodo[] {
  const normal = ` ${normalizarTexto(texto).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return CONCEPTOS.filter((nodo) => nodo.synonyms.some((s) => normal.includes(` ${normalizarTexto(s)} `)));
}
