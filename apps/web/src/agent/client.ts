/**
 * Cliente del agente: pregunta al servidor y, si no hay red, responde con
 * el agente de reglas local. La interfaz es la misma en ambos casos.
 */
import { STATIC } from '../env.ts';
import { analyzeUtterance, rulesAgent, type AgentContext, type AgentReply, type LearningEvent } from '@rikuy/core';

export interface AgentResult extends AgentReply {
  analysis: Pick<LearningEvent, 'tipo_pregunta' | 'conceptos' | 'relacional' | 'rubrica' | 'clasificado_por'>;
}

const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

export async function askAgent(text: string, ctx: AgentContext): Promise<AgentResult> {
  let result: AgentResult;
  try {
    if (STATIC) throw new Error('sin servidor');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 16000);
    const res = await fetch('api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, context: ctx, history }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    result = (await res.json()) as AgentResult;
  } catch {
    result = { ...rulesAgent(text, ctx), analysis: analyzeUtterance(text) };
  }
  history.push({ role: 'user', content: text }, { role: 'assistant', content: result.reply });
  if (history.length > 16) history.splice(0, history.length - 16);
  return result;
}
