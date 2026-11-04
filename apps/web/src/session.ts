/**
 * Turno de conversación: lo que dice el alumno pasa por el agente, se
 * ejecutan las herramientas y se registra la analítica. Lo usan tanto el
 * display (modo autónomo) como el control remoto.
 */
import type { AgentContext, Command } from '@rikuy/core';
import { askAgent } from './agent/client.ts';
import type { Tracker } from './analytics/tracker.ts';

export interface TurnDeps {
  tracker: Tracker;
  context: () => AgentContext;
  apply: (commands: Command[]) => void;
  say: (text: string) => void;
}

export async function handleUtterance(text: string, deps: TurnDeps) {
  const ctx = deps.context();
  const result = await askAgent(text, ctx);

  const kind = result.kind === 'accion' ? 'pregunta' : result.kind;
  deps.tracker.log({ kind, texto: text, ...result.analysis });

  for (const c of result.commands) {
    if (c.tool === 'dar_pista') deps.tracker.log({ kind: 'pista', pista_nivel: c.args.nivel });
    if (c.tool === 'fijar_variable') deps.tracker.log({ kind: 'cambio_variable', variable: { id: c.args.variable, valor: c.args.valor } });
  }

  deps.apply(result.commands);
  deps.say(result.reply);
  return result;
}
