/**
 * Honesty policy: the tutor never claims an action before the tool confirms it.
 *
 * Pattern from AulaQuipu (paoloose/aulaquipu, backend/agents/aulaquipu-tutor/src/agent.ts, section
 * "Honestidad con lo que hace la pantalla"): announce the intention in the FUTURE ("voy a graficarlo"),
 * confirm only when the result says so, and say "no pude" when it failed. Also ECOSISTEMA 2.4: every
 * action on the viewer returns OK or ERROR and Rikuy never states something that did not happen.
 */
import type { Comando } from '@rikuy/contracts';
import { tieneAlguna, tokenizar } from './texto.ts';

export interface ResultadoComando {
  comando: Comando;
  ok: boolean;
  /** Why it failed, when it did. */
  motivo?: string;
}

const ESCENAS: Record<string, string> = {
  higado: 'el hígado', lobulillo: 'el lobulillo hepático', respiratorio: 'el sistema respiratorio', lactasa: 'la lactasa',
  enterocito: 'el enterocito', vellosidad: 'la vellosidad', intestino: 'el intestino', digestivo: 'el sistema digestivo', pendulo: 'el péndulo',
};

interface Descripcion {
  futuro: string;
  pasado: string;
  fallo: string;
}

export function describirAccion(c: Comando): Descripcion {
  switch (c.tool) {
    case 'ir_a': {
      const donde = ESCENAS[c.args.escena] ?? c.args.escena;
      return { futuro: `llevarte a ${donde}`, pasado: `te llevé a ${donde}`, fallo: `llevarte a ${donde}` };
    }
    case 'fijar_variable':
      return {
        futuro: `poner ${c.args.variable} en ${c.args.valor}`,
        pasado: `puse ${c.args.variable} en ${c.args.valor}`,
        fallo: `poner ${c.args.variable} en ${c.args.valor}`,
      };
    case 'correr':
      return { futuro: 'correr la simulación', pasado: 'corrí la simulación', fallo: 'correr la simulación' };
    case 'pausar':
      return { futuro: 'pausar la simulación', pasado: 'pausé la simulación', fallo: 'pausar la simulación' };
    case 'resaltar':
      return { futuro: `resaltar ${c.args.parte}`, pasado: `resalté ${c.args.parte}`, fallo: `resaltar ${c.args.parte}` };
    case 'rotar':
      return { futuro: 'girar el holograma', pasado: 'giré el holograma', fallo: 'girar el holograma' };
    case 'zoom':
      return c.args.factor >= 1
        ? { futuro: 'acercar el holograma', pasado: 'acerqué el holograma', fallo: 'acercar el holograma' }
        : { futuro: 'alejar el holograma', pasado: 'alejé el holograma', fallo: 'alejar el holograma' };
    case 'separar_partes':
      return { futuro: 'separar las partes', pasado: 'separé las partes', fallo: 'separar las partes' };
    case 'reiniciar_vista':
      return { futuro: 'centrar la vista', pasado: 'centré la vista', fallo: 'centrar la vista' };
    case 'dar_pista':
      return { futuro: `mostrarte la pista ${c.args.nivel}`, pasado: `te mostré la pista ${c.args.nivel}`, fallo: `mostrarte la pista ${c.args.nivel}` };
    case 'registrar_hipotesis':
      return { futuro: 'anotar tu hipótesis', pasado: 'anoté tu hipótesis', fallo: 'anotar tu hipótesis' };
    case 'registrar_conclusion':
      return { futuro: 'anotar tu conclusión', pasado: 'anoté tu conclusión', fallo: 'anotar tu conclusión' };
  }
}

function unir(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** Before the tool runs: future tense, no completed-action claim. */
export function anunciar(comandos: readonly Comando[]): string {
  return comandos.length === 0 ? '' : `Voy a ${unir(comandos.map((c) => describirAccion(c).futuro))}.`;
}

/** After the tool answered: "listo" only for what was confirmed, "no pude" for the rest. */
export function confirmar(resultados: readonly ResultadoComando[]): string {
  const bien = resultados.filter((r) => r.ok).map((r) => describirAccion(r.comando).pasado);
  const mal = resultados.filter((r) => !r.ok);
  const partes: string[] = [];
  if (bien.length > 0) partes.push(`Listo: ${unir(bien)}.`);
  if (mal.length > 0) {
    const que = unir(mal.map((r) => describirAccion(r.comando).fallo));
    const motivos = [...new Set(mal.flatMap((r) => (r.motivo ? [r.motivo] : [])))];
    partes.push(`No pude ${que}${motivos.length ? ` (${motivos.join('; ')})` : ''}.`);
  }
  return partes.join(' ');
}

const VERBOS_CONSUMADOS = [
  'listo', 'hecho', 'hecha', 'pause', 'gire', 'cambie', 'corri', 'acerque', 'aleje', 'separe', 'fije', 'lleve', 'mostre',
  'centre', 'puse', 'anote', 'guarde', 'registre', 'reinicie', 'resalte', 'solte',
];

/** True if the text states that an action already happened ("listo", "pausé", "ya está"...). */
export function afirmaAccionConsumada(texto: string): boolean {
  return tieneAlguna(tokenizar(texto), [...VERBOS_CONSUMADOS, 'ya esta', 'ya lo', 'ya quedo']);
}

export const FRASE_NO_ENTENDI = 'No entendí lo que quisiste decir. ¿Quieres la pista 1?';
export const FRASE_IDENTIDAD = 'Soy Rikuy, un programa de computadora que te acompaña a pensar. No soy una persona.';
