/** Types of the inquiry judge (port `ModeloJuez`, ARQUITECTURA 4.2). */
import type { FuenteIA, Indicador, NivelEvidencia } from '@rikuy/contracts';
import type { Result } from '../result.ts';

export type Nivel = NivelEvidencia;

/** One measurement of the group's own data: independent value x, measured value y. */
export interface DatoMedido {
  x: number;
  y: number;
}

export interface VariableJuez {
  id: string;
  /** Label as the teacher wrote it ("Longitud de la cuerda"); its content words are synonyms. */
  etiqueta?: string;
  sinonimos?: readonly string[];
}

export interface ContextoJuez {
  /** Variables of the practice. */
  variables: readonly VariableJuez[];
  /** The independent variable the group's measurements vary (id). */
  variableProbada: string;
  /** Concept words that turn a reason into a scientific one ("distancia", "proteina"...). */
  conceptos?: readonly string[];
}

export interface SolicitudJuez {
  indicador: Indicador;
  /** The student's literal words. */
  respuesta: string;
  contexto: ContextoJuez;
  /** Group's own measurements (annulled ones already removed). */
  datos: readonly DatoMedido[];
}

export interface VeredictoJuez {
  indicador: Indicador;
  nivel: Nivel;
  estado: 'ok' | 'dudoso' | 'no_observable';
  /** Literal substring of the student's answer ('' when not assessable). */
  cita: string;
  fuente: FuenteIA;
  /** Level of each run when a model judged (3 runs). */
  corridas?: string[];
  /** Why the rules took over from the model, if they did. */
  respaldo?: string;
}

export interface CorridaModelo {
  nivel: Nivel;
  cita: string;
}

export type FalloIA = {
  tipo: 'sin_red' | 'timeout' | 'cuota' | 'esquema' | 'politica' | 'proveedor';
  detalle: string;
};

/** Port: a model proposes ONE run (level + quote); the pipeline validates and aggregates 3. */
export interface ModeloJuez {
  readonly fuente: Extract<FuenteIA, 'ia-local' | 'ia-nube'>;
  juzgar(s: SolicitudJuez): Promise<Result<CorridaModelo, FalloIA>>;
}
