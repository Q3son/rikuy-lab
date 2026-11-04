/**
 * Herramientas del agente: es el contrato entre la IA y la escena 3D.
 *
 * El agente nunca "dibuja": decide qué herramienta llamar y el visor la
 * ejecuta. Así la misma lista sirve para el LLM en la nube, el modelo local
 * y el agente de reglas sin conexión.
 */

export type Command =
  | { tool: 'ir_a'; args: { escena: string } }
  | { tool: 'fijar_variable'; args: { variable: string; valor: number } }
  | { tool: 'correr'; args: Record<string, never> }
  | { tool: 'pausar'; args: Record<string, never> }
  | { tool: 'resaltar'; args: { parte: string } }
  | { tool: 'rotar'; args: { yaw?: number; pitch?: number } }
  | { tool: 'zoom'; args: { factor: number } }
  | { tool: 'separar_partes'; args: { activo: boolean } }
  | { tool: 'reiniciar_vista'; args: Record<string, never> }
  | { tool: 'dar_pista'; args: { nivel: number } }
  | { tool: 'registrar_hipotesis'; args: { texto: string } }
  | { tool: 'registrar_conclusion'; args: { texto: string } };

export type ToolName = Command['tool'];

export interface ToolSpec {
  name: ToolName;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const AGENT_TOOLS: ToolSpec[] = [
  {
    name: 'ir_a',
    description: 'Transforma el holograma en otra escena del catálogo (viaje multiescala). Solo escenas existentes.',
    input_schema: {
      type: 'object',
      properties: { escena: { type: 'string', enum: ['digestivo', 'intestino', 'vellosidad', 'enterocito', 'lactasa', 'respiratorio', 'higado', 'lobulillo', 'pendulo'] } },
      required: ['escena'],
    },
  },
  {
    name: 'fijar_variable',
    description: 'Cambia una variable del experimento actual (temperatura, ph, longitud, masa, gravedad, altitud).',
    input_schema: {
      type: 'object',
      properties: { variable: { type: 'string' }, valor: { type: 'number' } },
      required: ['variable', 'valor'],
    },
  },
  { name: 'correr', description: 'Inicia o reanuda la simulación.', input_schema: { type: 'object', properties: {} } },
  { name: 'pausar', description: 'Pausa la simulación.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'resaltar',
    description: 'Resalta una parte de la escena actual (por ejemplo sitio_activo, enlace, cuerda).',
    input_schema: { type: 'object', properties: { parte: { type: 'string' } }, required: ['parte'] },
  },
  {
    name: 'rotar',
    description: 'Gira el holograma. yaw y pitch en grados.',
    input_schema: { type: 'object', properties: { yaw: { type: 'number' }, pitch: { type: 'number' } } },
  },
  {
    name: 'zoom',
    description: 'Acerca (>1) o aleja (<1) el holograma.',
    input_schema: { type: 'object', properties: { factor: { type: 'number' } }, required: ['factor'] },
  },
  {
    name: 'separar_partes',
    description: 'Vista explosionada de las partes del modelo.',
    input_schema: { type: 'object', properties: { activo: { type: 'boolean' } }, required: ['activo'] },
  },
  { name: 'reiniciar_vista', description: 'Vuelve la cámara y la escala a su estado inicial.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'dar_pista',
    description: 'Muestra una pista progresiva de la práctica (1 = general, 3 = concreta). Nunca da la respuesta.',
    input_schema: { type: 'object', properties: { nivel: { type: 'number' } }, required: ['nivel'] },
  },
  {
    name: 'registrar_hipotesis',
    description: 'Guarda la hipótesis que formuló el alumno, con sus palabras.',
    input_schema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
  },
  {
    name: 'registrar_conclusion',
    description: 'Guarda la conclusión que formuló el alumno, con sus palabras.',
    input_schema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
  },
];

export const SCENE_IDS = ['digestivo', 'intestino', 'vellosidad', 'enterocito', 'lactasa', 'respiratorio', 'higado', 'lobulillo', 'pendulo'] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export function isSceneId(x: string): x is SceneId {
  return (SCENE_IDS as readonly string[]).includes(x);
}
