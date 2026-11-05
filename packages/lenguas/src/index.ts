/**
 * @rikuy/lenguas: language registry, reviewed catalogs, audio manifest. Spanish-only TTS (4.8).
 * Docs: docs/ecosistema/ARQUITECTURA_ECOSISTEMA.md, 4.8 and 5.4 F9.
 */
export const packageName = '@rikuy/lenguas' as const;

export { CATALOGOS, validarCatalogo } from './catalogos.ts';
export { REGISTRO_LENGUAS, cadenaRespaldo, sintesisDeVozDisponible } from './registro.ts';
export type { Direccion, MetaLengua, RegistroLenguas } from './registro.ts';
export { crearResolutor, resolverTexto } from './resolver.ts';
export type { Catalogo, EntradaCatalogo, Resolutor, Rol, TextoResuelto } from './resolver.ts';
export { TASA_OPUS_KBPS, audioPara, coincideHash, validarManifiesto } from './manifiesto-audio.ts';
export type { EntradaAudio, ManifiestoAudio } from './manifiesto-audio.ts';
