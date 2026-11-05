/**
 * `validarComandos` (ARQUITECTURA 4.4): the LLM or the rules PROPOSE commands, the code decides.
 *
 * Chain: parse JSON -> conform to the SAME JSON Schema the LLM saw (`comandoJsonSchema`) ->
 * Zod (`Comando`) -> domain rules (scene exists, variable belongs to the practice, value in range,
 * `dar_pista` respects the ladder). It is the `assemble()` of apps/server/src/agent/llm.ts moved to a
 * pure package: same idea (the model proposes, the server only lets the allowed pass), no network.
 * Pattern credit for "director proposes strict JSON, code validates":
 * paoloose/aulaquipu, apps/web-app/lib/director.ts (`sanitizeActions`).
 */
import { Comando, comandoJsonSchema } from '@rikuy/contracts';
import { nivelPermitido, type EstadoEscalera } from './escalera.ts';
import { err, ok, type Result } from './result.ts';

export interface ContextoValidacion {
  /** Scene registry (the viewer's, not a hand-written list). */
  escenas: readonly string[];
  /** Variables of the current practice with their range. */
  variables: ReadonlyArray<{ id: string; min: number; max: number }>;
  /** Ladder state of this group in this practice. */
  escalera: EstadoEscalera;
  /** Rungs available in the practice (hints), default 3. */
  peldanos?: number;
  /** Parts of the current scene, if the scene declares them. */
  partes?: readonly string[];
  /** Maximum commands per turn. */
  maxComandos?: number;
}

export type CodigoError =
  | 'json'
  | 'esquema'
  | 'demasiados'
  | 'escena_inexistente'
  | 'variable_ajena'
  | 'fuera_de_rango'
  | 'parte_inexistente'
  | 'pista_salta_escalera';

export interface ErrorComando {
  indice: number;
  tool: string;
  codigo: CodigoError;
  detalle: string;
}

const MAX_POR_DEFECTO = 4;

// ---- JSON Schema (subset used by z.toJSONSchema on the Comando union) ------------------------

type Esquema = Record<string, unknown>;

/** Tool names in the JSON Schema given to the LLM. */
export function herramientasDelEsquema(esquema: Esquema = comandoJsonSchema()): string[] {
  const opciones = ((esquema.oneOf ?? esquema.anyOf) as Esquema[] | undefined) ?? [];
  return opciones.flatMap((o) => {
    const tool = ((o.properties as Esquema | undefined)?.tool as Esquema | undefined)?.const;
    return typeof tool === 'string' ? [tool] : [];
  });
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validates `valor` against the JSON Schema subset emitted for the tool union. */
export function conformaEsquema(valor: unknown, esquema: Esquema): boolean {
  if (Array.isArray(esquema.oneOf)) return (esquema.oneOf as Esquema[]).filter((s) => conformaEsquema(valor, s)).length === 1;
  if (Array.isArray(esquema.anyOf)) return (esquema.anyOf as Esquema[]).some((s) => conformaEsquema(valor, s));
  if ('const' in esquema && valor !== esquema.const) return false;
  if (Array.isArray(esquema.enum) && !esquema.enum.includes(valor)) return false;

  switch (esquema.type) {
    case 'object': {
      if (!esObjeto(valor)) return false;
      const props = (esquema.properties ?? {}) as Record<string, Esquema>;
      const requeridas = (esquema.required ?? []) as string[];
      if (requeridas.some((k) => !(k in valor))) return false;
      if (esquema.additionalProperties === false && Object.keys(valor).some((k) => !(k in props))) return false;
      return Object.entries(valor).every(([k, v]) => !(k in props) || conformaEsquema(v, props[k]!));
    }
    case 'array':
      return Array.isArray(valor) && (!esquema.items || valor.every((v) => conformaEsquema(v, esquema.items as Esquema)));
    case 'string':
      return (
        typeof valor === 'string' &&
        (typeof esquema.minLength !== 'number' || valor.length >= esquema.minLength) &&
        (typeof esquema.maxLength !== 'number' || valor.length <= esquema.maxLength)
      );
    case 'number':
    case 'integer': {
      if (typeof valor !== 'number' || !Number.isFinite(valor)) return false;
      if (esquema.type === 'integer' && !Number.isInteger(valor)) return false;
      if (typeof esquema.minimum === 'number' && valor < esquema.minimum) return false;
      if (typeof esquema.maximum === 'number' && valor > esquema.maximum) return false;
      if (typeof esquema.exclusiveMinimum === 'number' && valor <= esquema.exclusiveMinimum) return false;
      if (typeof esquema.exclusiveMaximum === 'number' && valor >= esquema.exclusiveMaximum) return false;
      return true;
    }
    case 'boolean':
      return typeof valor === 'boolean';
    case undefined:
      return true;
    default:
      return false;
  }
}

// ---- Validation ----------------------------------------------------------------------------

function comoLista(entrada: unknown): Result<unknown[], ErrorComando[]> {
  let valor = entrada;
  if (typeof valor === 'string') {
    try {
      valor = JSON.parse(valor);
    } catch {
      return err([{ indice: 0, tool: '', codigo: 'json', detalle: 'La salida no es JSON válido.' }]);
    }
  }
  if (esObjeto(valor) && Array.isArray(valor.comandos)) valor = valor.comandos;
  if (!Array.isArray(valor)) return err([{ indice: 0, tool: '', codigo: 'json', detalle: 'Se esperaba una lista de comandos.' }]);
  return ok(valor);
}

export function validarComandos(entrada: unknown, ctx: ContextoValidacion): Result<Comando[], ErrorComando[]> {
  const lista = comoLista(entrada);
  if (!lista.ok) return lista;
  const maximo = ctx.maxComandos ?? MAX_POR_DEFECTO;
  if (lista.valor.length > maximo) {
    return err([{ indice: 0, tool: '', codigo: 'demasiados', detalle: `Máximo ${maximo} comandos por turno.` }]);
  }

  const esquema = comandoJsonSchema();
  const errores: ErrorComando[] = [];
  const validos: Comando[] = [];
  const escalera: EstadoEscalera = { ...ctx.escalera };

  lista.valor.forEach((crudo, indice) => {
    const tool = esObjeto(crudo) && typeof crudo.tool === 'string' ? crudo.tool : '';
    const parsed = Comando.safeParse(crudo);
    if (!conformaEsquema(crudo, esquema) || !parsed.success) {
      errores.push({ indice, tool, codigo: 'esquema', detalle: `Comando fuera del esquema (herramientas: ${herramientasDelEsquema().join(', ')}).` });
      return;
    }
    const c = parsed.data;
    const falla = (codigo: CodigoError, detalle: string) => {
      errores.push({ indice, tool: c.tool, codigo, detalle });
    };

    switch (c.tool) {
      case 'ir_a':
        if (!ctx.escenas.includes(c.args.escena)) return falla('escena_inexistente', `La escena "${c.args.escena}" no existe.`);
        break;
      case 'fijar_variable': {
        const v = ctx.variables.find((x) => x.id === c.args.variable);
        if (!v) return falla('variable_ajena', `La variable "${c.args.variable}" no es de esta práctica.`);
        if (c.args.valor < v.min || c.args.valor > v.max) {
          return falla('fuera_de_rango', `El valor de "${v.id}" debe estar entre ${v.min} y ${v.max}.`);
        }
        break;
      }
      case 'resaltar':
        if (ctx.partes && !ctx.partes.includes(c.args.parte)) return falla('parte_inexistente', `La parte "${c.args.parte}" no existe en la escena.`);
        break;
      case 'dar_pista':
        if (!nivelPermitido(c.args.nivel, escalera, ctx.peldanos)) {
          return falla('pista_salta_escalera', `La pista ${c.args.nivel} no es la siguiente de la escalera (llevas ${escalera.mostradas}).`);
        }
        escalera.mostradas = Math.max(escalera.mostradas, c.args.nivel);
        break;
      default:
        break;
    }
    validos.push(c);
  });

  return errores.length > 0 ? err(errores) : ok(validos);
}

/** Text for the single retry of the chain "validate -> retry with the error -> rules floor". */
export function mensajeParaReintento(errores: readonly ErrorComando[]): string {
  return errores.map((e) => `Comando ${e.indice}${e.tool ? ` (${e.tool})` : ''}: ${e.detalle}`).join('\n');
}
