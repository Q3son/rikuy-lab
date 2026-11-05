/**
 * Gemini adapter (4.3): primary generator of the Creador, table-photo vision and draft translation.
 * Uses `@google/genai` with JSON-schema output built from Zod. Node-only: the API key lives in `apps/cloud` (2.3.3).
 * The model name is configurable and must be VERIFIED on the account (4.3).
 */
import { GoogleGenAI } from '@google/genai';
import type { Adaptador } from '../enrutador.ts';
import { BorradorPractica, SalidaTraduccion, SalidaVisionTabla, type SolicitudPractica } from '../esquemas.ts';
import { costoTexto } from '../presupuesto.ts';
import type { ContextoLlamada } from '../puertos.ts';
import { ErrorHttp, type OpcionesReintento } from '../reintentos.ts';
import { err, ok } from '../result.ts';
import type { z } from 'zod';
import { INSTRUCCIONES_CREADOR, contenidoGeneracion, esquemaJsonDe, salidaEstructurada, type UsoTokens } from './comun.ts';

export { esquemaJsonDe };

export const MODELO_GEMINI_POR_DEFECTO = 'gemini-2.5-flash';

export interface PedidoGemini {
  modelo: string;
  instrucciones: string;
  contenido: Array<string | { mimeType: string; base64: string }>;
  esquemaJson: Record<string, unknown>;
  proposito: string;
  senal?: AbortSignal;
}
export interface ClienteGemini {
  generar(p: PedidoGemini): Promise<{ texto: string; uso: UsoTokens }>;
}

/** Real client over the SDK. SDK errors are turned into `ErrorHttp` so the retry helper understands them. */
export function clienteGeminiDesdeSdk(apiKey: string): ClienteGemini {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generar(p) {
      try {
        const partes = p.contenido.map((c) => (typeof c === 'string' ? { text: c } : { inlineData: { mimeType: c.mimeType, data: c.base64 } }));
        const r = await ai.models.generateContent({
          model: p.modelo,
          contents: [{ role: 'user', parts: partes }],
          config: {
            systemInstruction: p.instrucciones,
            responseMimeType: 'application/json',
            responseJsonSchema: p.esquemaJson,
            ...(p.senal ? { abortSignal: p.senal } : {}),
          },
        });
        const u = r.usageMetadata;
        return {
          texto: r.text ?? '',
          uso: { tokensEntrada: u?.promptTokenCount ?? 0, tokensSalida: u?.candidatesTokenCount ?? 0, tokensCache: u?.cachedContentTokenCount ?? 0 },
        };
      } catch (e) {
        const status = (e as { status?: unknown }).status;
        if (typeof status === 'number') throw new ErrorHttp(status, 'gemini');
        throw e;
      }
    },
  };
}

export interface OpcionesGemini {
  cliente: ClienteGemini;
  modelo?: string;
  dormir?: OpcionesReintento['dormir'];
}

const base64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export function crearAdaptadorGemini(o: OpcionesGemini): Adaptador {
  const modelo = o.modelo ?? MODELO_GEMINI_POR_DEFECTO;
  const reintentos: OpcionesReintento = o.dormir ? { dormir: o.dormir } : {};

  function ejecutar<T>(proposito: string, schema: z.ZodType<T>, instrucciones: string, contenido: PedidoGemini['contenido'], ctx?: ContextoLlamada) {
    return salidaEstructurada<T>({
      schema,
      reintentos,
      llamar: (correccion) =>
        o.cliente.generar({
          modelo,
          instrucciones,
          contenido: correccion ? [...contenido, correccion] : contenido,
          esquemaJson: esquemaJsonDe(schema),
          proposito,
          ...(ctx?.senal ? { senal: ctx.senal } : {}),
        }),
      alUsar: (u) =>
        ctx?.registrarUso({
          endpoint: 'models.generateContent',
          proposito,
          ...u,
          costoUsd: costoTexto(modelo, u.tokensEntrada ?? 0, u.tokensSalida ?? 0, u.tokensCache ?? 0),
        }),
    });
  }

  return {
    nombre: 'gemini',
    fuente: 'ia-nube',
    modelo,
    disponible: () => true,
    costoEstimadoUsd: (c) => (c === 'generarPractica' ? 0.02 : 0.005),
    capacidades: {
      generarPractica: {
        generar: (s: SolicitudPractica, ctx) => ejecutar('generarPractica', BorradorPractica, INSTRUCCIONES_CREADOR, [contenidoGeneracion(s)], ctx),
      },
      visionTabla: {
        async leer(img, ctx) {
          if (img.size > 8_000_000) return err({ tipo: 'politica', detalle: 'La imagen es demasiado grande.' });
          const bytes = new Uint8Array(await img.arrayBuffer());
          const r = await ejecutar(
            'visionTabla',
            SalidaVisionTabla,
            'Lee la tabla de mediciones de la foto. Devuelve solo JSON con las filas. No inventes valores ilegibles: omítelos.',
            [{ mimeType: img.type || 'image/jpeg', base64: base64(bytes) }, 'Extrae las filas de la tabla.'],
            ctx,
          );
          return r.ok ? ok(r.valor.filas) : r;
        },
      },
      traducir: {
        async traducir(texto, a, ctx) {
          const r = await ejecutar(
            'traducir',
            SalidaTraduccion,
            'Traduces textos escolares de ciencias al idioma pedido. Devuelve solo JSON {"texto": "..."}. Es un BORRADOR que revisará un hablante.',
            [`Idioma destino: ${a}.\nTexto:\n${texto}`],
            ctx,
          );
          return r.ok ? ok({ texto: r.valor.texto, lengua: a, revisado: false as const }) : r;
        },
      },
    },
  };
}
