/**
 * Agente de reglas: funciona sin internet y sin LLM.
 *
 * Es el respaldo cuando no hay red ni GPU. Entiende órdenes simples
 * ("quiero ver el hígado", "sube la temperatura a 70") y responde con
 * preguntas socráticas predefinidas: nunca entrega la conclusión.
 */
import type { Command } from './tools.ts';
import { normalize, analyzeUtterance } from './analytics.ts';
import { CONCEPTS, practiceById } from './curriculum.ts';

export interface AgentContext {
  practica: string;
  escena: string;
  pistasUsadas: number;
  variables: Record<string, number>;
}

export interface AgentReply {
  reply: string;
  commands: Command[];
  /** Tipo de turno según el agente, para la analítica. */
  kind: 'pregunta' | 'hipotesis' | 'conclusion' | 'accion';
  source: 'reglas' | 'llm';
}

const SCENE_WORDS: Array<[RegExp, string]> = [
  [/higado/, 'higado'],
  [/lobulillo|lobulo|hepatocito/, 'lobulillo'],
  [/pulmon|respirat|respir|diafragma/, 'respiratorio'],
  [/lactasa|enzima|lactosa/, 'lactasa'],
  [/enterocito|celula intestinal|borde en cepillo/, 'enterocito'],
  [/vellosidad/, 'vellosidad'],
  [/intestino/, 'intestino'],
  [/digest/, 'digestivo'],
  [/pendulo|columpio/, 'pendulo'],
];

const VARIABLE_WORDS: Array<[RegExp, string]> = [
  [/temperatura|grados|caliento|calentar|calor/, 'temperatura'],
  [/\bph\b|acidez|acido/, 'ph'],
  [/longitud|cuerda|largo/, 'longitud'],
  [/masa|peso/, 'masa'],
  [/gravedad/, 'gravedad'],
  [/altitud|altura|msnm/, 'altitud'],
];

export function rulesAgent(text: string, ctx: AgentContext): AgentReply {
  const t = normalize(text);
  const commands: Command[] = [];
  const analysis = analyzeUtterance(text);
  const practice = practiceById.get(ctx.practica);

  // 1) Navegación por escenas y 2) manipulación de la vista.
  //    Se acumulan para entender frases como "llévame al intestino y gíralo".
  const replies: string[] = [];
  if (/(quiero ver|muestra|ensena|ve a|ir a|vamos a|llevame|lleva|entra|entremos|transforma|como es|que forma|ver el|ver la|abre)/.test(t)) {
    for (const [re, scene] of SCENE_WORDS) {
      if (re.test(t)) {
        commands.push({ tool: 'ir_a', args: { escena: scene } });
        const label = CONCEPTS.find((c) => c.sceneId === scene)?.label ?? scene;
        replies.push(`Aquí está: ${label}. Antes de explicarte, ¿qué parte te llama más la atención y por qué?`);
        break;
      }
    }
  }
  if (/(gira|rota|voltea|da la vuelta)/.test(t)) {
    const deg = Number(t.match(/(\d+)\s*grados/)?.[1] ?? 45);
    commands.push({ tool: 'rotar', args: { yaw: /izquierda/.test(t) ? -deg : deg } });
    if (!replies.length) replies.push('Girando. ¿Qué ves ahora que antes no veías?');
  }
  if (/(acerca|zoom|amplia|agranda)/.test(t)) {
    commands.push({ tool: 'zoom', args: { factor: 1.4 } });
    if (!replies.length) replies.push('Acercando.');
  } else if (/(aleja|achica)/.test(t)) {
    commands.push({ tool: 'zoom', args: { factor: 0.7 } });
    if (!replies.length) replies.push('Alejando.');
  }
  if (/(separa|explota|desarma)/.test(t)) {
    commands.push({ tool: 'separar_partes', args: { activo: true } });
    if (!replies.length) replies.push('Separé las partes. ¿Cuál crees que hace el trabajo principal?');
  }
  if (/(centra|reinicia la vista|vista inicial)/.test(t)) {
    commands.push({ tool: 'reiniciar_vista', args: {} });
    if (!replies.length) replies.push('Vista centrada.');
  }
  if (/(pausa|deten|para la)/.test(t)) {
    commands.push({ tool: 'pausar', args: {} });
    if (!replies.length) replies.push('Pausado.');
  } else if (/(corre |correr|inicia|empieza|simula|dale)/.test(t + ' ')) {
    commands.push({ tool: 'correr', args: {} });
    if (!replies.length) replies.push('Corriendo la simulación. Observa con atención y compárala con lo que predijiste.');
  }
  if (commands.length && (!/\d/.test(t) || commands.some((c) => c.tool === 'rotar'))) return act(commands, replies[0] ?? 'Listo.');

  // 3) Cambio de variable con número ("pon la temperatura en 70")
  const num = t.match(/(-?\d+(?:[.,]\d+)?)/);
  if (num) {
    for (const [re, variable] of VARIABLE_WORDS) {
      if (re.test(t)) {
        const valor = parseFloat(num[1].replace(',', '.'));
        commands.push({ tool: 'fijar_variable', args: { variable, valor } }, { tool: 'correr', args: {} });
        return {
          reply: `Listo, ${variable} en ${valor}. Antes de mirar el resultado: ¿qué esperas que pase?`,
          commands,
          kind: 'accion',
          source: 'reglas',
        };
      }
    }
  }

  // 4) Pedido de ayuda: pistas progresivas, nunca la respuesta
  if (/(pista|ayuda|no se|no entiendo|me rindo|la respuesta|cual es la respuesta|no me sale)/.test(t)) {
    const nivel = Math.min(3, ctx.pistasUsadas + 1);
    const hint = practice?.hints[nivel - 1] ?? 'Intenta cambiar una sola variable y observar qué pasa.';
    return { reply: `Te doy una pista, no la respuesta: ${hint}`, commands: [{ tool: 'dar_pista', args: { nivel } }], kind: 'pregunta', source: 'reglas' };
  }

  // 5) Hipótesis: el agente la registra y pide justificar o probar
  if (analysis.tipo_pregunta === 'hipotetica' || /^(creo que|pienso que|yo digo que|seguro que)/.test(t)) {
    commands.push({ tool: 'registrar_hipotesis', args: { texto: text } });
    const r = analysis.rubrica;
    const followUp = !r || r.justificacion === 0
      ? '¿Por qué crees que pasaría eso?'
      : '¡Buena hipótesis! Pruébala: cambia la variable y observa.';
    return { reply: `Anoté tu hipótesis. ${followUp}`, commands, kind: 'hipotesis', source: 'reglas' };
  }

  // 6) Conclusión
  if (/^(entonces|concluyo|en conclusion|ya entendi|o sea que)/.test(t)) {
    commands.push({ tool: 'registrar_conclusion', args: { texto: text } });
    return { reply: 'Guardé tu conclusión. ¿Coincide con lo que predijiste al inicio? ¿Qué cambiarías?', commands, kind: 'conclusion', source: 'reglas' };
  }

  // 7) Pregunta abierta: devolver con otra pregunta
  const relational = analysis.relacional
    ? 'Estás conectando dos sistemas distintos, eso es pensar como científico. '
    : '';
  return {
    reply: `${relational}Buena pregunta. ${practice?.guidingQuestion ?? '¿Qué crees tú que pasa?'}`,
    commands,
    kind: 'pregunta',
    source: 'reglas',
  };

  function act(cmds: Command[], reply: string): AgentReply {
    return { reply, commands: cmds, kind: 'accion', source: 'reglas' };
  }
}
