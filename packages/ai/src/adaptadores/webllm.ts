/**
 * WebLLM capability detection (4.3): a model runs on the device only if it has WebGPU and at least 6 GB of RAM.
 * Detection is pure over a snapshot of the environment, so it is testable without a browser.
 * Loading the model itself is on the roadmap; until then the adapter declares no capabilities.
 */
import type { Adaptador } from '../enrutador.ts';

export interface EntornoDispositivo {
  tieneWebGPU: boolean;
  /** `navigator.deviceMemory` (GB, capped at 8 by browsers); undefined when the browser does not expose it. */
  memoriaGb?: number;
}
export interface DeteccionWebLLM {
  apto: boolean;
  motivo: 'ok' | 'sin_webgpu' | 'memoria_insuficiente' | 'memoria_desconocida';
}

export const MEMORIA_MINIMA_GB = 6;

export function detectarWebLLM(e: EntornoDispositivo): DeteccionWebLLM {
  if (!e.tieneWebGPU) return { apto: false, motivo: 'sin_webgpu' };
  if (e.memoriaGb === undefined) return { apto: false, motivo: 'memoria_desconocida' }; // fail closed: do not guess
  if (e.memoriaGb < MEMORIA_MINIMA_GB) return { apto: false, motivo: 'memoria_insuficiente' };
  return { apto: true, motivo: 'ok' };
}

/** Reads the snapshot from a browser-like global. */
export function leerEntorno(g: { navigator?: { gpu?: unknown; deviceMemory?: number } } = globalThis as never): EntornoDispositivo {
  const nav = g.navigator;
  return { tieneWebGPU: !!nav?.gpu, ...(typeof nav?.deviceMemory === 'number' ? { memoriaGb: nav.deviceMemory } : {}) };
}

export function crearAdaptadorWebLLM(entorno: EntornoDispositivo = leerEntorno()): Adaptador {
  const d = detectarWebLLM(entorno);
  return { nombre: 'webllm', fuente: 'ia-local', modelo: 'webllm', disponible: () => d.apto, capacidades: {} };
}
