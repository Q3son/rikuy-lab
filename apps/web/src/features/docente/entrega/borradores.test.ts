import { construirEscenario } from '@rikuy/evidencia';
import { describe, expect, it } from 'vitest';
import { serviciosSimulados } from '../simulacion/receptor.ts';
import { crearAlmacenClase } from '../estado/clase.ts';
import { crearBorradores, type Contactos } from './borradores.ts';
import { memoriaVolatil } from '../pruebas.tsx';

const T = Date.UTC(2026, 10, 6, 22, 0);

function estado() {
  const a = crearAlmacenClase({ ...serviciosSimulados, ahora: () => T }, memoriaVolatil());
  a.getState().cargarDemo();
  for (const g of ['Condor', 'Vizcacha', 'Puma', 'Kantu']) a.getState().recibirGrupoDeEjemplo(g);
  return a.getState();
}

const contactos: Contactos = {
  tutor: { correo: 'rosa@example.pe', telefono: '+51900000001' },
  director: { correo: 'direccion@example.pe' },
  ugel: { correo: 'ugel@example.pe' },
  familias: [
    { id: 'f1', alias: 'E01', telefono: '+51900000011', lengua: 'es', alta: true },
    { id: 'f2', alias: 'E02', telefono: '+51900000012', lengua: 'quy', alta: true },
    { id: 'f3', alias: 'E03', telefono: '+51900000013', lengua: 'es', alta: false },
  ],
};

describe('weekly drafts', () => {
  const s = estado();
  const bs = crearBorradores({ eventos: s.eventos, practica: s.practica!, contexto: s.contexto, contactos, ahora: T, enlaceLigero: 'https://rikuy.app/#/p/abc.1z', institucion: 'IE 40123' });

  it('drafts a digest per tutor channel and one group message per family that opted in', () => {
    const por = (pl: string) => bs.filter((b) => b.mensaje.plantilla === pl);
    expect(por('tutora_semanal').map((b) => b.destino.canal).sort()).toEqual(['correo', 'whatsapp']);
    expect(por('familia_semanal_a')).toHaveLength(2); // f3 has not opted in
    expect(por('familia_semanal_b')).toHaveLength(0); // individual messages are never automatic
    expect(por('director_mensual')).toHaveLength(1);
  });

  it('family broadcast drafts name no child', () => {
    const fam = bs.filter((b) => b.mensaje.plantilla === 'familia_semanal_a');
    for (const b of fam) expect(b.mensaje.cuerpo.texto).toContain('su hijo o hija');
    expect(fam.map((b) => b.destino.direccion)).toEqual(['+51900000011', '+51900000012']);
  });

  it('is deterministic and idempotent: the same week gives the same idempotency keys', () => {
    const otra = crearBorradores({ eventos: s.eventos, practica: s.practica!, contexto: s.contexto, contactos, ahora: T, enlaceLigero: 'https://rikuy.app/#/p/abc.1z', institucion: 'IE 40123' });
    expect(otra.map((b) => b.mensaje.claveIdempotencia)).toEqual(bs.map((b) => b.mensaje.claveIdempotencia));
  });

  it('never leaks a student name, a quote or a nickname into any draft', () => {
    const todo = JSON.stringify(bs);
    expect(todo).not.toMatch(/Condor|Vizcacha|Puma|Kantu|pesa más|E0[1-9]/);
  });

  it('weekly drafts expire on Wednesday so a late message is not sent as this week\'s', () => {
    const vig = Date.parse(bs[0].mensaje.vigenteHasta);
    expect(new Date(vig).getUTCDay()).toBe(3);
    expect(vig).toBeGreaterThan(T);
  });

  it('skips channels without a contact', () => {
    const solo = crearBorradores({ eventos: s.eventos, practica: s.practica!, contexto: null, contactos: { familias: [] }, ahora: T, enlaceLigero: 'https://rikuy.app/#/p/abc.1z', institucion: 'IE' });
    expect(solo).toHaveLength(0);
  });

  it('uses the class context sentence when there is one', () => {
    const fam = bs.find((b) => b.mensaje.plantilla === 'familia_semanal_a');
    expect(fam?.mensaje.cuerpo.texto).toContain('Falta poco para Yaku Raymi.');
  });
});

describe('individual message (variant B)', () => {
  it('is created one at a time from a first name and is never part of the automatic batch', () => {
    const s = estado();
    const b = crearBorradores({
      eventos: s.eventos, practica: s.practica!, contexto: null, contactos: { familias: [{ id: 'f1', alias: 'E01', telefono: '+51900000011', lengua: 'es', alta: true, individual: { nombre: 'Yeni', linea: { tipo: 'ayudo' } } }] },
      ahora: T, enlaceLigero: 'https://rikuy.app/#/p/abc.1z', institucion: 'IE', soloIndividual: 'f1',
    });
    expect(b).toHaveLength(1);
    expect(b[0].mensaje.plantilla).toBe('familia_semanal_b');
    expect(b[0].mensaje.cuerpo.texto).toContain('Yeni');
    expect(construirEscenario().clase.id).toBeTruthy();
  });
});
