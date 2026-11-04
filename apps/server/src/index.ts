/**
 * Servidor de Rikuy Lab: corre en la laptop del docente (o en la nube).
 *  - POST /api/agent      agente con herramientas (LLM o reglas)
 *  - POST /api/events     recibe eventos de aprendizaje en lote
 *  - GET  /api/dashboard  resumen agregado para el panel docente
 *  - WS   /ws             relay por salas entre display, control y panel
 *  - estáticos            la web compilada (apps/web/dist)
 */
import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize, type LearningEvent } from '@rikuy/core';
import { attachRelay } from './relay.ts';
import { JsonlEventStore } from './store/events.ts';
import { runAgent } from './agent/llm.ts';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const store = new JsonlEventStore(process.env.DATA_DIR ?? resolve(here, '../data'));

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, llm: process.env.LLM_PROVIDER || 'reglas' });
});

app.post('/api/agent', async (req, res) => {
  const { text, context, history } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text requerido' });
    return;
  }
  const ctx = {
    practica: String(context?.practica ?? 'lactasa'),
    escena: String(context?.escena ?? 'digestivo'),
    pistasUsadas: Number(context?.pistasUsadas ?? 0),
    variables: typeof context?.variables === 'object' && context.variables ? context.variables : {},
  };
  const result = await runAgent(text.slice(0, 500), ctx, Array.isArray(history) ? history : []);
  res.json(result);
});

app.post('/api/events', async (req, res) => {
  const room = String(req.query.room ?? 'aula');
  const events = Array.isArray(req.body?.events) ? (req.body.events as LearningEvent[]) : [];
  await store.append(room, events.slice(0, 500));
  res.json({ ok: true, received: events.length });
});

app.get('/api/dashboard', async (req, res) => {
  const room = String(req.query.room ?? 'aula');
  const events = await store.list(room);
  res.json({ room, ...summarize(events), events: events.slice(-200) });
});

// Web compilada (producción). En desarrollo la sirve Vite con proxy a este servidor.
const dist = resolve(here, '../../web/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|ws).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

const server = createServer(app);
attachRelay(server, (msg, room) => {
  if (msg.type === 'event') void store.append(room, [msg.event]);
});

server.listen(PORT, () => {
  console.log(`Rikuy Lab server en http://localhost:${PORT} (agente: ${process.env.LLM_PROVIDER || 'reglas'})`);
});
