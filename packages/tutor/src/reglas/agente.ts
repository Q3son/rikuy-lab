/**
 * Rules agent of the tutor: works offline, without an LLM, and never gives the answer.
 *
 * Ported and refactored from the team's own Rikuy Lab `rulesAgent.ts` (packages/core): same Socratic
 * replies, now with word-bounded intents, an explicit hint ladder, the honesty policy (announce in the
 * future, confirm only on the tool's result), the kill switch and command validation. The "director
 * proposes, code validates" idea and the honesty contract follow paoloose/aulaquipu
 * (apps/web-app/lib/director.ts and the tutor agent instructions).
 */
import type { AccionApoyo, Comando, EstadoApoyo, FuenteIA, MemoriaEntrada, Practica } from '@rikuy/contracts';
import { politicaApoyo, FRASES_APOYO } from '../apoyo.ts';
import { elegirPista, MAX_PELDANOS, type EstadoEscalera, type Reservados } from '../escalera.ts';
import { FRASE_IDENTIDAD, FRASE_NO_ENTENDI, anunciar, confirmar, type ResultadoComando } from '../honestidad.ts';
import { analizarRazonamiento } from '../indicios.ts';
import { clasificarIntenciones, type Accion } from '../intenciones.ts';
import { insigniaFuente, type Insignia } from '../fuente.ts';
import { lexicoDeContexto } from '../juez/comun.ts';
import { validarComandos } from '../validar.ts';
import { frasePrevia, peldanoInicial } from './recuerdos.ts';

export type PracticaAgente = Pick<Practica, 'preguntaGuia' | 'pistas' | 'limitaciones' | 'variables'> & { reservados: Reservados };

export interface ContextoAgente {
  practica: PracticaAgente;
  /** Scene registry of the viewer. */
  escenas: readonly string[];
  escalera: EstadoEscalera;
  /** From `ConsultaMemoria.recuperar` (at most 5 are used). */
  recuerdos?: readonly MemoriaEntrada[];
  /** Coarse support state, only when the signals flag is on. Never changes an evidence or a level. */
  estadoApoyo?: EstadoApoyo;
  /** Result of the kill switch for this group. Default true. */
  tutorActivo?: boolean;
}

export type TipoTurno = 'pregunta' | 'hipotesis' | 'conclusion' | 'accion' | 'pista' | 'rechazo';

export type RespuestaTutor =
  | { tipo: 'silencio' }
  | {
      tipo: 'respuesta';
      /** What is shown BEFORE the tools run: future tense, no completed-action claim. */
      texto: string;
      comandos: Comando[];
      kind: TipoTurno;
      fuente: FuenteIA;
      insignia: Insignia;
      apoyo: AccionApoyo;
      /** What to show AFTER the viewer answered for each command. */
      confirmar(resultados: readonly ResultadoComando[]): string;
    };

function aComando(a: Accion): Comando {
  switch (a.tipo) {
    case 'navegar':
      return { tool: 'ir_a', args: { escena: a.escena } };
    case 'rotar':
      return { tool: 'rotar', args: { yaw: a.yaw } };
    case 'zoom':
      return { tool: 'zoom', args: { factor: a.factor } };
    case 'separar':
      return { tool: 'separar_partes', args: { activo: true } };
    case 'centrar':
      return { tool: 'reiniciar_vista', args: {} };
    case 'pausar':
      return { tool: 'pausar', args: {} };
    case 'correr':
      return { tool: 'correr', args: {} };
    case 'fijar_variable':
      return { tool: 'fijar_variable', args: { variable: a.variable, valor: a.valor } };
  }
}

const MENSAJE_POR_CODIGO: Partial<Record<string, string>> = {
  escena_inexistente: 'No tengo esa escena en esta práctica.',
  variable_ajena: 'Esa variable no es de esta práctica.',
};

export function turnoReglas(texto: string, ctx: ContextoAgente): RespuestaTutor {
  if (ctx.tutorActivo === false) return { tipo: 'silencio' };

  const recuerdos = (ctx.recuerdos ?? []).slice(0, 5);
  const escalera: EstadoEscalera = { ...ctx.escalera, inicial: ctx.escalera.inicial ?? peldanoInicial(recuerdos) };
  const lexico = lexicoDeContexto({ variables: ctx.practica.variables.map((v) => ({ id: v.id, etiqueta: v.etiqueta })), variableProbada: '' });
  const { acciones, dialogo } = clasificarIntenciones(texto, { lexicoVariables: lexico });
  const razonamiento = analizarRazonamiento(texto, { lexicoExtra: lexico });

  let comandos: Comando[] = acciones.map(aComando);
  const partes: string[] = [];
  let kind: TipoTurno = 'pregunta';
  const previa = frasePrevia(recuerdos);

  switch (dialogo) {
    case 'pedir_pista':
    case 'exige_respuesta': {
      const pista = elegirPista(ctx.practica, escalera, ctx.practica.reservados);
      comandos = [...comandos, { tool: 'dar_pista', args: { nivel: pista.nivel } }];
      kind = dialogo === 'exige_respuesta' ? 'rechazo' : 'pista';
      partes.push(dialogo === 'exige_respuesta' ? 'No te voy a dar la respuesta, pero sí una pista:' : 'Te doy una pista, no la respuesta:');
      partes.push(pista.texto);
      if (pista.agotada) partes.push(`Ya usaste las ${MAX_PELDANOS} pistas. Mira tus mediciones o pídele ayuda a tu docente.`);
      break;
    }
    case 'identidad':
      kind = 'rechazo';
      partes.push(FRASE_IDENTIDAD);
      break;
    case 'compara_modelo':
      partes.push(`Recuerda que el modelo simplifica: ${ctx.practica.limitaciones[0] ?? 'es una aproximación.'}`);
      partes.push('¿Qué crees que explica la diferencia entre tu dato y el modelo?');
      break;
    case 'conclusion':
      kind = 'conclusion';
      comandos = [...comandos, { tool: 'registrar_conclusion', args: { texto: texto.slice(0, 500) } }];
      partes.push('¿Coincide con lo que predijiste al inicio? ¿Qué cambiarías?');
      break;
    case 'hipotesis':
      kind = 'hipotesis';
      comandos = [...comandos, { tool: 'registrar_hipotesis', args: { texto: texto.slice(0, 500) } }];
      partes.push(razonamiento.justificacion ? '¡Buena hipótesis! Pruébala: cambia la variable y observa.' : '¿Por qué crees que pasaría eso?');
      break;
    case 'saludo':
      partes.push('Hola, soy Rikuy.', previa || ctx.practica.preguntaGuia);
      break;
    case 'pregunta':
      partes.push(razonamiento.variables.length >= 2 ? 'Estás conectando dos ideas, eso es pensar como científico.' : 'Buena pregunta.', previa || ctx.practica.preguntaGuia);
      break;
    case 'accion':
      kind = 'accion';
      if (comandos.some((c) => c.tool === 'fijar_variable')) partes.push('Antes de ver el resultado: ¿qué esperas que pase?');
      break;
    case 'no_entendi':
      kind = 'rechazo';
      partes.push(FRASE_NO_ENTENDI);
      break;
  }

  // The code decides: nothing is announced unless the validator lets it pass.
  let anuncio = '';
  if (comandos.length > 0) {
    const v = validarComandos(comandos, {
      escenas: ctx.escenas,
      variables: ctx.practica.variables.map((x) => ({ id: x.id, min: x.min, max: x.max })),
      escalera,
      peldanos: Math.min(MAX_PELDANOS, ctx.practica.pistas.length),
    });
    if (v.ok) {
      comandos = v.valor;
      anuncio = anunciar(comandos.filter((c) => c.tool !== 'dar_pista'));
    } else {
      comandos = [];
      kind = 'rechazo';
      partes.length = 0;
      partes.push(`No puedo hacerlo: ${v.error.map((e) => MENSAJE_POR_CODIGO[e.codigo] ?? e.detalle).join(' ')}`);
    }
  }

  const apoyo = politicaApoyo(ctx.estadoApoyo);
  const salida = [anuncio, ...partes, FRASES_APOYO[apoyo]].filter(Boolean).join(' ');
  return {
    tipo: 'respuesta',
    texto: salida,
    comandos,
    kind,
    fuente: 'reglas',
    insignia: insigniaFuente('reglas'),
    apoyo,
    confirmar,
  };
}
