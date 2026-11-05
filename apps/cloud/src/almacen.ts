/**
 * Cloud persistence ports (4.5 and 1.5): only published packages and anonymous aggregates, never student text.
 * In-memory implementations for dev, tests and mock mode; Postgres comes later behind the same ports.
 */
import type { Paquete, Practica } from '@rikuy/contracts';
import { z } from 'zod';

export interface PaquetePublicado {
  id: string; // practice id
  version: number;
  sha256: string;
  publicado: string;
  paquete: Paquete;
}
export interface RepositorioPaquetes {
  guardar(p: PaquetePublicado): { resultado: 'creado' | 'igual' | 'conflicto' };
  obtener(id: string, version?: number): PaquetePublicado | undefined;
  listar(): PaquetePublicado[];
}
export class RepositorioPaquetesMemoria implements RepositorioPaquetes {
  private readonly m = new Map<string, PaquetePublicado>();
  guardar(p: PaquetePublicado) {
    const k = `${p.id}@${p.version}`;
    const previo = this.m.get(k);
    if (previo) return { resultado: previo.sha256 === p.sha256 ? ('igual' as const) : ('conflicto' as const) };
    this.m.set(k, p);
    return { resultado: 'creado' as const };
  }
  obtener(id: string, version?: number) {
    const versiones = [...this.m.values()].filter((p) => p.id === id);
    return version === undefined ? versiones.sort((a, b) => b.version - a.version)[0] : versiones.find((p) => p.version === version);
  }
  listar() {
    return [...this.m.values()];
  }
}
export const resumenPaquete = (p: PaquetePublicado) => {
  const pr = p.paquete.cuerpo as Practica;
  return { id: p.id, version: p.version, titulo: pr.titulo, desempeno: pr.desempeno, publicado: p.publicado, sha256: p.sha256 };
};

/** Weekly anonymous aggregate per school. Strict: free text or per-student fields are rejected. */
export const AgregadoSemanal = z.strictObject({
  envioActivado: z.literal(true), // the teacher turned sending on
  colegioId: z.string().regex(/^[A-Za-z0-9_-]{3,40}$/),
  semana: z.string().regex(/^\d{4}-W\d{2}$/),
  celdas: z
    .array(
      z.strictObject({
        competencia: z.number().int().min(1).max(8),
        nivel: z.enum(['0', '1', '2', '3', 'no_evaluable']),
        grupos: z.number().int().min(0).max(1000),
      }),
    )
    .max(60),
});
export type AgregadoSemanal = z.infer<typeof AgregadoSemanal>;

export const K_MINIMO = 5;
export interface Celda {
  competencia: number;
  nivel: string;
  grupos: number;
}
/** Small-cell suppression (k >= 5 groups), applied on receipt and again on read. */
export function suprimir(celdas: Celda[], k = K_MINIMO): { visibles: Celda[]; suprimidas: number } {
  const visibles = celdas.filter((c) => c.grupos >= k);
  return { visibles, suprimidas: celdas.length - visibles.length };
}

export interface RepositorioAgregados {
  reemplazar(colegioId: string, semana: string, celdas: Celda[]): void;
  porSemana(semana: string): Array<{ colegioId: string; celdas: Celda[] }>;
}
export class RepositorioAgregadosMemoria implements RepositorioAgregados {
  private readonly m = new Map<string, Celda[]>();
  reemplazar(colegioId: string, semana: string, celdas: Celda[]) {
    this.m.set(`${semana}|${colegioId}`, celdas);
  }
  porSemana(semana: string) {
    return [...this.m.entries()].filter(([k]) => k.startsWith(`${semana}|`)).map(([k, celdas]) => ({ colegioId: k.slice(semana.length + 1), celdas }));
  }
}
