/**
 * Mock of the `ModeloTutor` port (owned by F4 in @rikuy/tutor). Deterministic Socratic rules:
 * it always asks, never gives the numeric answer, and says it is "reglas" (honesty badge).
 * The shape is a proposal (PROPUESTAS_CONTRATOS.md) until F4 publishes the real port.
 */
import type { Comando, FuenteIA } from '@rikuy/contracts';

export type EntradaTutor =
  | { momento: 'prediccion'; texto: string }
  | { momento: 'medicion'; longitudM: number }
  | { momento: 'comparacion'; errorMedio: number }
  | { momento: 'conclusion'; texto: string };

export interface RespuestaTutor {
  texto: string;
  fuente: FuenteIA;
  comandos: Comando[];
}

export interface ModeloTutor {
  responder(entrada: EntradaTutor): Promise<RespuestaTutor>;
}

export class ModeloTutorSimulado implements ModeloTutor {
  async responder(e: EntradaTutor): Promise<RespuestaTutor> {
    switch (e.momento) {
      case 'prediccion':
        return {
          texto: /larg|cuerda|longitud/i.test(e.texto)
            ? '¿Cómo vas a comprobarlo? ¿Qué vas a dejar igual mientras cambias el largo?'
            : '¿Qué cosa del péndulo vas a cambiar para comprobarlo?',
          fuente: 'reglas',
          comandos: [{ tool: 'registrar_hipotesis', args: { texto: e.texto.slice(0, 500) || '—' } }],
        };
      case 'medicion':
        return {
          texto: '¿Por qué crees que conviene contar diez idas y vueltas y no solo una?',
          fuente: 'reglas',
          comandos: [{ tool: 'fijar_variable', args: { variable: 'longitud', valor: e.longitudM } }],
        };
      case 'comparacion':
        return {
          texto:
            e.errorMedio < 0.1
              ? '¿Tus datos están cerca de la curva del modelo? ¿Qué dice eso de tu predicción?'
              : '¿Qué pudo hacer que tus datos se alejen del modelo? ¿Cómo soltaron la piedra?',
          fuente: 'reglas',
          comandos: [{ tool: 'correr', args: {} }],
        };
      case 'conclusion':
        return {
          texto: '¿Qué dato tuyo muestra lo que dices? ¿Pasaría lo mismo con una piedra más pesada?',
          fuente: 'reglas',
          comandos: [{ tool: 'registrar_conclusion', args: { texto: e.texto.slice(0, 500) || '—' } }],
        };
    }
  }
}
