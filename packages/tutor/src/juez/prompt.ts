/**
 * Rubric-anchored prompt for an LLM judge (used by @rikuy/ai adapters). Same shape as
 * `buildJudgePrompt` of Educacion/web/src/lib/judge/rubric.ts: every level, two examples per level,
 * a literal quote, and "NO" for what cannot be assessed. The LLM only proposes; the code validates.
 */
import type { Indicador } from '@rikuy/contracts';
import type { SolicitudJuez } from './tipos.ts';

type Fila = readonly [nivel: string, descripcion: string, ejemplos: readonly [string, string]];

const RUBRICAS: Record<Indicador, { titulo: string; filas: readonly Fila[] }> = {
  variable: {
    titulo: 'VARIABLE (qué cosa cambia o se controla)',
    filas: [
      ['0', 'no nombra ninguna variable.', ['"voy a ver qué pasa"', '"no sé"']],
      ['1', 'nombra algo que no es una variable de esta práctica.', ['"la temperatura cambia todo" (en el péndulo)', '"el color de la cuerda"']],
      ['2', 'nombra una variable de la práctica.', ['"cambiar la cuerda"', '"la longitud"']],
      ['3', 'nombra la variable y dice qué se mantiene igual o da un valor.', ['"cambio solo la longitud y dejo la masa igual"', '"pruebo con 30 y con 60 cm"']],
      ['NO', 'no hay evidencia suficiente (vacío, ininteligible).', ['""', '"¿qué?"']],
    ],
  },
  prediccion: {
    titulo: 'PREDICCIÓN (qué resultado espera)',
    filas: [
      ['0', 'no predice nada.', ['"la cuerda es verde"', '"no sé"']],
      ['1', 'dice que algo influye o cambia, sin decir en qué dirección.', ['"la cuerda influye"', '"va a pasar algo"']],
      ['2', 'dice la dirección del cambio.', ['"tardará más"', '"la masa no cambia el periodo"']],
      ['3', 'dirección, variable y condición o valor.', ['"si alargo la cuerda el péndulo tarda más"', '"con 60 cm tardará más que con 30"']],
      ['NO', 'no hay evidencia suficiente.', ['""', '"¿otra vez?"']],
    ],
  },
  justificacion: {
    titulo: 'JUSTIFICACIÓN (por qué lo cree)',
    filas: [
      ['0', 'no da razón.', ['"porque sí"', '"no sé"']],
      ['1', 'da una razón mínima sin explicar.', ['"porque pesa"', '"porque es así"']],
      ['2', 'da una razón conectada con la situación.', ['"porque la cuerda es larga"', '"porque hay menos aire"']],
      ['3', 'la razón usa un concepto científico.', ['"porque recorre más distancia"', '"porque la enzima es una proteína y se deforma"']],
      ['NO', 'no hay evidencia suficiente.', ['""', '"¿qué?"']],
    ],
  },
  uso_del_dato: {
    titulo: 'USO DEL DATO (usa lo que midió el grupo)',
    filas: [
      ['0', 'no usa sus mediciones.', ['"la cuerda larga tarda más"', '"es lo que dice el profe"']],
      ['1', 'menciona sus mediciones sin dar valores.', ['"según lo que medimos"', '"en la tabla salió"']],
      ['2', 'cita un valor propio de una condición.', ['"con 0,9 m tardó 1,9 s"', '"nos salió 1,5"']],
      ['3', 'compara valores propios de dos condiciones.', ['"con 0,3 m 1,1 s y con 0,9 m 1,9 s"', '"de 30 a 90 cm subió de 1,1 a 1,9"']],
      ['NO', 'el grupo no tiene mediciones, o no hay evidencia.', ['""', '"¿qué?"']],
    ],
  },
  conclusion_coherente: {
    titulo: 'CONCLUSIÓN COHERENTE (concuerda con los datos del propio grupo)',
    filas: [
      ['0', 'afirma lo contrario de lo que muestran sus datos.', ['"la cuerda no cambia nada" (con datos que crecen)', '"a mayor longitud menor periodo" (con datos que crecen)']],
      ['1', 'no afirma una relación comprobable.', ['"fue divertido medir"', '"el péndulo se mueve"']],
      ['2', 'afirma una relación que concuerda con sus datos.', ['"a mayor longitud mayor periodo"', '"la masa no cambia el periodo" (con datos planos)']],
      ['3', 'concuerda y se apoya en valores propios.', ['"a mayor longitud mayor periodo: con 0,3 m 1,1 s y con 0,9 m 1,9 s"', '"mis datos muestran que sube"']],
      ['NO', 'sin datos suficientes, o habla de una variable que el grupo no varió.', ['""', '"la masa no influye" (el grupo solo cambió la longitud)']],
    ],
  },
};

export function construirPromptJuez(s: SolicitudJuez): { system: string; user: string } {
  const r = RUBRICAS[s.indicador];
  const rubrica = [
    `Rúbrica ${r.titulo}:`,
    ...r.filas.flatMap(([nivel, desc, ej]) => [`Nivel ${nivel}: ${desc}`, `  Ejemplo: ${ej[0]}`, `  Ejemplo: ${ej[1]}`]),
  ].join('\n');
  const system = [
    'Eres un evaluador de indagación científica para estudiantes de 2.º de secundaria en Perú.',
    'Puntúas UNA respuesta transcrita según la rúbrica. No corriges ortografía ni forma de hablar, no juzgas el acento y no infieres emociones.',
    'La transcripción puede tener errores; sé tolerante con ellos.',
    rubrica,
    'Devuelve el nivel ("0", "1", "2", "3" o "NO") y una cita textual corta, copiada exactamente de la respuesta del estudiante, que justifique el nivel. Si no hay cita literal posible, el criterio no cuenta. "NO" nunca es un cero.',
  ].join('\n\n');
  const vars = s.contexto.variables.map((v) => v.etiqueta ?? v.id).join(', ');
  const user = [
    `<variables_de_la_practica>${vars}</variables_de_la_practica>`,
    `<variable_que_el_grupo_vario>${s.contexto.variableProbada}</variable_que_el_grupo_vario>`,
    s.datos.length ? `<datos_del_grupo>${s.datos.map((d) => `${d.x}:${d.y}`).join('; ')}</datos_del_grupo>` : '',
    `<respuesta_del_estudiante>\n${s.respuesta}\n</respuesta_del_estudiante>`,
  ]
    .filter(Boolean)
    .join('\n\n');
  return { system, user };
}
