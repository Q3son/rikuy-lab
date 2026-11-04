import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestion, extractConcepts, isRelational, scoreHypothesis, summarize } from './analytics.ts';
import { lactaseActivity, pendulumPeriod } from './physics.ts';
import { rulesAgent } from './rulesAgent.ts';

const ctx = { practica: 'lactasa', escena: 'lactasa', pistasUsadas: 0, variables: {} };

test('clasifica tipos de pregunta', () => {
  assert.equal(classifyQuestion('¿Qué pasaría si caliento la leche?'), 'hipotetica');
  assert.equal(classifyQuestion('¿Por qué la lactasa rompe la lactosa?'), 'causal');
  assert.equal(classifyQuestion('¿Qué tiene que ver el diafragma con la digestión?'), 'relacional');
  assert.equal(classifyQuestion('Quiero ver el hígado'), 'orden');
});

test('detecta conceptos y pensamiento relacional', () => {
  const c = extractConcepts('qué tiene que ver el diafragma con la digestión');
  assert.ok(c.includes('diafragma') && c.includes('sistema_digestivo'));
  assert.ok(isRelational(c));
});

test('rúbrica de hipótesis', () => {
  const r = scoreHypothesis('Si caliento la leche la lactasa ya no funciona porque se deforma');
  assert.deepEqual(r, { variable: 1, prediccion: 1, justificacion: 1 });
});

test('modelos físicos', () => {
  assert.ok(lactaseActivity(37, 6.5) > 0.95);
  assert.ok(lactaseActivity(75, 6.5) < 0.05);
  assert.ok(Math.abs(pendulumPeriod(1, 9.8) - 2.006) < 0.01);
});

test('agente de reglas navega y no da la respuesta', () => {
  const nav = rulesAgent('quiero ver el hígado', ctx);
  assert.deepEqual(nav.commands[0], { tool: 'ir_a', args: { escena: 'higado' } });
  const help = rulesAgent('dime la respuesta', ctx);
  assert.equal(help.commands[0].tool, 'dar_pista');
  const v = rulesAgent('pon la temperatura en 70', ctx);
  assert.deepEqual(v.commands[0], { tool: 'fijar_variable', args: { variable: 'temperatura', valor: 70 } });
});

test('resumen para el panel', () => {
  const s = summarize([
    { id: '1', ts: '', grupo: 'G1', practica: 'lactasa', kind: 'pregunta', tipo_pregunta: 'hipotetica', conceptos: ['lactasa', 'temperatura'], relacional: true, texto: 'x', rubrica: { variable: 1, prediccion: 1, justificacion: 0 } },
    { id: '2', ts: '', grupo: 'G2', practica: 'lactasa', kind: 'pregunta', tipo_pregunta: 'factual', conceptos: ['lactasa'] },
  ]);
  assert.equal(s.grupos.length, 2);
  assert.equal(s.mapaConceptos.lactasa, 2);
  assert.equal(s.grupos[0].razonamientoPromedio, 2);
});
