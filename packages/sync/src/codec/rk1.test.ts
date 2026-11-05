import { MARCO_QR_REGEX, MAX_CARACTERES_FRAGMENTO, type Evento, type Paquete } from '@rikuy/contracts';
import { dispositivos, ejemplos, ids } from '@rikuy/contracts/fixtures';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ingest } from '../ingesta.ts';
import { createMemoryRepository } from '../memoria.ts';
import { createEventWriter } from '../registro.ts';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from '../testing/index.ts';
import { base45Decode, base45Encode } from './base45.ts';
import { crc32 } from './crc32.ts';
import { decodeLink, encodeLink } from './enlace.ts';
import { fromPositional, toPositional } from './posicional.ts';
import { encodeFrames, parseFrame, Reassembler } from './rk1.ts';

const enc = new TextEncoder();
const keys = fakeClassKeys();

async function groupEvents(n: number, dispositivo: string = dispositivos.grupo1): Promise<Evento[]> {
  const repo = createMemoryRepository();
  const clock = manualClock();
  const w = createEventWriter({ claseId: ids.clase, dispositivo, repo, cripto: fakeCripto, claveMac: keys.claveMac, clock, random: seededRandom(dispositivo) });
  const out: Evento[] = [];
  for (let i = 0; i < n; i++) {
    clock.advance(1500 + i);
    out.push(
      i % 3 === 2
        ? await w.append('respuesta.registrada', { ...ejemplos.respuesta, id: (await w.append('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 })).id, texto: `Respuesta número ${i}: el periodo crece con la longitud` }, { grupoId: ids.grupo1, estudianteIds: [ids.estudiante1] })
        : await w.append('medicion.registrada', { ...ejemplos.medicion, id: `01JC00000000000000000M${String(i).padStart(4, '0')}`, valor: 1 + i / 100, repeticion: i + 1 }, { grupoId: ids.grupo1 }),
    );
  }
  return (await repo.all(ids.clase)).slice(0, n);
}

const eventsPackage = (eventos: Evento[], emisor: string = dispositivos.grupo1): Paquete => ({
  v: 1, tipo: 'eventos', claseId: ids.clase, emisor, creado: '1762300805000-0001-grupo001', cuerpo: { eventos },
});

/** Deterministic shuffle. */
function shuffle<T>(xs: T[], seed: number): T[] {
  const out = [...xs];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe('Base45 (RFC 9285)', () => {
  it('matches the RFC test vectors', () => {
    expect(base45Encode(enc.encode('AB'))).toBe('BB8');
    expect(base45Encode(enc.encode('Hello!!'))).toBe('%69 VD92EX0');
    expect(base45Encode(enc.encode('base-45'))).toBe('UJCLQE7W581');
    expect(new TextDecoder().decode(base45Decode('QED8WEX0'))).toBe('ietf!');
  });

  it('rejects invalid characters, lengths and out-of-range triplets', () => {
    expect(() => base45Decode('abc')).toThrow();
    expect(() => base45Decode('A')).toThrow();
    expect(() => base45Decode('GGW')).toThrow();
  });

  it('round-trips any bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 300 }), (b) => {
        expect(base45Decode(base45Encode(b))).toEqual(b);
      }),
    );
  });
});

describe('CRC32', () => {
  it('has the standard check value', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('positional JSON of a package', () => {
  it('round-trips every contract package fixture', () => {
    for (const p of ejemplos.paquetes as Paquete[]) expect(fromPositional(toPositional(p))).toEqual(p);
  });

  it('round-trips sealed events and is smaller than plain JSON', async () => {
    const p = eventsPackage(await groupEvents(10));
    const pos = toPositional(p);
    expect(fromPositional(JSON.parse(JSON.stringify(pos)))).toEqual(p);
    expect(JSON.stringify(pos).length).toBeLessThan(JSON.stringify(p).length * 0.85);
  });
});

describe('RK1 frames', () => {
  it('every frame matches the contract regex, fragments are <= 450 chars and T follows the package type', async () => {
    const { frames } = encodeFrames(eventsPackage(await groupEvents(30)));
    expect(frames.length).toBeGreaterThan(1);
    for (const f of frames) {
      expect(f).toMatch(MARCO_QR_REGEX);
      expect(f.split(':').slice(6).join(':').length).toBeLessThanOrEqual(MAX_CARACTERES_FRAGMENTO);
      expect(f.startsWith('RK1:E:')).toBe(true);
    }
    expect(encodeFrames(ejemplos.paquetes[3] as Paquete).frames[0]).toMatch(/^RK1:A:/);
    expect(encodeFrames(ejemplos.paquetes[2] as Paquete).frames[0]).toMatch(/^RK1:J:/);
  });

  it('parses frames and ignores anything else (keeps spaces: they are Base45 symbols)', () => {
    expect(parseFrame('hola')).toBeNull();
    expect(parseFrame('RK1:E:ABCD:3:2:1:XX')).toBeNull(); // i > n
    expect(parseFrame('RK1:E:ABCD:1:1:Z: A')).toEqual({ tipo: 'E', msg: 'ABCD', i: 1, n: 1, crc: 35, data: ' A' });
  });

  it('GATE: decodes 50 events from shuffled, duplicated and interleaved frames, and the seals still verify', async () => {
    const fifty = await groupEvents(50);
    const other = await groupEvents(12, dispositivos.grupo2);
    const a = encodeFrames(eventsPackage(fifty), { fragment: 120 });
    const b = encodeFrames(eventsPackage(other, dispositivos.grupo2), { fragment: 120 });
    expect(a.frames.length).toBeGreaterThan(5);
    const stream = shuffle([...a.frames, ...a.frames.slice(0, 4), ...b.frames, ...b.frames.slice(-2), 'https://example.org', 'RK1:basura'], 42);

    const r = new Reassembler();
    const complete: Paquete[] = [];
    let duplicates = 0;
    for (const s of stream) {
      const res = r.add(s);
      if (res.status === 'complete') complete.push(res.paquete);
      if (res.status === 'progress' && res.duplicate) duplicates++;
      expect(res.status).not.toBe('error');
    }
    expect(duplicates).toBeGreaterThan(0);
    expect(complete).toHaveLength(2);
    const got = complete.find((p) => p.emisor === dispositivos.grupo1)!;
    expect((got.cuerpo as { eventos: Evento[] }).eventos).toEqual(fifty);

    const teacher = createMemoryRepository();
    const report = await ingest(teacher, (got.cuerpo as { eventos: unknown[] }).eventos, { claseId: ids.clase, claveMac: keys.claveMac, clavePub: keys.clavePub }, fakeCripto);
    expect(report.accepted).toBe(50);
  });

  it('frames repeated after completion are reported as duplicates, not as a second package', async () => {
    const { frames } = encodeFrames(eventsPackage(await groupEvents(3)));
    const r = new Reassembler();
    frames.forEach((f) => r.add(f));
    expect(r.add(frames[0])).toMatchObject({ status: 'progress', duplicate: true });
  });

  it('a corrupted fragment is reported as a CRC error', async () => {
    const { frames } = encodeFrames(eventsPackage(await groupEvents(3)));
    const head = frames[0].split(':').slice(0, 6).join(':') + ':';
    const data = frames[0].slice(head.length);
    const bad = head + (data[0] === '0' ? '1' : '0') + data.slice(1);
    expect(bad).not.toBe(frames[0]);
    const r = new Reassembler();
    const results = [bad, ...frames.slice(1)].map((f) => r.add(f));
    expect(results.at(-1)?.status).toBe('error');
  });

  it('round-trips any package under any frame order, size and duplication (property)', async () => {
    const pool = await groupEvents(20);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 20, max: 450 }), fc.nat(), fc.array(fc.nat(), { maxLength: 10 }), (k, size, seed, dups) => {
        const p = eventsPackage(pool.slice(0, k));
        const { frames } = encodeFrames(p, { fragment: size });
        const stream = shuffle([...frames, ...dups.map((d) => frames[d % frames.length])], seed);
        const r = new Reassembler();
        const done = stream.map((f) => r.add(f)).filter((x) => x.status === 'complete');
        expect(done).toHaveLength(1);
        expect(done[0].status === 'complete' && done[0].paquete).toEqual(p);
      }),
      { numRuns: 300 },
    );
  });
});

describe('WhatsApp link (#/p/...)', () => {
  it('round-trips a package in the URL fragment and detects tampering', () => {
    const p = ejemplos.paquetes[4] as Paquete;
    const link = encodeLink(p, 'https://rikuy.example/');
    expect(link).toMatch(/^https:\/\/rikuy\.example\/#\/p\/[A-Za-z0-9_-]+\.[0-9a-z]+$/);
    expect(decodeLink(link)).toEqual(p);
    const hash = link.slice(link.indexOf('#'));
    expect(decodeLink(hash)).toEqual(p);
    expect(() => decodeLink(hash.replace(/\.[0-9a-z]+$/, '.0'))).toThrow(/CRC/);
    expect(decodeLink('#/otra')).toBeNull();
  });
});
