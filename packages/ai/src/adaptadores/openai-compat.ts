/**
 * OpenAI-compatible adapter (Ollama, 4.3): a local model on the hub or the teacher laptop.
 * Free (no credits) and local (`ia-local`): nothing leaves the classroom network. May run in the hub.
 */
import type { z } from 'zod';
import type { Adaptador } from '../enrutador.ts';
import { BorradorPractica, SalidaRevision, type SolicitudPractica } from '../esquemas.ts';
import type { ContextoLlamada } from '../puertos.ts';
import { ErrorHttp, type OpcionesReintento } from '../reintentos.ts';
import { ok } from '../result.ts';
import { INSTRUCCIONES_CREADOR, INSTRUCCIONES_REVISOR, contenidoGeneracion, contenidoRevision, esquemaJsonDe, salidaEstructurada } from './comun.ts';

export interface OpcionesOpenAICompat {
  baseUrl: string; // e.g. http://localhost:11434/v1
  modelo: string; // e.g. llama3.2:3b
  apiKey?: string; // Ollama ignores it
  fetch?: typeof fetch;
  dormir?: OpcionesReintento['dormir'];
}

export function crearAdaptadorOpenAICompat(o: OpcionesOpenAICompat): Adaptador {
  const base = o.baseUrl.replace(/\/+$/, '');
  const f = o.fetch ?? fetch;
  const reintentos: OpcionesReintento = o.dormir ? { dormir: o.dormir } : {};

  function ejecutar<T>(proposito: string, schema: z.ZodType<T>, sistema: string, usuario: string, ctx?: ContextoLlamada) {
    return salidaEstructurada<T>({
      schema,
      reintentos,
      llamar: async (correccion) => {
        const r = await f(`${base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(o.apiKey ? { Authorization: `Bearer ${o.apiKey}` } : {}) },
          body: JSON.stringify({
            model: o.modelo,
            messages: [
              { role: 'system', content: sistema },
              { role: 'user', content: correccion ? `${usuario}\n\n${correccion}` : usuario },
            ],
            response_format: { type: 'json_schema', json_schema: { name: proposito, schema: esquemaJsonDe(schema) } },
            temperature: 0.3,
          }),
          ...(ctx?.senal ? { signal: ctx.senal } : {}),
        });
        if (r.status >= 400) throw new ErrorHttp(r.status, 'ollama');
        const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        return { texto: j.choices?.[0]?.message?.content ?? '', uso: { tokensEntrada: j.usage?.prompt_tokens ?? 0, tokensSalida: j.usage?.completion_tokens ?? 0 } };
      },
      alUsar: (u) => ctx?.registrarUso({ endpoint: '/chat/completions', proposito, ...u, costoUsd: 0 }),
    });
  }

  return {
    nombre: 'ollama',
    fuente: 'ia-local',
    modelo: o.modelo,
    disponible: () => true,
    capacidades: {
      generarPractica: { generar: (s: SolicitudPractica, ctx) => ejecutar('generarPractica', BorradorPractica, INSTRUCCIONES_CREADOR, contenidoGeneracion(s), ctx) },
      revisarPractica: {
        async revisar(b, ctx) {
          const r = await ejecutar('revisarPractica', SalidaRevision, INSTRUCCIONES_REVISOR, contenidoRevision(b), ctx);
          return r.ok ? ok({ ...r.valor, modelo: o.modelo }) : r;
        },
      },
    },
  };
}
