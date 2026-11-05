/**
 * Tutor tools (4.4): the contract between the AI and the exhibit viewer.
 * The JSON Schema the LLM sees is derived from this union, so there is no parallel hand-written list.
 * Scene existence is checked by the domain validator `validarComandos` (scene registry), not here.
 */
import { z } from 'zod';

const vacio = z.strictObject({});
const texto = z.string().min(1).max(500);

export const Comando = z.discriminatedUnion('tool', [
  z.strictObject({ tool: z.literal('ir_a'), args: z.strictObject({ escena: z.string().min(1) }) }),
  z.strictObject({ tool: z.literal('fijar_variable'), args: z.strictObject({ variable: z.string().min(1), valor: z.number() }) }),
  z.strictObject({ tool: z.literal('correr'), args: vacio }),
  z.strictObject({ tool: z.literal('pausar'), args: vacio }),
  z.strictObject({ tool: z.literal('resaltar'), args: z.strictObject({ parte: z.string().min(1) }) }),
  z.strictObject({
    tool: z.literal('rotar'),
    args: z.strictObject({ yaw: z.number().min(-360).max(360).optional(), pitch: z.number().min(-360).max(360).optional() }),
  }),
  z.strictObject({ tool: z.literal('zoom'), args: z.strictObject({ factor: z.number().positive().max(10) }) }),
  z.strictObject({ tool: z.literal('separar_partes'), args: z.strictObject({ activo: z.boolean() }) }),
  z.strictObject({ tool: z.literal('reiniciar_vista'), args: vacio }),
  z.strictObject({ tool: z.literal('dar_pista'), args: z.strictObject({ nivel: z.number().int().min(1).max(4) }) }), // ladder 1 general .. 4 concrete
  z.strictObject({ tool: z.literal('registrar_hipotesis'), args: z.strictObject({ texto }) }),
  z.strictObject({ tool: z.literal('registrar_conclusion'), args: z.strictObject({ texto }) }),
]);
export type Comando = z.infer<typeof Comando>;
export type NombreHerramienta = Comando['tool'];

export const HERRAMIENTAS = Comando.options.map((o) => o.shape.tool.value) as NombreHerramienta[];

/** JSON Schema of the tool union, for LLM tool calling / structured output. */
export function comandoJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(Comando) as Record<string, unknown>;
}
