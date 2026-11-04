/**
 * Agente con LLM y herramientas.
 *
 * Proveedores intercambiables por variables de entorno:
 *  - LLM_PROVIDER=anthropic  -> ANTHROPIC_API_KEY, LLM_MODEL (por defecto claude-haiku-5-5)
 *  - LLM_PROVIDER=openai     -> OPENAI_API_KEY, OPENAI_BASE_URL, LLM_MODEL
 *    (sirve para cualquier API compatible: Ollama local en http://localhost:11434/v1,
 *     Groq, OpenRouter, etc. Con Ollama la IA corre en la laptop del aula sin internet.)
 *  - sin configurar          -> agente de reglas (siempre disponible)
 *
 * Si el LLM falla o tarda, se responde con el agente de reglas: el aula nunca se queda colgada.
 */
import {
  AGENT_TOOLS,
  CONCEPTS,
  PRACTICES,
  analyzeUtterance,
  isSceneId,
  practiceById,
  rulesAgent,
  type AgentContext,
  type AgentReply,
  type Command,
  type LearningEvent,
  type QuestionType,
} from '@rikuy/core';

export interface AgentResult extends AgentReply {
  analysis: Pick<LearningEvent, 'tipo_pregunta' | 'conceptos' | 'relacional' | 'rubrica' | 'clasificado_por'>;
}

const ANALYSIS_TOOL = {
  name: 'analizar_turno',
  description:
    'OBLIGATORIO en cada turno. Clasifica lo que dijo el alumno para el panel del docente. No califica: describe cómo razona.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tipo_pregunta: { type: 'string', enum: ['factual', 'causal', 'hipotetica', 'relacional', 'orden', 'otro'] },
      conceptos: { type: 'array', items: { type: 'string', enum: CONCEPTS.map((c) => c.id) } },
      relacional: { type: 'boolean', description: 'true si conecta conceptos de dos sistemas distintos' },
      rubrica: {
        type: 'object',
        description: 'Solo si el alumno planteó una hipótesis. Cada campo 0 o 1.',
        properties: { variable: { type: 'integer' }, prediccion: { type: 'integer' }, justificacion: { type: 'integer' } },
      },
      kind: { type: 'string', enum: ['pregunta', 'hipotesis', 'conclusion', 'accion'] },
    },
    required: ['tipo_pregunta', 'conceptos', 'relacional', 'kind'],
  },
};

function systemPrompt(ctx: AgentContext): string {
  const p = practiceById.get(ctx.practica) ?? PRACTICES[0];
  return [
    'Eres Rikuy, un tutor de ciencias para estudiantes de secundaria del Perú. Hablas en español claro, cálido y breve (máximo 2 oraciones, se lee en voz alta).',
    'Controlas un holograma 3D con herramientas. Úsalas cuando el alumno pide ver, girar, acercar o cambiar algo.',
    'REGLAS PEDAGÓGICAS:',
    '- Nunca des la respuesta ni la conclusión del experimento. Guía con preguntas y, si el alumno se traba, usa dar_pista.',
    '- Pide siempre una predicción antes de correr una simulación y una justificación después.',
    '- Si el alumno conecta dos sistemas (por ejemplo diafragma y digestión), reconócelo.',
    '- Sé honesto: si la simulación simplifica algo, dilo. Si no sabes, dilo. No inventes datos.',
    '- Solo puedes ir a escenas del catálogo. Si piden algo que no existe, dilo y ofrece lo más cercano.',
    `PRÁCTICA ACTUAL: ${p.title}. Pregunta guía: ${p.guidingQuestion}`,
    `Límites a mencionar cuando corresponda: ${p.limitations.join(' ')}`,
    `ESTADO: escena=${ctx.escena}; variables=${JSON.stringify(ctx.variables)}; pistas usadas=${ctx.pistasUsadas}.`,
    'Llama SIEMPRE a analizar_turno además de las herramientas de escena que necesites.',
  ].join('\n');
}

export async function runAgent(text: string, ctx: AgentContext, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<AgentResult> {
  const provider = (process.env.LLM_PROVIDER ?? '').toLowerCase();
  try {
    if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) return await withTimeout(callAnthropic(text, ctx, history), 12000);
    if (provider === 'openai' && (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL)) return await withTimeout(callOpenAI(text, ctx, history), 15000);
  } catch (err) {
    console.warn('[agente] LLM no disponible, uso reglas:', (err as Error).message);
  }
  return fromRules(text, ctx);
}

function fromRules(text: string, ctx: AgentContext): AgentResult {
  return { ...rulesAgent(text, ctx), analysis: analyzeUtterance(text) };
}

// ---------------------------------------------------------------------------
// Anthropic Messages API (fetch directo, sin SDK)
// ---------------------------------------------------------------------------
async function callAnthropic(text: string, ctx: AgentContext, history: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<AgentResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? 'claude-haiku-5-5',
      max_tokens: 400,
      system: systemPrompt(ctx),
      tools: [...AGENT_TOOLS, ANALYSIS_TOOL],
      tool_choice: { type: 'any' },
      messages: [...history.slice(-8), { role: 'user', content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ type: string; text?: string; name?: string; input?: unknown }> };
  const reply = data.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  const calls = data.content.filter((b) => b.type === 'tool_use').map((b) => ({ name: b.name!, input: b.input as Record<string, unknown> }));
  return assemble(text, ctx, reply, calls);
}

// ---------------------------------------------------------------------------
// API compatible con OpenAI (Ollama local, Groq, OpenRouter...)
// ---------------------------------------------------------------------------
async function callOpenAI(text: string, ctx: AgentContext, history: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<AgentResult> {
  const base = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.OPENAI_API_KEY ? { authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? 'llama3.2',
      max_tokens: 400,
      messages: [{ role: 'system', content: systemPrompt(ctx) }, ...history.slice(-8), { role: 'user', content: text }],
      tools: [...AGENT_TOOLS, ANALYSIS_TOOL].map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })),
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: Array<{ message: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: string } }> } }>;
  };
  const msg = data.choices[0]?.message ?? {};
  const calls = (msg.tool_calls ?? []).map((c) => ({ name: c.function.name, input: safeJson(c.function.arguments) }));
  return assemble(text, ctx, (msg.content ?? '').trim(), calls);
}

// ---------------------------------------------------------------------------
// Validación: el LLM propone, el servidor solo deja pasar lo permitido
// ---------------------------------------------------------------------------
function assemble(text: string, ctx: AgentContext, reply: string, calls: Array<{ name: string; input: Record<string, unknown> }>): AgentResult {
  const allowed = new Set(AGENT_TOOLS.map((t) => t.name));
  const commands: Command[] = [];
  let analysis: AgentResult['analysis'] = analyzeUtterance(text);
  let kind: AgentReply['kind'] = 'pregunta';

  for (const call of calls) {
    if (call.name === 'analizar_turno') {
      const a = call.input;
      const tipos: QuestionType[] = ['factual', 'causal', 'hipotetica', 'relacional', 'orden', 'otro'];
      analysis = {
        tipo_pregunta: tipos.includes(a.tipo_pregunta as QuestionType) ? (a.tipo_pregunta as QuestionType) : analysis.tipo_pregunta,
        conceptos: Array.isArray(a.conceptos) ? (a.conceptos as string[]).filter((c) => CONCEPTS.some((k) => k.id === c)) : analysis.conceptos,
        relacional: Boolean(a.relacional),
        rubrica: a.rubrica ? normalizeRubric(a.rubrica as Record<string, unknown>) : analysis.rubrica,
        clasificado_por: 'llm',
      };
      if (['pregunta', 'hipotesis', 'conclusion', 'accion'].includes(String(a.kind))) kind = a.kind as AgentReply['kind'];
      continue;
    }
    if (!allowed.has(call.name as Command['tool'])) continue;
    if (call.name === 'ir_a' && !isSceneId(String(call.input.escena))) continue;
    commands.push({ tool: call.name, args: call.input } as Command);
  }

  // Si el modelo solo llamó herramientas sin texto, damos una respuesta corta.
  const fallbackText = rulesAgent(text, ctx).reply;
  return { reply: reply || fallbackText, commands, kind, source: 'llm', analysis };
}

function normalizeRubric(r: Record<string, unknown>) {
  const b = (x: unknown) => (Number(x) >= 1 ? 1 : 0) as 0 | 1;
  return { variable: b(r.variable), prediccion: b(r.prediccion), justificacion: b(r.justificacion) };
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms} ms`)), ms))]);
}
