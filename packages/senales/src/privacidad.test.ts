/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { AutorreporteMomento, EmocionAutorreporte, EventoAprendizaje } from '@rikuy/contracts';
import { hlcs, ids } from '@rikuy/contracts/fixtures';
import {
  afirmarSinEtiquetasEmocionales,
  agregarCurso,
  construirAutorreporte,
  construirPedidoDeAyuda,
  contieneEtiquetaEmocional,
  detectar,
  generarSugerencias,
  planificarSemana,
  vistaDocenteDeCheckIn,
  ofertaDeSenal,
} from './index.ts';

const AHORA = 1762300810000;
const est = (i: number) => `01JC${'0'.repeat(18)}E${String(i).padStart(3, '0')}`;

const arbAutorreporte = fc
  .record({
    n: fc.integer({ min: 1, max: 6 }),
    emociones: fc.uniqueArray(fc.constantFrom(...EmocionAutorreporte.options), { minLength: 1, maxLength: 6 }),
    intensidad: fc.constantFrom('poco', 'medio', 'mucho' as const),
    ayuda: fc.option(fc.constantFrom('pista', 'pausa', 'hablar_con_docente', 'nada' as const), { nil: undefined }),
    visibilidad: fc.constantFrom('solo_yo', 'mi_docente' as const),
    texto: fc.option(fc.constantFrom('No me sale', 'Quiero seguir'), { nil: undefined }),
  })
  .map((r) =>
    construirAutorreporte({
      id: `01JC${'0'.repeat(18)}A${String(r.n).padStart(3, '0')}`,
      estudianteId: est(r.n), claseId: ids.clase, pasoId: 'medir', hlc: hlcs.h2,
      emociones: r.emociones.map((emocion) => ({ emocion, intensidad: r.intensidad })),
      ayuda: r.ayuda, texto: r.texto, visibilidad: r.visibilidad,
    }),
  );

const arbEventos = fc.array(
  fc.record({
    n: fc.integer({ min: 1, max: 6 }),
    resultado: fc.constantFrom('correcto', 'incorrecto' as const),
    clase: fc.constantFrom('01JC0000000000000000000C01', '01JC0000000000000000000C02', '01JC0000000000000000000C03'),
    pista: fc.boolean(),
  }),
  { minLength: 4, maxLength: 40 },
).map((rs) =>
  rs.map((r, i) =>
    EventoAprendizaje.parse({
      id: `01JC${'0'.repeat(18)}Z${String(i).padStart(3, '0')}`,
      claseId: r.clase, grupoId: ids.grupo1, pasoId: 'medir', hlc: hlcs.h2, estudianteIds: [est(r.n)],
      ...(r.pista ? { tipo: 'pista_solicitada', nivel: 1 } : { tipo: 'intento', numero: 1, resultado: r.resultado }),
    }),
  ),
);

describe('no emotion label ever reaches a teacher-facing object (property)', () => {
  it('holds for signals, offers, suggestions, shared views and the class aggregate', () => {
    fc.assert(
      fc.property(fc.array(arbAutorreporte, { minLength: 0, maxLength: 8 }), arbEventos, fc.boolean(), (autorreportes, eventos, urgente) => {
        const senales = detectar(eventos, { ahora: AHORA, autorreportes });
        const pedidos = autorreportes
          .filter((a) => a.ayuda === 'hablar_con_docente' && a.visibilidad === 'mi_docente')
          .map((a) => construirPedidoDeAyuda({ id: a.id, estudianteId: a.estudianteId, claseId: a.claseId, destino: 'docente', urgente, hlc: a.hlc }));
        const { sugerencias } = generarSugerencias({ senales, pedidos, autorreportes }, { ahora: AHORA });
        const plan = planificarSemana(sugerencias, { tutorId: 't', ahora: AHORA, yaEmitidasEstaSemana: 0 });
        const vistas = autorreportes.map(vistaDocenteDeCheckIn);
        const agregado = agregarCurso({ participantes: [1, 2, 3, 4, 5, 6].map(est), autorreportes, eventos, inicioClaseMs: AHORA - 3_600_000, gruposTotal: 3 });
        const ofertas = senales.map(ofertaDeSenal);
        for (const salida of [senales, plan, vistas, agregado, ofertas]) {
          expect(contieneEtiquetaEmocional(salida)).toBe(false);
        }
        expect(plan.emitir.filter((s) => !s.escalarSiseVe).length).toBeLessThanOrEqual(3);
      }),
      { numRuns: 60 },
    );
  });

  it('a private check-in never appears in any individual teacher object', () => {
    const privado = construirAutorreporte({
      id: ids.respuesta, estudianteId: ids.estudiante1, claseId: ids.clase, pasoId: 'medir', hlc: hlcs.h2,
      emociones: [{ emocion: 'tristeza', intensidad: 'mucho' }], ayuda: 'hablar_con_docente', texto: 'secreto-privado', visibilidad: 'solo_yo',
    });
    expect(AutorreporteMomento.safeParse(privado).success).toBe(true);
    const { sugerencias } = generarSugerencias({ senales: [], pedidos: [], autorreportes: [privado] }, { ahora: AHORA });
    expect(sugerencias).toEqual([]);
    expect(JSON.stringify([vistaDocenteDeCheckIn(privado), sugerencias])).not.toContain('secreto-privado');
  });

  it('teacher-facing outputs have no field named after an inferred emotion', () => {
    const s = generarSugerencias({ senales: [], pedidos: [construirPedidoDeAyuda({ id: ids.respuesta, estudianteId: ids.estudiante1, claseId: ids.clase, destino: 'docente', urgente: false, hlc: hlcs.h2 })], autorreportes: [] }, { ahora: AHORA });
    afirmarSinEtiquetasEmocionales(s);
    expect(Object.keys(s.sugerencias[0] ?? {}).join(' ')).not.toMatch(/emoci|afect|sentim|estado_?emocional/i);
  });
});

describe('static guarantees of the package and the student UI', () => {
  const PROHIBIDO = /face_landmarker|FaceLandmarker|getUserMedia|\bfetch\s*\(|XMLHttpRequest|WebSocket|MediaRecorder|toBlob|toDataURL|keydown|keyup|pointermove|touchmove|devicemotion|onKey(Down|Up)|indexedDB/;
  const fuentes = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = join(dir, d.name);
      if (d.isDirectory()) return fuentes(p);
      return /\.(ts|tsx)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [p] : [];
    });
  const raiz = join(__dirname, '..', '..', '..');

  for (const dir of [join(raiz, 'packages', 'senales', 'src'), join(raiz, 'apps', 'web', 'src', 'features', 'guardian')]) {
    it(`has no network, camera, microphone, keystroke, touch or motion code: ${dir.split(/[\\/]/).slice(-3).join('/')}`, () => {
      const fuentesDir = fuentes(dir);
      expect(fuentesDir.length).toBeGreaterThan(0);
      for (const f of fuentesDir) expect(readFileSync(f, 'utf8'), f).not.toMatch(PROHIBIDO);
    });
  }
});
