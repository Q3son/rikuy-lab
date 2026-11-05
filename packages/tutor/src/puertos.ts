/**
 * Ports of the tutor (ARQUITECTURA 2.2 and 4.2). Adapters (Gemini, Ollama, WebLLM, rules) live in @rikuy/ai.
 * The judge port `ModeloJuez` is declared next to the judge (juez/tipos.ts) and re-exported here.
 */
import type { Comando } from '@rikuy/contracts';
import type { ContextoAgente } from './reglas/agente.ts';
import type { Result } from './result.ts';
import type { FalloIA } from './juez/tipos.ts';

export type { ModeloJuez, SolicitudJuez, FalloIA } from './juez/tipos.ts';

/** What a model sees for one turn: the student's words plus the same context the rules use. */
export interface ContextoTutor {
  texto: string;
  contexto: ContextoAgente;
}

/** A model PROPOSES a reply and commands; `validarComandos` and the honesty policy decide what is shown. */
export interface PropuestaTutor {
  texto: string;
  comandos: unknown[] | Comando[];
}

export interface ModeloTutor {
  readonly fuente: 'ia-local' | 'ia-nube';
  turno(c: ContextoTutor): Promise<Result<PropuestaTutor, FalloIA>>;
}
