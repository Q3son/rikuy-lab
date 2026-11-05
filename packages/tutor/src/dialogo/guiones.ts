/**
 * Guiones socráticos por práctica. Cada paso es una pregunta con:
 *  - variantes: formas distintas de preguntar lo mismo (nunca se repite la misma frase seguida);
 *  - reglas: patrones de respuesta en orden; la primera que coincide decide el veredicto;
 *  - pistas: de general a concreta (nunca la respuesta literal);
 *  - explicacion: lo que el tutor dice después de agotar las pistas, para no dejar al grupo trabado;
 *  - prueba: una orden que el grupo puede dar para comprobarlo en el holograma.
 *
 * La física del péndulo sigue T = 2π·√(L/g): depende de la longitud y de la gravedad, no de la masa,
 * y casi no depende del ángulo cuando es pequeño. El rozamiento reduce la amplitud, no el periodo.
 */

export type Veredicto = 'correcto' | 'parcial' | 'error';

export interface Regla {
  /** Expresión sobre el texto normalizado (minúsculas, sin tildes ni signos). */
  si: RegExp;
  veredicto: Veredicto;
  /** Respuesta del tutor para este caso concreto. */
  dice: string;
}

export interface Paso {
  id: string;
  variantes: readonly [string, ...string[]];
  reglas: readonly Regla[];
  pistas: readonly [string, string, ...string[]];
  explicacion: string;
  prueba?: string;
  /** Conceptos que el panel registra cuando el grupo acierta este paso. */
  conceptos: readonly string[];
}

export interface Guion {
  practica: string;
  bienvenida: string;
  pasos: readonly Paso[];
  /** Pregunta de cierre: el grupo explica con sus palabras. */
  cierre: string;
  reglasCierre: readonly Regla[];
  despedida: string;
}

const PENDULO: Guion = {
  practica: 'pendulo',
  bienvenida: 'Hola, soy Rikuy. Hoy vamos a investigar el péndulo.',
  pasos: [
    {
      id: 'longitud',
      variantes: [
        'Si alargamos la cuerda del péndulo, ¿oscilará más rápido o más lento?',
        'Piensa en una cuerda más larga: ¿cada ida y vuelta tardará más o menos tiempo?',
        'Con la cuerda más larga, ¿el péndulo va más rápido o más lento?',
      ],
      reglas: [
        { si: /\b(no (va|iria|ira|seria|sera) (mas )?lento|mas rapido|rapidisimo|acelera|tarda menos|demora menos|menos tiempo)\b/, veredicto: 'error', dice: 'Interesante predicción. No te digo si es cierta: pruébalo tú.' },
        { si: /\b(mas lento|lento|despacio|tarda mas|demora mas|mas tiempo|mas demora|se demora|tarda|mas pausado)\b/, veredicto: 'correcto', dice: 'Eso predices. Y si lo pruebas, verás que con la cuerda más larga cada oscilación tarda más.' },
        { si: /\b(igual|lo mismo|no cambia|nada)\b/, veredicto: 'error', dice: 'Es una predicción válida para poner a prueba.' },
      ],
      pistas: [
        'Piensa en un columpio con cadenas muy largas comparado con uno de cadenas cortas.',
        'Una cuerda más larga hace que la masa recorra un arco más grande en cada ida y vuelta.',
        'Si el camino es más largo, ¿la masa necesita más o menos tiempo para recorrerlo?',
      ],
      explicacion: 'Veámoslo juntos: con una cuerda más larga la masa recorre un arco más grande, así que cada oscilación tarda más. El péndulo va más lento.',
      prueba: 'Dime "pon la longitud en 2 metros" y observa el periodo.',
      conceptos: ['longitud', 'periodo'],
    },
    {
      id: 'por_que',
      variantes: [
        '¿Por qué crees que una cuerda más larga hace que tarde más?',
        '¿Qué cambia en el movimiento cuando la cuerda es más larga?',
      ],
      reglas: [
        { si: /\b(arco|recorre|recorrido|camino|distancia|trayectoria|mas largo|mas espacio|va mas lejos|circulo mas grande)\b/, veredicto: 'correcto', dice: 'Exacto: el arco que recorre es más grande, por eso tarda más en ir y volver.' },
        { si: /\b(gravedad|peso|jala|atrae)\b/, veredicto: 'parcial', dice: 'La gravedad es la que lo hace volver, bien. Pero piensa qué pasa con el camino que recorre la masa.' },
        { si: /\b(pesa mas|mas pesado|la masa)\b/, veredicto: 'error', dice: 'La cuerda no cambia la masa. Fíjate en el camino que recorre.' },
      ],
      pistas: [
        'Mira el holograma: ¿el recorrido de la masa es igual con cuerda corta y con cuerda larga?',
        'Compara el tamaño del arco que dibuja la masa.',
      ],
      explicacion: 'Con la cuerda más larga, la masa dibuja un arco más grande. Más camino significa más tiempo por oscilación.',
      conceptos: ['longitud', 'periodo'],
    },
    {
      id: 'masa',
      variantes: [
        'Ahora la masa: si colgamos una masa más pesada, ¿cambia el tiempo de cada oscilación?',
        'Si la bolita fuera más pesada, ¿iría más rápido, más lento o igual?',
      ],
      reglas: [
        { si: /\b(no cambia|no varia|igual|lo mismo|mismo tiempo|no depende|no influye|no afecta|da igual|nada)\b/, veredicto: 'correcto', dice: 'Así es: el tiempo de cada oscilación casi no depende de la masa. Galileo lo descubrió observando una lámpara que se balanceaba.' },
        { si: /\b(mas rapido|rapido|mas lento|lento|tarda mas|tarda menos|cae mas rapido|mas fuerte)\b/, veredicto: 'error', dice: 'Mucha gente piensa eso, incluso los sabios antes de Galileo.' },
        { si: /\b(cambia|depende|influye|afecta)\b/, veredicto: 'error', dice: 'Es una idea para poner a prueba.' },
      ],
      pistas: [
        'Recuerda: una piedra pesada y una liviana caen casi al mismo tiempo si no hay aire.',
        'Prueba con el holograma: cambia la masa y mide el periodo antes y después.',
        'Si los dos periodos salen casi iguales, ¿qué significa?',
      ],
      explicacion: 'Si cambias la masa y mides, el periodo sale casi igual. El tiempo de oscilación no depende de la masa, solo de la longitud y de la gravedad.',
      prueba: 'Dime "pon la masa en 2" y compara el periodo con el de antes.',
      conceptos: ['masa', 'periodo'],
    },
    {
      id: 'rozamiento',
      variantes: [
        'Con el tiempo un péndulo real se va deteniendo. ¿Qué crees que lo frena?',
        '¿Por qué un columpio se detiene si nadie lo empuja?',
      ],
      reglas: [
        { si: /\b(aire|viento|rozamiento|friccion|roce|roza|resistencia|fuerza de rozamiento|choca con el aire)\b/, veredicto: 'correcto', dice: 'Correcto: el rozamiento con el aire y en el punto de apoyo le quita energía y cada vez oscila menos.' },
        { si: /\b(gravedad|peso)\b/, veredicto: 'parcial', dice: 'La gravedad lo hace volver, pero no es lo que lo frena. ¿Qué hay alrededor de la masa mientras se mueve?' },
        { si: /\b(cansa|se cansa|energia se acaba|se acaba)\b/, veredicto: 'parcial', dice: 'Va perdiendo energía, sí. ¿Y quién se la quita?' },
      ],
      pistas: [
        'Piensa en lo que sientes en la cara cuando vas rápido en bicicleta.',
        'Activa el rozamiento en el holograma y mira qué pasa con la altura de cada oscilación.',
      ],
      explicacion: 'El aire y el roce en el punto de apoyo le quitan energía. Por eso cada oscilación es más baja, aunque el tiempo de cada una casi no cambia.',
      prueba: 'Activa el rozamiento con el botón o dime "suelta" y observa cómo baja la altura.',
      conceptos: ['amortiguacion', 'energia'],
    },
    {
      id: 'aplicacion',
      variantes: [
        'Imagina un reloj de péndulo que se adelanta. ¿Qué le cambiarías para que vaya más lento?',
        'Si un columpio va muy rápido para un niño pequeño, ¿qué le harías para que vaya más lento?',
      ],
      reglas: [
        { si: /\b(alargar|alargaria|alargarla|alargo|mas larga|mas largo|cuerda larga|aumentar la longitud|aumentaria la longitud|mas longitud|cadena mas larga|bajaria la masa|bajar la masa)\b/, veredicto: 'correcto', dice: 'Muy bien: alargando la cuerda cada oscilación tarda más. Así se ajustan los relojes de péndulo.' },
        { si: /\b(acortar|acortaria|mas corta|mas corto|cuerda corta)\b/, veredicto: 'error', dice: 'Con la cuerda más corta, ¿iría más rápido o más lento? Recuerda tu primera prueba.' },
        { si: /\b(mas pesad|menos pesad|cambiar la masa|mas masa|menos masa)\b/, veredicto: 'error', dice: 'Recuerda lo que descubrimos sobre la masa.' },
      ],
      pistas: [
        'Recuerda tu primera prueba: ¿qué cambiaste para que fuera más lento?',
        'Solo hay una cosa del péndulo que cambia el tiempo de oscilación aquí en la Tierra.',
      ],
      explicacion: 'Para que vaya más lento hay que alargar la cuerda: así se calibran los relojes de péndulo.',
      conceptos: ['longitud', 'periodo', 'aplicacion'],
    },
  ],
  cierre: 'Para cerrar, cuéntame con tus palabras: ¿de qué depende el tiempo de cada oscilación del péndulo?',
  reglasCierre: [
    { si: /\b(longitud|largo|larga|cuerda)\b.*\b(masa|peso)\b.*\b(no|ni)\b|\b(no|ni)\b.*\b(masa|peso)\b/, veredicto: 'correcto', dice: 'Excelente conclusión: depende de la longitud y no de la masa.' },
    { si: /\b(longitud|largo de la cuerda|largo|larga|cuerda)\b/, veredicto: 'correcto', dice: 'Excelente: depende de la longitud de la cuerda.' },
    { si: /\b(masa|peso|pesado)\b/, veredicto: 'error', dice: 'Revisa lo que pasó cuando cambiaste la masa.' },
  ],
  despedida: 'Lo descubriste tú, con tus predicciones y tus pruebas. Eso es pensar como científico. ¿Quieres probar con otra longitud o ir a la lactasa?',
};

const LACTASA: Guion = {
  practica: 'lactasa',
  bienvenida: 'Hola, soy Rikuy. Hoy vamos a ver qué pasa con la leche dentro de tu intestino.',
  pasos: [
    {
      id: 'funcion',
      variantes: [
        'Mira la lactasa en el holograma. ¿Qué crees que le hace a la lactosa?',
        '¿Qué trabajo hace la lactasa con el azúcar de la leche?',
      ],
      reglas: [
        { si: /\b(rompe|romper|rompio|separa|separar|divide|dividir|corta|cortar|parte|partir|descompone|descomponer|hidroliza|desarma|digiere|digerir|degrada)\b/, veredicto: 'correcto', dice: 'Exacto: la lactasa rompe la lactosa en dos partes.' },
        { si: /\b(une|junta|forma|crea|produce lactosa|fabrica)\b/, veredicto: 'error', dice: 'Fíjate bien en el holograma: ¿la molécula se junta o se separa?' },
        { si: /\b(come|se la come|destruye|elimina|desaparece)\b/, veredicto: 'parcial', dice: 'Algo así, pero no desaparece. ¿En cuántas partes queda?' },
      ],
      pistas: [
        'Observa el puente que une las dos partes de la lactosa. ¿Qué le pasa cuando llega la lactasa?',
        'La lactasa es una enzima, y muchas enzimas trabajan como tijeras.',
      ],
      explicacion: 'La lactasa funciona como unas tijeras: corta el enlace de la lactosa y la separa en dos azúcares más simples.',
      conceptos: ['lactasa', 'lactosa'],
    },
    {
      id: 'productos',
      variantes: [
        'Cuando la lactasa rompe la lactosa, ¿qué dos azúcares quedan?',
        'La lactosa se separa en dos partes. ¿Sabes cómo se llaman?',
      ],
      reglas: [
        { si: /\bglucosa\b.*\bgalactosa\b|\bgalactosa\b.*\bglucosa\b/, veredicto: 'correcto', dice: 'Muy bien: glucosa y galactosa. Esos azúcares sí pasan a la sangre.' },
        { si: /\b(glucosa|galactosa)\b/, veredicto: 'parcial', dice: 'Bien, esa es una. ¿Y la otra?' },
        { si: /\b(azucar|azucares|dos azucares|monosacarido)\b/, veredicto: 'parcial', dice: 'Sí, son dos azúcares más simples. ¿Recuerdas sus nombres? Uno es el que usan tus células como energía.' },
        { si: /\b(sacarosa|fructosa|maltosa)\b/, veredicto: 'error', dice: 'Es otro azúcar, pero no sale de la lactosa.' },
      ],
      pistas: [
        'Uno de ellos es el azúcar que tus células usan como energía y que se mide en la sangre.',
        'El otro tiene un nombre parecido a la palabra "leche" en griego: gala.',
      ],
      explicacion: 'La lactosa se separa en glucosa y galactosa, dos azúcares que el intestino sí puede absorber.',
      conceptos: ['glucosa', 'galactosa', 'enlace_glucosidico'],
    },
    {
      id: 'temperatura',
      variantes: [
        '¿Qué crees que le pasa a la lactasa si calentamos mucho, a 70 grados?',
        'Si la temperatura sube mucho, ¿la lactasa sigue trabajando igual?',
      ],
      reglas: [
        { si: /\b(no (le )?pasa nada|sigue igual|igual|trabaja mejor|mas rapido|funciona mejor|acelera)\b/, veredicto: 'error', dice: 'Es una predicción para poner a prueba.' },
        { si: /\b(deforma|desnaturaliza|se rompe|se dana|se destruye|deja de funcionar|ya no funciona|no funciona|no trabaja|pierde (su )?forma|se desarma|muere|se quema|se cocina|ya no rompe|no rompe|mas lento|trabaja menos|baja)\b/, veredicto: 'correcto', dice: 'Esa es tu predicción. Pruébala y fíjate en la forma de la proteína y en la actividad.' },
      ],
      pistas: [
        'Piensa en qué le pasa a la clara de un huevo cuando la cocinas: ¿vuelve a ser como antes?',
        'La lactasa también es una proteína.',
      ],
      explicacion: 'A 70 grados la lactasa se deforma, como la clara de huevo al cocinarse. Una enzima deformada deja de trabajar.',
      prueba: 'Dime "pon la temperatura en 70" y mira la actividad.',
      conceptos: ['temperatura', 'desnaturalizacion'],
    },
    {
      id: 'forma',
      variantes: [
        '¿Por qué una lactasa deformada ya no puede romper la lactosa?',
        '¿Qué tiene que ver la forma de la enzima con su trabajo?',
      ],
      reglas: [
        { si: /\b(encaja|encajar|calza|forma|sitio activo|llave|cerradura|molde|no entra|no cabe|acopla)\b/, veredicto: 'correcto', dice: 'Exacto: la lactosa tiene que encajar en el sitio activo, como una llave en su cerradura. Si la forma cambia, ya no encaja.' },
        { si: /\b(muere|esta muerta|se murio)\b/, veredicto: 'parcial', dice: 'Una enzima no está viva, pero sí deja de funcionar. ¿Qué cambió en ella?' },
      ],
      pistas: [
        'Mira el hueco de la enzima donde entra la lactosa.',
        'Piensa en una llave y su cerradura.',
      ],
      explicacion: 'La lactosa entra en un hueco con forma exacta, el sitio activo. Si la enzima se deforma, la lactosa ya no encaja y no se rompe.',
      conceptos: ['lactasa', 'desnaturalizacion'],
    },
    {
      id: 'intolerancia',
      variantes: [
        '¿Qué le pasa a una persona que produce poca lactasa cuando toma leche?',
        'Si alguien casi no tiene lactasa, ¿qué crees que siente al tomar leche?',
      ],
      reglas: [
        { si: /\b(intoleran|duele|dolor|hincha|hinchazon|gases|diarrea|cae mal|malestar|no la digiere|no digiere|le cae mal|indigestion|colico)\b/, veredicto: 'correcto', dice: 'Así es: la lactosa sin romper llega al intestino grueso, las bacterias la fermentan y producen gases y malestar. Eso es la intolerancia a la lactosa.' },
        { si: /\b(nada|no le pasa|normal)\b/, veredicto: 'error', dice: 'Piensa: si nadie rompe la lactosa, ¿a dónde va?' },
      ],
      pistas: [
        'Si la lactosa no se rompe, no se puede absorber. ¿A dónde sigue?',
        'En el intestino grueso viven bacterias que se la comen y producen gases.',
      ],
      explicacion: 'Sin lactasa la lactosa no se rompe, llega entera al intestino grueso y las bacterias la fermentan: gases, hinchazón y dolor. Eso es la intolerancia a la lactosa.',
      conceptos: ['intolerancia_lactosa', 'intestino_delgado'],
    },
  ],
  cierre: 'Para cerrar, cuéntame con tus palabras: ¿por qué la temperatura afecta a la lactasa?',
  reglasCierre: [
    { si: /\b(forma|deforma|desnaturaliza|encaja|sitio activo|proteina)\b/, veredicto: 'correcto', dice: 'Excelente conclusión: el calor cambia la forma de la enzima y la lactosa ya no encaja.' },
    { si: /\b(calor|caliente|temperatura)\b/, veredicto: 'parcial', dice: 'Bien, el calor la afecta. ¿Qué le cambia a la enzima?' },
  ],
  despedida: 'Lo descubriste con tus predicciones. ¿Quieres probar otra temperatura o ir al péndulo?',
};

/** Respuestas cortas a "¿qué es...?": definen la palabra, no responden la pregunta abierta. */
export const GLOSARIO: ReadonlyArray<readonly [RegExp, string]> = [
  [/\blactasa\b/, 'La lactasa es una enzima: una proteína de tu intestino delgado que ayuda a digerir el azúcar de la leche.'],
  [/\blactosa\b/, 'La lactosa es el azúcar de la leche. Está formada por dos azúcares más pequeños unidos.'],
  [/\benzimas?\b/, 'Una enzima es una proteína que acelera una reacción, como unas tijeras muy precisas.'],
  [/\bglucosa\b/, 'La glucosa es el azúcar que tus células usan como energía.'],
  [/\bgalactosa\b/, 'La galactosa es un azúcar simple que viene de la leche; el hígado la convierte en glucosa.'],
  [/\bsitio activo\b/, 'El sitio activo es el hueco de la enzima donde encaja la molécula que va a transformar.'],
  [/\b(desnaturaliza|desnaturalizacion)\w*/, 'Desnaturalizar es deformar una proteína, por ejemplo con calor, hasta que deja de funcionar.'],
  [/\bperiodo\b/, 'El periodo es el tiempo que tarda el péndulo en hacer una ida y vuelta completa.'],
  [/\boscila\w*/, 'Oscilar es ir y volver una y otra vez, como un columpio.'],
  [/\bamplitud\b/, 'La amplitud es qué tan lejos se aleja el péndulo del centro.'],
  [/\b(rozamiento|friccion)\b/, 'El rozamiento es la fuerza que aparece cuando algo se frota con el aire o con otra superficie y lo va frenando.'],
  [/\bpendulo\b/, 'Un péndulo es una masa colgada de una cuerda que puede ir y volver, como un columpio.'],
  [/\bmasa\b/, 'La masa es cuánta materia tiene un objeto; en el péndulo es la bolita que cuelga.'],
  [/\bgravedad\b/, 'La gravedad es la fuerza con la que la Tierra atrae las cosas hacia abajo.'],
];

export const GUIONES: Readonly<Record<string, Guion>> = { pendulo: PENDULO, lactasa: LACTASA };
