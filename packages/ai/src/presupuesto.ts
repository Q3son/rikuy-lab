/**
 * Cost estimation, usage log and monthly budget per school (4.5). Pattern of Willay `UsageLog.ensure_within_budget`.
 * The log keeps metadata only: model, tokens, cost and latency, never the content.
 */
import type { FalloIA } from './puertos.ts';

/** USD per 1M tokens: [cached input, input, output]. Meta prices: https://dev.meta.ai/docs/pricing-rate-limits (Willay, 2026-10-31). */
const TARIFAS_TEXTO: Record<string, readonly [number, number, number]> = {
  'muse-spark-1.3': [0.15, 1.25, 4.25],
  'muse-spark-1.2': [0.15, 1.25, 4.25],
  'muse-spark-1.1': [0.15, 1.25, 4.25],
  'muse-spark-1.3-contributor': [0.002, 0.1, 0.2],
  'muse-wonder-1.0': [0.2, 4.0, 20.0],
  // Gemini Flash: indicative public rates. VERIFY on the account; the model name is configurable (4.3).
  'gemini-2.5-flash': [0.075, 0.3, 2.5],
};
const TARIFA_DESCONOCIDA: readonly [number, number, number] = [0.2, 4.0, 20.0]; // priciest known: never under-estimate
export const COSTO_IMAGEN_USD = 0.01;
export const TOPE_MENSUAL_POR_DEFECTO_USD = 3;

export function costoTexto(modelo: string, tokensEntrada: number, tokensSalida: number, tokensCache = 0): number {
  const [cache, entrada, salida] = TARIFAS_TEXTO[modelo] ?? TARIFA_DESCONOCIDA;
  const cacheados = Math.min(Math.max(tokensCache, 0), Math.max(tokensEntrada, 0));
  const frescos = Math.max(tokensEntrada, 0) - cacheados;
  return (frescos * entrada + cacheados * cache + Math.max(tokensSalida, 0) * salida) / 1_000_000;
}
export function costoImagen(n = 1): number {
  return n * COSTO_IMAGEN_USD;
}

export interface EntradaUso {
  ts: string;
  colegioId: string;
  adaptador: string;
  modelo: string;
  endpoint: string;
  proposito: string;
  tokensEntrada?: number;
  tokensSalida?: number;
  tokensCache?: number;
  imagenes?: number;
  costoUsd: number;
  latenciaMs: number;
  estado: 'ok' | 'error' | 'cuota';
}

/** Only these fields are ever persisted. */
const CAMPOS_REGISTRADOS = [
  'ts', 'colegioId', 'adaptador', 'modelo', 'endpoint', 'proposito', 'tokensEntrada', 'tokensSalida', 'tokensCache', 'imagenes', 'costoUsd', 'latenciaMs', 'estado',
] as const;
export function soloMetadatos(e: EntradaUso): EntradaUso {
  const out: Record<string, unknown> = {};
  for (const k of CAMPOS_REGISTRADOS) if (e[k] !== undefined) out[k] = e[k];
  return out as unknown as EntradaUso;
}

export interface RegistroUso {
  agregar(e: EntradaUso): void;
  gastoMes(colegioId: string, mes: string): number;
}

export class RegistroUsoMemoria implements RegistroUso {
  private readonly lista: EntradaUso[] = [];
  constructor(private readonly alAgregar?: (e: EntradaUso) => void) {}
  agregar(e: EntradaUso): void {
    const limpia = soloMetadatos(e);
    this.lista.push(limpia);
    this.alAgregar?.(limpia);
  }
  gastoMes(colegioId: string, mes: string): number {
    return this.lista.filter((e) => e.colegioId === colegioId && e.ts.startsWith(mes)).reduce((s, e) => s + e.costoUsd, 0);
  }
  entradas(): readonly EntradaUso[] {
    return this.lista;
  }
}

export interface OpcionesPresupuesto {
  registro: RegistroUso;
  topeMensualUsd?: number;
  reloj?: () => Date;
}

export class Presupuesto {
  readonly topeMensualUsd: number;
  private readonly registro: RegistroUso;
  private readonly reloj: () => Date;
  constructor(o: OpcionesPresupuesto) {
    this.registro = o.registro;
    this.topeMensualUsd = o.topeMensualUsd ?? TOPE_MENSUAL_POR_DEFECTO_USD;
    this.reloj = o.reloj ?? (() => new Date());
  }
  mesActual(): string {
    return this.reloj().toISOString().slice(0, 7);
  }
  gastado(colegioId: string): number {
    return this.registro.gastoMes(colegioId, this.mesActual());
  }
  restanteUsd(colegioId: string): number {
    return Math.max(0, this.topeMensualUsd - this.gastado(colegioId));
  }
  /** Rejects the call before it happens when it would push the school over its monthly cap. */
  asegurar(colegioId: string, estimadoUsd: number): FalloIA | undefined {
    const gastado = this.gastado(colegioId);
    if (gastado + estimadoUsd > this.topeMensualUsd + 1e-9) {
      return { tipo: 'cuota', detalle: `Presupuesto mensual del colegio agotado (US$ ${gastado.toFixed(2)} de ${this.topeMensualUsd.toFixed(2)}).` };
    }
    return undefined;
  }
}
