import { describe, expect, it } from 'vitest';
import { GUIONES } from './guiones.ts';
import { iniciarConversacion, leerNumero, leerOrdenes, normalizar, preguntaActual, responder, type EstadoConversacion, type TurnoConversacion } from './motor.ts';

/** Corre una conversación completa y devuelve todos los turnos. */
function conversar(practica: string, frases: string[]): TurnoConversacion[] {
  let estado: EstadoConversacion = iniciarConversacion(practica);
  const turnos: TurnoConversacion[] = [];
  for (const f of frases) {
    const r = responder(f, estado);
    turnos.push(r);
    estado = r.estado;
  }
  return turnos;
}

describe('conversación del péndulo (guion de la demo ante el jurado)', () => {
  it('recorre todo el guion con respuestas correctas y termina', () => {
    const t = conversar('pendulo', [
      'hola rikuy',
      'más lento',
      'porque recorre un arco más grande',
      'no cambia, es igual',
      'el rozamiento con el aire',
      'alargaría la cuerda',
      'depende de la longitud de la cuerda y no de la masa',
    ]);
    expect(t[0]!.texto).toContain('¿oscilará más rápido o más lento?');
    expect(t.slice(1).every((x) => x.evento.veredicto === 'correcto')).toBe(true);
    expect(t.at(-1)!.estado.fase).toBe('fin');
  });

  it('después de una pista, la respuesta se evalúa y NO se repite la pregunta guía', () => {
    const t = conversar('pendulo', ['hola', 'no sé', 'creo que más lento']);
    expect(t[1]!.evento.tipo).toBe('pista');
    expect(t[1]!.texto).toContain('Pista 1');
    expect(t[2]!.evento.veredicto).toBe('correcto');
    expect(t[2]!.estado.paso).toBe(1);
    expect(t[2]!.texto).not.toContain('¿oscilará más rápido o más lento?');
  });

  it('"no sé" varias veces da pistas graduales y luego explica y avanza (nunca se traba)', () => {
    const t = conversar('pendulo', ['hola', 'no sé', 'ni idea', 'no sé', 'no sé']);
    expect(t.slice(1, 4).map((x) => x.evento.tipo)).toEqual(['pista', 'pista', 'pista']);
    expect(t[4]!.evento.tipo).toBe('explicacion');
    expect(t[4]!.estado.paso).toBe(1);
  });

  it('una predicción equivocada invita a probar con una orden concreta', () => {
    const t = conversar('pendulo', ['hola', 'más rápido']);
    expect(t[1]!.evento.veredicto).toBe('error');
    expect(t[1]!.texto).toContain('pon la longitud en 2 metros');
    expect(t[1]!.estado.paso).toBe(0);
  });

  it('la orden de la prueba mueve el holograma y recuerda la pregunta abierta', () => {
    const t = conversar('pendulo', ['hola', 'más rápido', 'pon la longitud en 2 metros', 'ahora va más lento']);
    expect(t[2]!.ordenes).toEqual([{ type: 'variable', variable: 'longitud', value: 2 }]);
    expect(t[2]!.texto).toContain('Listo: longitud en 2 m.');
    expect(t[3]!.evento.veredicto).toBe('correcto');
  });

  it('el error frecuente de la masa no se acepta y se corrige con evidencia', () => {
    let estado: EstadoConversacion = { ...iniciarConversacion('pendulo'), fase: 'paso', paso: 2 };
    const r1 = responder('la más pesada va más rápido', estado);
    expect(r1.evento.veredicto).toBe('error');
    estado = r1.estado;
    const r2 = responder('pon la masa en 2', estado);
    expect(r2.ordenes[0]).toEqual({ type: 'variable', variable: 'masa', value: 2 });
    const r3 = responder('sale casi igual, no depende de la masa', r2.estado);
    expect(r3.evento.veredicto).toBe('correcto');
  });

  it('respuestas que no entiende: reformula y, a la segunda, da una pista (nunca un bucle)', () => {
    const t = conversar('pendulo', ['hola', 'banana', 'mmm', 'qwerty', 'zzz', 'asdf']);
    expect(t[1]!.evento.tipo).toBe('no_entendi');
    expect(t[1]!.texto).toContain('"no sé"');
    expect(t[2]!.evento.tipo).toBe('pista');
    // Nunca dos respuestas idénticas seguidas y, tarde o temprano, avanza.
    for (let i = 1; i < t.length; i++) expect(t[i]!.texto).not.toBe(t[i - 1]!.texto);
    expect(t.some((x) => x.estado.paso > 0)).toBe(true);
  });

  it('define palabras sin dar la respuesta y vuelve a la pregunta', () => {
    const t = conversar('lactasa', ['hola', '¿qué es la lactasa?']);
    expect(t[1]!.texto).toContain('La lactasa es una enzima');
    expect(t[1]!.texto).toContain('¿');
    expect(t[1]!.estado.paso).toBe(0);
  });

  it('"por el viento" cuenta como rozamiento', () => {
    const e = { ...iniciarConversacion('pendulo'), fase: 'paso' as const, paso: 3 };
    expect(responder('por el viento', e).evento.veredicto).toBe('correcto');
  });

  it('"repite" repite la pregunta abierta y "dime la respuesta" da pista, no respuesta', () => {
    const t = conversar('pendulo', ['hola', 'repite', 'dime la respuesta']);
    expect(t[1]!.texto).toBe(preguntaActual(t[0]!.estado));
    expect(t[2]!.texto).toContain('No te voy a dar la respuesta');
    expect(t[2]!.evento.tipo).toBe('pista');
  });

  it('tras tres intentos equivocados explica y avanza', () => {
    const t = conversar('pendulo', ['hola', 'más rápido', 'más rápido', 'más rápido']);
    expect(t[3]!.evento.tipo).toBe('explicacion');
    expect(t[3]!.estado.paso).toBe(1);
  });

  it('nunca devuelve un texto vacío ni lanza con entradas raras', () => {
    let estado = iniciarConversacion('pendulo');
    for (const f of ['', '   ', '???', '123', 'pon la longitud en 999', 'NO SÉ!!!', 'sí', 'empezar de nuevo', 'é'.repeat(300)]) {
      const r = responder(f, estado);
      expect(r.texto.trim().length).toBeGreaterThan(0);
      estado = r.estado;
    }
  });

  it('acepta muchas formas de decir lo correcto (entrenamiento de frases)', () => {
    const paso0 = { ...iniciarConversacion('pendulo'), fase: 'paso' as const, paso: 0 };
    for (const f of ['más lento', 'mas lento', 'va lento', 'tarda más', 'se demora más', 'más despacio', 'demora más tiempo', 'yo creo que va más lento']) {
      expect(responder(f, paso0).evento.veredicto, f).toBe('correcto');
    }
    const paso2 = { ...paso0, paso: 2 };
    for (const f of ['no cambia', 'es igual', 'lo mismo', 'no depende de la masa', 'da igual', 'no influye', 'tarda el mismo tiempo']) {
      expect(responder(f, paso2).evento.veredicto, f).toBe('correcto');
    }
    const paso4 = { ...paso0, paso: 4 };
    for (const f of ['alargar la cuerda', 'le pondría una cuerda más larga', 'aumentar la longitud', 'la haría más larga']) {
      expect(responder(f, paso4).evento.veredicto, f).toBe('correcto');
    }
  });
});

describe('conversación de la lactasa', () => {
  it('"se rompe la lactosa" avanza a qué azúcares quedan, y luego sigue sin bucle', () => {
    const t = conversar('lactasa', ['hola', 'la rompe', 'no sé', 'glucosa', 'y galactosa']);
    expect(t[1]!.evento.veredicto).toBe('correcto');
    expect(t[1]!.texto).toContain('¿qué dos azúcares quedan?');
    expect(t[2]!.evento.tipo).toBe('pista');
    expect(t[3]!.evento.veredicto).toBe('parcial');
    expect(t[4]!.evento.veredicto).toBe('correcto');
    expect(t[4]!.estado.paso).toBe(2);
  });

  it('recorre el guion completo', () => {
    const t = conversar('lactasa', [
      'hola',
      'la separa en dos',
      'glucosa y galactosa',
      'se deforma y deja de funcionar',
      'porque la lactosa ya no encaja en el sitio activo',
      'le duele la barriga y tiene gases',
      'el calor cambia la forma de la proteína',
    ]);
    expect(t.at(-1)!.estado.fase).toBe('fin');
  });
});

describe('lectura de órdenes y números', () => {
  it('lee números dichos en voz', () => {
    expect(leerNumero(normalizar('pon la longitud en uno y medio'))).toBe(1.5);
    expect(leerNumero(normalizar('setenta grados'))).toBe(70);
    expect(leerNumero(normalizar('1,2 metros'))).toBe(1.2);
  });
  it('centímetros a metros y límites del laboratorio', () => {
    expect(leerOrdenes(normalizar('pon la cuerda en 50 centímetros')).ordenes[0]).toEqual({ type: 'variable', variable: 'longitud', value: 0.5 });
    expect(leerOrdenes(normalizar('pon la longitud en 999')).ordenes[0]).toEqual({ type: 'variable', variable: 'longitud', value: 2.5 });
  });
  it('una condicional no es una orden', () => {
    expect(leerOrdenes(normalizar('si alargo la cuerda a 2 metros va más lento')).ordenes).toEqual([]);
  });
  it('suelta, pausa y rozamiento', () => {
    expect(leerOrdenes(normalizar('suéltalo')).ordenes).toEqual([{ type: 'release' }]);
    expect(leerOrdenes(normalizar('activa el rozamiento')).ordenes).toEqual([{ type: 'variable', variable: 'amortiguacion', value: 1 }]);
  });
  it('todos los pasos tienen al menos dos pistas y una explicación', () => {
    for (const g of Object.values(GUIONES)) for (const p of g.pasos) {
      expect(p.pistas.length).toBeGreaterThanOrEqual(2);
      expect(p.explicacion.length).toBeGreaterThan(20);
    }
  });
});
