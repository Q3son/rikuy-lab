import { describe, expect, it } from 'vitest';
import { MARCO_QR_REGEX } from '@rikuy/contracts';
import { base45Decode, base45Encode, codificarRk1, crc32, ReensambladorRk1 } from './rk1.ts';

describe('base45 (RFC 9285)', () => {
  it('matches the RFC vectors', () => {
    const enc = (s: string) => base45Encode(new TextEncoder().encode(s));
    expect(enc('AB')).toBe('BB8');
    expect(enc('Hello!!')).toBe('%69 VD92EX0');
    expect(enc('base-45')).toBe('UJCLQE7W581');
    expect(new TextDecoder().decode(base45Decode('QED8WEX0'))).toBe('ietf!');
  });
  it('rejects characters outside the alphabet', () => {
    expect(() => base45Decode('abc')).toThrow();
  });
});

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });
});

describe('RK1 frames', () => {
  const grande = { eventos: Array.from({ length: 80 }, (_, i) => ({ id: `e${i}`, texto: `texto largo número ${i} ${'x'.repeat(40 + (i % 7))}` })) };

  it('every frame matches the contract regex and stays within 450 fragment characters', () => {
    const marcos = codificarRk1('E', grande);
    expect(marcos.length).toBeGreaterThan(1);
    for (const m of marcos) {
      expect(m).toMatch(MARCO_QR_REGEX);
      expect(m.split(':').slice(6).join(':').length).toBeLessThanOrEqual(450);
    }
  });

  it('round-trips in any order, ignoring duplicates', () => {
    const marcos = codificarRk1('E', grande);
    const r = new ReensambladorRk1();
    const barajados = [...marcos, marcos[0], ...marcos].reverse();
    const resultados = barajados.map((m) => r.agregar(m));
    const completo = resultados.find((x) => x.estado === 'completo');
    expect(completo).toMatchObject({ estado: 'completo', tipo: 'E' });
    expect(completo?.estado === 'completo' && completo.valor).toEqual(grande);
  });

  it('reports progress and the missing frames while incomplete', () => {
    const marcos = codificarRk1('E', grande);
    const r = new ReensambladorRk1();
    const p = r.agregar(marcos[0]);
    expect(p).toMatchObject({ estado: 'parcial', recibidos: 1, total: marcos.length, faltan: marcos.length - 1 });
  });

  it('keeps interleaved messages apart', () => {
    const a = codificarRk1('E', grande);
    const b = codificarRk1('P', { v: 1, otro: 'z'.repeat(2000) });
    const r = new ReensambladorRk1();
    const res = [] as unknown[];
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if (a[i]) res.push(r.agregar(a[i]));
      if (b[i]) res.push(r.agregar(b[i]));
    }
    const completos = res.filter((x) => (x as { estado: string }).estado === 'completo');
    expect(completos.map((x) => (x as { tipo: string }).tipo).sort()).toEqual(['E', 'P']);
  });

  it('rejects garbage, drops a corrupted message and recovers when the frames are shown again', () => {
    const marcos = codificarRk1('E', grande);
    const r = new ReensambladorRk1();
    expect(r.agregar('hola')).toEqual({ estado: 'invalido' });
    const roto = marcos[1].slice(0, -3) + (marcos[1].endsWith('AAA') ? 'BBB' : 'AAA');
    let fin = r.agregar(marcos[0]);
    fin = r.agregar(roto);
    for (const m of marcos.slice(2)) fin = r.agregar(m);
    expect(fin).toEqual({ estado: 'invalido' });
    for (const m of marcos) fin = r.agregar(m);
    expect(fin.estado).toBe('completo');
  });

  it('a small payload fits in one frame', () => {
    expect(codificarRk1('J', { codigo: 'PEND42' })).toHaveLength(1);
  });
});
