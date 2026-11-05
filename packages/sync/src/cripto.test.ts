import { ids, dispositivos, hlcs } from '@rikuy/contracts/fixtures';
import type { Evento } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonico.ts';
import { b64urlDecode, b64urlEncode } from './codec/base64url.ts';
import { createWebCrypto, generateClassKeys } from './cripto-webcrypto.ts';
import { sealEvent, signPackage, verifyEventSeal, verifyPackage } from './firmas.ts';

const cripto = createWebCrypto();

const groupEvent: Evento = {
  id: ids.evento1,
  dispositivo: dispositivos.grupo1,
  seq: 1,
  hlc: hlcs.h2,
  claseId: ids.clase,
  sv: 1,
  tipo: 'pista.mostrada',
  autor: { grupoId: ids.grupo1 },
  datos: { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 },
};
const authorityEvent: Evento = {
  ...groupEvent,
  id: ids.evento2,
  dispositivo: dispositivos.docente,
  hlc: hlcs.h1,
  tipo: 'tutor.interruptor',
  autor: {},
  datos: { activo: false },
};

describe('canonical JSON', () => {
  it('sorts keys at every level and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: undefined }], c: 'x' } })).toBe('{"a":{"c":"x","d":[3,{"z":1}]},"b":1}');
  });
});

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    const b = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) & 0xff);
    expect(b64urlDecode(b64urlEncode(b))).toEqual(b);
    expect(b64urlEncode(b)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('event seals (class HMAC + teacher ECDSA)', () => {
  it('a group event gets an 8-byte MAC and verifies', async () => {
    const keys = await generateClassKeys();
    const sealed = await sealEvent(groupEvent, { cripto, claveMac: keys.claveMac });
    expect(b64urlDecode(sealed.mac!)).toHaveLength(8);
    expect(sealed.firma).toBeUndefined();
    expect(await verifyEventSeal(sealed, { cripto, claveMac: keys.claveMac, clavePub: keys.clavePub })).toEqual({ ok: true, value: undefined });
  });

  it('a tampered event fails the MAC', async () => {
    const keys = await generateClassKeys();
    const sealed = await sealEvent(groupEvent, { cripto, claveMac: keys.claveMac });
    const tampered = { ...sealed, datos: { ...(sealed.datos as object), nivel: 4 } };
    expect(await verifyEventSeal(tampered, { cripto, claveMac: keys.claveMac, clavePub: keys.clavePub })).toEqual({ ok: false, error: 'mac' });
  });

  it('a MAC from another class key is rejected', async () => {
    const a = await generateClassKeys();
    const b = await generateClassKeys();
    const sealed = await sealEvent(groupEvent, { cripto, claveMac: a.claveMac });
    expect((await verifyEventSeal(sealed, { cripto, claveMac: b.claveMac, clavePub: b.clavePub })).ok).toBe(false);
  });

  it('authority events need the teacher private key and verify with the class public key', async () => {
    const keys = await generateClassKeys();
    await expect(sealEvent(authorityEvent, { cripto, claveMac: keys.claveMac })).rejects.toThrow(/private key/);
    const sealed = await sealEvent(authorityEvent, { cripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada });
    expect(sealed.firma).toBeTruthy();
    expect((await verifyEventSeal(sealed, { cripto, claveMac: keys.claveMac, clavePub: keys.clavePub })).ok).toBe(true);
  });

  it('an unsigned authority event is rejected even with a valid MAC', async () => {
    const keys = await generateClassKeys();
    const sealed = await sealEvent({ ...groupEvent, tipo: 'tutor.interruptor', datos: { activo: false } }, { cripto, claveMac: keys.claveMac, allowUnsignedForTests: true });
    expect(await verifyEventSeal(sealed, { cripto, claveMac: keys.claveMac, clavePub: keys.clavePub })).toEqual({ ok: false, error: 'firma' });
  });

  it('an authority event signed by someone else (a group holding the MAC key) is rejected', async () => {
    const keys = await generateClassKeys();
    const impostor = await generateClassKeys();
    const sealed = await sealEvent(authorityEvent, { cripto, claveMac: keys.claveMac, clavePrivada: impostor.clavePrivada });
    expect(await verifyEventSeal(sealed, { cripto, claveMac: keys.claveMac, clavePub: keys.clavePub })).toEqual({ ok: false, error: 'firma' });
  });
});

describe('package signatures', () => {
  it('teacher packages (union) are ECDSA-signed and verified; tampering is detected', async () => {
    const keys = await generateClassKeys();
    const p = { v: 1 as const, tipo: 'union' as const, emisor: dispositivos.docente, creado: hlcs.h1, cuerpo: { x: 1 } };
    const signed = await signPackage(p, { cripto, clavePrivada: keys.clavePrivada });
    expect(await verifyPackage(signed, { cripto, clavePub: keys.clavePub })).toBe(true);
    expect(await verifyPackage({ ...signed, cuerpo: { x: 2 } }, { cripto, clavePub: keys.clavePub })).toBe(false);
    expect(await verifyPackage(p, { cripto, clavePub: keys.clavePub })).toBe(false);
  });
});
