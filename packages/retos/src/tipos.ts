export type PasoReto =
  | {
      id: string;
      tipo: 'numero';
      enunciado: string;
      valor: number;
      tolerancia: number;
      unidad: string;
      /** Rikuy's question after a wrong try (never the answer). */
      retro: string;
      pista: string;
    }
  | {
      id: string;
      tipo: 'opcion';
      enunciado: string;
      opciones: string[];
      correcta: number;
      retro: string;
      pista: string;
    };

export interface Reto {
  id: string;
  titulo: string;
  contexto: string;
  area: 'matematica' | 'ciencia-y-tecnologia';
  competencia: string;
  pasos: PasoReto[];
}

/** Group progress: exactly the `reto.progreso` contract datos (no per-person scores). */
export interface ProgresoReto {
  retoId: string;
  grupoId: string;
  paso: number;
  completado: boolean;
}

export interface RepositorioProgreso {
  obtener(retoId: string, grupoId: string): Promise<ProgresoReto | null>;
  guardar(p: ProgresoReto): Promise<void>;
}
