import { describe, expect, it } from 'vitest';
import { clasificarIntenciones, type Accion } from './intenciones.ts';

const acciones = (t: string): Accion[] => clasificarIntenciones(t).acciones;
const dialogo = (t: string) => clasificarIntenciones(t).dialogo;

describe('scene navigation', () => {
  it('goes to a scene when a trigger and a scene word are both present', () => {
    expect(acciones('quiero ver el hígado')).toEqual([{ tipo: 'navegar', escena: 'higado' }]);
    expect(acciones('Llévame al intestino')).toEqual([{ tipo: 'navegar', escena: 'intestino' }]);
    expect(acciones('Muéstrame el péndulo')).toEqual([{ tipo: 'navegar', escena: 'pendulo' }]);
    expect(acciones('quiero ver la enzima')).toEqual([{ tipo: 'navegar', escena: 'lactasa' }]);
  });
  it('does not navigate on a scene word alone or on a trigger alone', () => {
    expect(acciones('la enzima se rompe con el calor')).toEqual([]);
    expect(acciones('vamos a probar con la masa')).toEqual([]);
  });
  it('regression: substrings inside other words do not trigger anything ("lleve a", "debe a")', () => {
    expect(acciones('lleve a la clase el intestino de pollo')).toEqual([]);
    expect(acciones('el periodo debe aumentar')).toEqual([]);
  });
});

describe('view and simulation commands', () => {
  it('rotates with degrees and direction', () => {
    expect(acciones('gira 90 grados a la izquierda')).toEqual([{ tipo: 'rotar', yaw: -90 }]);
    expect(acciones('gira')).toEqual([{ tipo: 'rotar', yaw: 45 }]);
  });
  it('zooms in and out', () => {
    expect(acciones('acerca')).toEqual([{ tipo: 'zoom', factor: 1.4 }]);
    expect(acciones('aleja un poco')).toEqual([{ tipo: 'zoom', factor: 0.7 }]);
  });
  it('separates, centers, pauses and runs', () => {
    expect(acciones('separa las partes')).toEqual([{ tipo: 'separar' }]);
    expect(acciones('centra la vista')).toEqual([{ tipo: 'centrar' }]);
    expect(acciones('pausa')).toEqual([{ tipo: 'pausar' }]);
    expect(acciones('detente')).toEqual([{ tipo: 'pausar' }]);
    expect(acciones('corre la simulación')).toEqual([{ tipo: 'correr' }]);
  });
  it('regression: "para la masa" is not a pause and "corrimos" is not a run order', () => {
    expect(acciones('esto es para la masa del péndulo')).toEqual([]);
    expect(acciones('corrimos la simulación dos veces')).toEqual([]);
  });
  it('accumulates several orders in one sentence', () => {
    expect(acciones('llévame al intestino y gíralo')).toEqual([{ tipo: 'navegar', escena: 'intestino' }, { tipo: 'rotar', yaw: 45 }]);
  });
});

describe('setting a variable', () => {
  it('needs an imperative verb, a variable and a number', () => {
    expect(acciones('pon la temperatura en 70')).toEqual([{ tipo: 'fijar_variable', variable: 'temperatura', valor: 70 }]);
    expect(acciones('sube la temperatura a 70 grados')).toEqual([{ tipo: 'fijar_variable', variable: 'temperatura', valor: 70 }]);
    expect(acciones('pon la cuerda en 0,8')).toEqual([{ tipo: 'fijar_variable', variable: 'longitud', valor: 0.8 }]);
  });
  it('takes the final value of "de X a Y"', () => {
    expect(acciones('cambia la longitud de 30 a 60')).toEqual([{ tipo: 'fijar_variable', variable: 'longitud', valor: 60 }]);
  });
  it('a statement with a number is not an order', () => {
    expect(acciones('la cuerda es de 40 cm')).toEqual([]);
    expect(acciones('si cambio la longitud de 30 a 60 cm el periodo aumenta')).toEqual([]);
    expect(acciones('¿qué pasa si pones la temperatura en 90?')).toEqual([]);
  });
});

describe('dialogue intent', () => {
  it('help requests, including "no sé" as a help request but not "no se va a mover"', () => {
    expect(dialogo('dame una pista')).toBe('pedir_pista');
    expect(dialogo('no sé cómo hacerlo')).toBe('pedir_pista');
    expect(dialogo('no entiendo')).toBe('pedir_pista');
    expect(dialogo('no se va a mover igual')).toBe('hipotesis');
  });
  it('asking for the answer is its own intent (the tutor refuses and gives a hint)', () => {
    expect(dialogo('dime la respuesta')).toBe('exige_respuesta');
    expect(dialogo('cuál es la respuesta')).toBe('exige_respuesta');
  });
  it('hypotheses and conclusions', () => {
    expect(dialogo('creo que la masa no influye')).toBe('hipotesis');
    expect(dialogo('si alargo la cuerda tarda más')).toBe('hipotesis');
    expect(dialogo('entonces la longitud cambia el tiempo')).toBe('conclusion');
    expect(dialogo('en conclusión la masa no importa')).toBe('conclusion');
  });
  it('questions are not hypotheses', () => {
    expect(dialogo('¿qué pasaría si caliento la leche?')).toBe('pregunta');
    expect(dialogo('qué pasa si la masa es mayor')).toBe('pregunta');
  });
  it('identity, comparison with the model and greetings', () => {
    expect(dialogo('¿eres un humano?')).toBe('identidad');
    expect(dialogo('eres una persona real')).toBe('identidad');
    expect(dialogo('mi dato salió diferente al del modelo')).toBe('compara_modelo');
    expect(dialogo('hola')).toBe('saludo');
  });
  it('an order with no dialogue content is an "accion"', () => {
    expect(dialogo('gira')).toBe('accion');
  });
  it('unintelligible text is "no_entendi", never a guess', () => {
    expect(dialogo('asdfgh qwer')).toBe('no_entendi');
    expect(dialogo('')).toBe('no_entendi');
  });
});
