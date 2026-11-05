/**
 * @rikuy/sync: append-only event log, projections, version vectors, seals, sync protocol,
 * RK1 QR codec and transports (docs/ecosistema/ARQUITECTURA_ECOSISTEMA.md, 3.1-3.8).
 */
export const packageName = '@rikuy/sync' as const;

export * from './puertos.ts';
export * from './vector.ts';
export * from './canonico.ts';
export * from './firmas.ts';
export * from './cripto-webcrypto.ts';
export * from './ingesta.ts';
export * from './memoria.ts';
export * from './registro.ts';
export * from './proyeccion.ts';
export * from './protocolo.ts';
export * from './transportes/memoria.ts';
export { b64urlDecode, b64urlEncode } from './codec/base64url.ts';
export { hlcNode } from './codec/hash.ts';
