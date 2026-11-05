/** Capability ports (4.2). Adapters implement them; the router picks which one runs. */
import type { Lengua } from '@rikuy/contracts';
import type { Result } from './result.ts';
import type { BorradorPractica, FilaMedicion, PromptPictograma, RevisionIA, SolicitudPractica, TextoNoRevisado } from './esquemas.ts';
import type { ArchivoPlan, PlanExtraido } from './plan/esquemas.ts';

export type FalloIA = {
  tipo: 'sin_red' | 'timeout' | 'cuota' | 'esquema' | 'politica' | 'proveedor';
  detalle: string;
};

/** Metadata of one provider call. Never the content (4.5). */
export interface UsoLlamada {
  endpoint: string;
  proposito: string;
  tokensEntrada?: number;
  tokensSalida?: number;
  tokensCache?: number;
  imagenes?: number;
  costoUsd: number;
}

export interface ContextoLlamada {
  colegioId: string;
  registrarUso(uso: UsoLlamada): void;
  senal?: AbortSignal;
}

export interface GeneradorPractica {
  generar(s: SolicitudPractica, ctx?: ContextoLlamada): Promise<Result<BorradorPractica, FalloIA>>;
}
export interface RevisorPractica {
  revisar(b: BorradorPractica, ctx?: ContextoLlamada): Promise<Result<RevisionIA, FalloIA>>;
}
export interface Pictogramas {
  generar(p: PromptPictograma, ctx?: ContextoLlamada): Promise<Result<Blob, FalloIA>>;
}
export interface VisionTabla {
  leer(img: Blob, ctx?: ContextoLlamada): Promise<Result<FilaMedicion[], FalloIA>>;
}
export interface BorradorTraduccion {
  traducir(texto: string, a: Lengua, ctx?: ContextoLlamada): Promise<Result<TextoNoRevisado, FalloIA>>;
}

/** Reads a teacher's plan (PDF or photos) into a structure with literal snippets. It never maps to the CNEB. */
export interface ExtractorPlan {
  extraer(archivos: ArchivoPlan[], ctx?: ContextoLlamada): Promise<Result<PlanExtraido, FalloIA>>;
}

export interface Capacidades {
  generarPractica: GeneradorPractica;
  revisarPractica: RevisorPractica;
  pictogramas: Pictogramas;
  visionTabla: VisionTabla;
  traducir: BorradorTraduccion;
  extraerPlan: ExtractorPlan;
}
export type Capacidad = keyof Capacidades;
export const CAPACIDADES: readonly Capacidad[] = ['generarPractica', 'revisarPractica', 'pictogramas', 'visionTabla', 'traducir', 'extraerPlan'];
