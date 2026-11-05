/**
 * Conversación socrática con memoria del paso: el tutor recuerda qué preguntó, evalúa la respuesta
 * contra esa pregunta y avanza. Así una respuesta después de una pista se evalúa (no se repite la
 * pregunta guía), "no sé" da la siguiente pista y, si se agotan, el tutor explica y sigue.
 *
 * Funciona sin internet y sin modelo: es determinista y está cubierto por pruebas. Nunca da la
 * respuesta antes de que el grupo lo intente.
 */
import { GLOSARIO, GUIONES, type Guion, type Paso, type Regla, type Veredicto } from './guiones.ts';

/** Órdenes al holograma (misma forma que ViewerAction de @rikuy/holo, sin depender de él). */
export type OrdenVisor =
  | { type: 'variable'; variable: string; value: number }
  | { type: 'release' }
  | { type: 'pause' }
  | { type: 'center' }
  | { type: 'zoom'; factor: number }
  | { type: 'rotate'; dx: number; dy: number }
  | { type: 'scene'; scene: string };

export type Fase = 'inicio' | 'paso' | 'cierre' | 'fin';

export interface EstadoConversacion {
  practica: string;
  fase: Fase;
  paso: number;
  /** Respuestas no correctas en el paso actual. */
  intentos: number;
  /** Pistas dadas en el paso actual. */
  pistas: number;
  /** Turnos seguidos que no se entendieron. */
  fueraDeTema: number;
  /** Índice de la última variante dicha, para no repetir la misma frase. */
  variante: number;
  /** Respuestas parciales del paso actual: "glucosa" y luego "galactosa" suman una respuesta completa. */
  acumulado?: string;
}

export type TipoEvento = 'respuesta' | 'pista' | 'orden' | 'explicacion' | 'cierre' | 'no_entendi' | 'saludo' | 'rechazo';

export interface TurnoConversacion {
  texto: string;
  estado: EstadoConversacion;
  ordenes: OrdenVisor[];
  evento: {
    tipo: TipoEvento;
    veredicto?: Veredicto;
    pasoId?: string;
    /** Conceptos logrados en este turno (para el panel). */
    conceptos: string[];
  };
}

export function iniciarConversacion(practica: string): EstadoConversacion {
  return { practica: GUIONES[practica] ? practica : 'pendulo', fase: 'inicio', paso: 0, intentos: 0, pistas: 0, fueraDeTema: 0, variante: 0 };
}

export function guionDe(practica: string): Guion {
  return GUIONES[practica] ?? GUIONES['pendulo']!;
}

/** La pregunta que el tutor tiene abierta ahora mismo. */
export function preguntaActual(estado: EstadoConversacion): string {
  const g = guionDe(estado.practica);
  if (estado.fase === 'cierre') return g.cierre;
  if (estado.fase === 'fin') return '¿Quieres empezar de nuevo?';
  const paso = g.pasos[estado.paso]!;
  return paso.variantes[estado.variante % paso.variantes.length]!;
}

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(texto: string): string {
  return ` ${texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)[.,](\d)/g, '$1§$2')
    .replace(/[¡!¿?.,;:"“”()]+/g, ' ')
    .replace(/§/g, ',')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

const AYUDA = /\b(no se|nose|no lo se|ni idea|no tengo idea|no sabria|no sabemos|no estoy seguro|pista|pistas|ayuda|ayudame|ayudanos|no entiendo|no entendi la pregunta|me rindo|estoy perdido|no me sale|dame una pista)\b/g;
const EXIGE = /\b(dime la respuesta|dame la respuesta|cual es la respuesta|la respuesta correcta|solo dime|dimelo)\b/;
const REPETIR = /\b(repite|repitelo|repetir|otra vez|cual era la pregunta|que pregunta|no escuche|como dijiste)\b/;
const DEFINICION = /\b(que es|que son|que significa|que quiere decir|a que te refieres con|para que sirve)\b/;
const SALTAR = /\b(siguiente pregunta|otra pregunta|saltar|salta|pasemos|sigamos|siguiente)\b/;
const REINICIAR = /\b(empezar de nuevo|empecemos de nuevo|reinicia|otra vez desde el inicio|volver a empezar)\b/;
const SALUDO = /^ (hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal)\b/;
const SI = /^ (si|claro|dale|ok|okay|bueno|vamos|ya|de acuerdo)\b/;

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100,
};

/** Primer número del texto: "2", "1,5", "uno y medio", "medio", "setenta". */
export function leerNumero(t: string): number | null {
  const d = t.match(/(\d+(?:[.,]\d+)?)/);
  if (d) return Number(d[1]!.replace(',', '.'));
  const palabras = t.trim().split(' ');
  for (let i = 0; i < palabras.length; i++) {
    const w = palabras[i]!;
    if (w === 'medio' || w === 'media') return 0.5;
    const v = UNIDADES[w];
    if (v !== undefined) {
      if (palabras[i + 1] === 'y' && (palabras[i + 2] === 'medio' || palabras[i + 2] === 'media')) return v + 0.5;
      if (palabras[i + 1] === 'y' && UNIDADES[palabras[i + 2] ?? ''] !== undefined && v >= 20) return v + UNIDADES[palabras[i + 2]!]!;
      return v;
    }
  }
  return null;
}

const RANGOS: Record<string, [number, number]> = {
  longitud: [0.1, 2.5],
  masa: [0.05, 5],
  temperatura: [0, 90],
  ph: [1, 12],
};

const VERBO_ORDEN = /\b(pon|ponle|ponga|poner|pongamos|cambia|cambiale|sube|subele|baja|bajale|fija|ajusta|usa|aumenta|reduce|coloca|alarga|acorta|dejala|dejalo)\b/;

/** Órdenes al holograma que contiene el texto. Una condicional ("si alargo...") no es una orden. */
export function leerOrdenes(t: string): { ordenes: OrdenVisor[]; descripcion: string[] } {
  const ordenes: OrdenVisor[] = [];
  const descripcion: string[] = [];
  if (/^ (si|y si|que pasa si|que pasaria si)\b/.test(t)) return { ordenes, descripcion };

  const n = leerNumero(t);
  if (VERBO_ORDEN.test(t) && n !== null) {
    let variable: string | null = null;
    if (/\b(longitud|cuerda|largo|larga|hilo|cadena)\b/.test(t)) variable = 'longitud';
    else if (/\b(masa|peso|bolita|bola|kilo|kilos|kilogramos?)\b/.test(t)) variable = 'masa';
    else if (/\b(temperatura|grados|calor)\b/.test(t)) variable = 'temperatura';
    else if (/\b(ph|acidez)\b/.test(t)) variable = 'ph';
    if (variable) {
      let valor = n;
      if (variable === 'longitud' && /\b(cm|centimetros?)\b/.test(t)) valor = n / 100;
      const [min, max] = RANGOS[variable]!;
      valor = Math.min(max, Math.max(min, valor));
      ordenes.push({ type: 'variable', variable, value: valor });
      const unidad = variable === 'longitud' ? ' m' : variable === 'masa' ? ' kg' : variable === 'temperatura' ? ' °C' : '';
      descripcion.push(`${variable} en ${String(valor).replace('.', ',')}${unidad}`);
    }
  }
  if (/\b(rozamiento|friccion|amortiguacion)\b/.test(t) && /\b(activa|activar|pon|con|enciende|agrega)\b/.test(t)) {
    ordenes.push({ type: 'variable', variable: 'amortiguacion', value: 1 });
    descripcion.push('rozamiento activado');
  } else if (/\b(rozamiento|friccion|amortiguacion)\b/.test(t) && /\b(quita|quitar|sin|apaga|desactiva)\b/.test(t)) {
    ordenes.push({ type: 'variable', variable: 'amortiguacion', value: 0 });
    descripcion.push('sin rozamiento');
  }
  if (/\b(suelta|sueltalo|sueltala|soltar|corre|correr|empieza|inicia|arranca|dale play)\b/.test(t)) {
    ordenes.push({ type: 'release' });
    descripcion.push('péndulo en marcha');
  } else if (/\b(pausa|pausalo|detente|detenlo|detener|alto|quieto)\b/.test(t)) {
    ordenes.push({ type: 'pause' });
    descripcion.push('pausa');
  }
  if (/\b(gira|giralo|girar|rota|rotalo|da la vuelta|voltea)\b/.test(t)) {
    ordenes.push({ type: 'rotate', dx: /\bizquierda\b/.test(t) ? -0.6 : 0.6, dy: 0 });
    descripcion.push('girando');
  }
  if (/\b(acerca|acercalo|acercar|agranda|mas grande|zoom)\b/.test(t)) {
    ordenes.push({ type: 'zoom', factor: 1.25 });
    descripcion.push('acercando');
  } else if (/\b(aleja|alejalo|alejar|achica|mas chico|mas pequeno)\b/.test(t)) {
    ordenes.push({ type: 'zoom', factor: 0.8 });
    descripcion.push('alejando');
  }
  if (/\b(centra|centralo|centrar|al centro)\b/.test(t)) {
    ordenes.push({ type: 'center' });
    descripcion.push('centrado');
  }
  if (/\b(muestrame|muestra|llevame|ir a|vamos a|quiero ver|abre|cambia a)\b/.test(t)) {
    if (/\bpendulo\b/.test(t)) ordenes.push({ type: 'scene', scene: 'pendulo' });
    else if (/\b(lactasa|lactosa|enzima)\b/.test(t)) ordenes.push({ type: 'scene', scene: 'lactasa' });
  }
  return { ordenes, descripcion };
}

function evaluar(t: string, reglas: readonly Regla[]): Regla | null {
  for (const r of reglas) if (r.si.test(t)) return r;
  return null;
}

function siguienteVariante(estado: EstadoConversacion, paso: Paso): number {
  return paso.variantes.length > 1 ? (estado.variante + 1) % paso.variantes.length : 0;
}

/** Avanza al siguiente paso (o al cierre) y devuelve la pregunta nueva. */
function avanzar(estado: EstadoConversacion): { estado: EstadoConversacion; pregunta: string } {
  const g = guionDe(estado.practica);
  const siguiente = estado.paso + 1;
  if (siguiente >= g.pasos.length) {
    const e: EstadoConversacion = { ...estado, fase: 'cierre', intentos: 0, pistas: 0, fueraDeTema: 0, variante: 0, acumulado: '' };
    return { estado: e, pregunta: g.cierre };
  }
  const e: EstadoConversacion = { ...estado, fase: 'paso', paso: siguiente, intentos: 0, pistas: 0, fueraDeTema: 0, variante: 0, acumulado: '' };
  return { estado: e, pregunta: g.pasos[siguiente]!.variantes[0] };
}

function juntar(...partes: Array<string | undefined | false>): string {
  return partes.filter((p): p is string => Boolean(p && p.trim())).join(' ');
}

/**
 * Un turno. `texto` es lo que dijo o escribió el grupo; el estado nuevo vuelve en la respuesta.
 * Nunca lanza: cualquier texto produce una respuesta útil.
 */
export function responder(texto: string, estado: EstadoConversacion): TurnoConversacion {
  const g = guionDe(estado.practica);
  const t = normalizar(texto);
  const { ordenes, descripcion } = leerOrdenes(t);
  const hechas = descripcion.length > 0 ? `Listo: ${descripcion.join(', ')}.` : ordenes.length > 0 ? 'Listo.' : '';
  const vacio = t.trim().length === 0;

  // Reinicio explícito o nueva ronda después del final.
  if (REINICIAR.test(t) || (estado.fase === 'fin' && SI.test(t))) {
    const e: EstadoConversacion = { ...iniciarConversacion(estado.practica), fase: 'paso' };
    return { texto: juntar('Empecemos.', g.pasos[0]!.variantes[0]), estado: e, ordenes, evento: { tipo: 'saludo', conceptos: [] } };
  }

  // Primer turno: saluda y abre la primera pregunta (y ejecuta la orden si la hubo).
  if (estado.fase === 'inicio') {
    const e: EstadoConversacion = { ...estado, fase: 'paso', paso: 0, variante: 0 };
    const primera = g.pasos[0]!;
    const regla = !vacio ? evaluar(t, primera.reglas) : null;
    if (regla) return responderAPaso(t, e, ordenes, hechas);
    return { texto: juntar(hechas, g.bienvenida, primera.variantes[0]), estado: e, ordenes, evento: { tipo: 'saludo', conceptos: [] } };
  }

  if (estado.fase === 'fin') {
    if (ordenes.length > 0) return { texto: juntar(hechas, 'Observa qué cambia.'), estado, ordenes, evento: { tipo: 'orden', conceptos: [] } };
    return { texto: juntar(g.despedida, 'Si quieres repasar, di "empezar de nuevo".'), estado, ordenes, evento: { tipo: 'cierre', conceptos: [] } };
  }

  if (REPETIR.test(t)) {
    return { texto: preguntaActual(estado), estado, ordenes, evento: { tipo: 'respuesta', conceptos: [] } };
  }

  if (SALTAR.test(t) && estado.fase === 'paso') {
    const paso = g.pasos[estado.paso]!;
    const a = avanzar(estado);
    return { texto: juntar('Está bien.', paso.explicacion, a.pregunta), estado: a.estado, ordenes, evento: { tipo: 'explicacion', pasoId: paso.id, conceptos: [] } };
  }

  return responderAPaso(t, estado, ordenes, hechas);
}

function responderAPaso(t: string, estado: EstadoConversacion, ordenes: OrdenVisor[], hechas: string): TurnoConversacion {
  const g = guionDe(estado.practica);
  const enCierre = estado.fase === 'cierre';
  const paso = enCierre ? null : g.pasos[estado.paso]!;
  const reglas = enCierre ? g.reglasCierre : paso!.reglas;

  // Lo que queda al quitar las frases de ayuda: "no sé, creo que más lento" se evalúa como respuesta.
  const sinAyuda = ` ${t.replace(AYUDA, ' ').replace(/\s+/g, ' ').trim()} `;
  const pideAyuda = sinAyuda.trim() !== t.trim() || EXIGE.test(t);
  let regla = evaluar(sinAyuda, reglas);
  // Una respuesta en partes ("glucosa" ... "y galactosa") se evalúa junta.
  const acumulado = `${estado.acumulado ?? ''} ${sinAyuda}`;
  if (regla?.veredicto !== 'correcto' && estado.acumulado) {
    const junta = evaluar(acumulado, reglas);
    if (junta?.veredicto === 'correcto') regla = junta;
  }

  // 1) Respuesta reconocida.
  if (regla) {
    if (regla.veredicto === 'correcto') {
      if (enCierre) {
        const e: EstadoConversacion = { ...estado, fase: 'fin' };
        return { texto: juntar(hechas, regla.dice, g.despedida), estado: e, ordenes, evento: { tipo: 'cierre', veredicto: 'correcto', conceptos: [] } };
      }
      const a = avanzar(estado);
      const puente = a.estado.fase === 'cierre' ? 'Ya casi terminamos.' : 'Siguiente pregunta:';
      return {
        texto: juntar(hechas, regla.dice, puente, a.pregunta),
        estado: a.estado,
        ordenes,
        evento: { tipo: 'respuesta', veredicto: 'correcto', pasoId: paso?.id ?? 'cierre', conceptos: [...(paso?.conceptos ?? [])] },
      };
    }

    const intentos = estado.intentos + 1;
    // Tras tres intentos sin acertar, el tutor explica y avanza para que el grupo no se trabe.
    if (intentos >= 3) return explicarYAvanzar(estado, ordenes, hechas, regla.dice, regla.veredicto);

    if (regla.veredicto === 'parcial') {
      const e = { ...estado, intentos, fueraDeTema: 0, acumulado: acumulado.slice(-400) };
      return { texto: juntar(hechas, regla.dice), estado: e, ordenes, evento: { tipo: 'respuesta', veredicto: 'parcial', pasoId: paso?.id ?? 'cierre', conceptos: [] } };
    }

    // Error: invita a probar; al segundo error suma una pista.
    if (intentos === 1 || !paso) {
      const variante = paso ? siguienteVariante(estado, paso) : 0;
      const e = { ...estado, intentos, fueraDeTema: 0, variante };
      const pregunta = paso ? paso.variantes[variante]! : g.cierre;
      return {
        texto: juntar(hechas, regla.dice, paso?.prueba ? `Pruébalo: ${paso.prueba}` : undefined, paso?.prueba ? `Después dime: ${pregunta.charAt(0).toLowerCase()}${pregunta.slice(1)}` : pregunta),
        estado: e,
        ordenes,
        evento: { tipo: 'respuesta', veredicto: 'error', pasoId: paso?.id ?? 'cierre', conceptos: [] },
      };
    }
    return darPista({ ...estado, intentos }, ordenes, juntar(hechas, regla.dice), 'error');
  }

  // 2) Pide ayuda o la respuesta: siguiente pista de este paso.
  if (pideAyuda) {
    const prefijo = EXIGE.test(t) ? 'No te voy a dar la respuesta, pero sí una pista.' : '';
    return darPista(estado, ordenes, juntar(hechas, prefijo));
  }

  // 3) Solo una orden: se ejecuta y se recuerda la pregunta abierta.
  if (ordenes.length > 0) {
    return {
      texto: juntar(hechas, 'Observa qué pasa.', `Recuerda la pregunta: ${preguntaActual(estado)}`),
      estado: { ...estado, fueraDeTema: 0 },
      ordenes,
      evento: { tipo: 'orden', conceptos: [] },
    };
  }

  // 4) Pregunta por una palabra: se define y se vuelve a la pregunta abierta.
  if (DEFINICION.test(t)) {
    const def = GLOSARIO.find(([re]) => re.test(t));
    if (def) {
      return { texto: juntar(def[1], `Con eso: ${preguntaActual(estado)}`), estado: { ...estado, fueraDeTema: 0 }, ordenes, evento: { tipo: 'respuesta', conceptos: [] } };
    }
  }

  // 5) Saludo.
  if (SALUDO.test(t)) {
    return { texto: juntar('Hola.', preguntaActual(estado)), estado, ordenes, evento: { tipo: 'saludo', conceptos: [] } };
  }

  // 6) No se entendió: otra forma de preguntar; a la segunda, una pista (así nunca hay bucle).
  const fueraDeTema = estado.fueraDeTema + 1;
  if (fueraDeTema >= 2) {
    return darPista({ ...estado, fueraDeTema }, ordenes, 'No logré entenderte, así que te doy una ayuda.', undefined, true);
  }
  const variante = paso ? siguienteVariante(estado, paso) : 0;
  const e = { ...estado, fueraDeTema, variante };
  const pregunta = paso ? paso.variantes[variante]! : g.cierre;
  return {
    texto: juntar('No estoy seguro de haberte entendido. Te lo pregunto de otra forma:', pregunta, 'Si no sabes, di "no sé" y te doy una pista.'),
    estado: e,
    ordenes,
    evento: { tipo: 'no_entendi', pasoId: paso?.id ?? 'cierre', conceptos: [] },
  };
}

function darPista(estado: EstadoConversacion, ordenes: OrdenVisor[], prefijo: string, veredicto?: Veredicto, mantenerFuera = false): TurnoConversacion {
  const g = guionDe(estado.practica);
  if (estado.fase === 'cierre') {
    const resumen = g.pasos.map((p) => p.id).join(', ');
    return {
      texto: juntar(prefijo, `Piensa en lo que probamos: ${resumen.replace(/_/g, ' ')}. ¿Qué fue lo que sí cambió el resultado?`),
      estado: { ...estado, pistas: estado.pistas + 1 },
      ordenes,
      evento: { tipo: 'pista', pasoId: 'cierre', conceptos: [], ...(veredicto ? { veredicto } : {}) },
    };
  }
  const paso = g.pasos[estado.paso]!;
  if (estado.pistas >= paso.pistas.length) return explicarYAvanzar(estado, ordenes, prefijo, undefined, veredicto);
  const pista = paso.pistas[estado.pistas]!;
  const e = { ...estado, pistas: estado.pistas + 1, fueraDeTema: mantenerFuera ? estado.fueraDeTema : 0 };
  return {
    texto: juntar(prefijo, `Pista ${e.pistas}: ${pista}`, `Con eso, ${preguntaActual(estado).charAt(0).toLowerCase()}${preguntaActual(estado).slice(1)}`),
    estado: e,
    ordenes,
    evento: { tipo: 'pista', pasoId: paso.id, conceptos: [], ...(veredicto ? { veredicto } : {}) },
  };
}

function explicarYAvanzar(estado: EstadoConversacion, ordenes: OrdenVisor[], prefijo: string, dicho?: string, veredicto?: Veredicto): TurnoConversacion {
  const g = guionDe(estado.practica);
  if (estado.fase === 'cierre') {
    const e: EstadoConversacion = { ...estado, fase: 'fin' };
    const conclusion = estado.practica === 'lactasa' ? 'el calor cambia la forma de la lactasa y la lactosa ya no encaja' : 'el tiempo de oscilación depende de la longitud de la cuerda y no de la masa';
    return { texto: juntar(prefijo, dicho, `Resumamos juntos: ${conclusion}.`, g.despedida), estado: e, ordenes, evento: { tipo: 'cierre', conceptos: [], ...(veredicto ? { veredicto } : {}) } };
  }
  const paso = g.pasos[estado.paso]!;
  const a = avanzar(estado);
  return {
    texto: juntar(prefijo, dicho, paso.explicacion, a.estado.fase === 'cierre' ? 'Ya casi terminamos.' : 'Sigamos:', a.pregunta),
    estado: a.estado,
    ordenes,
    evento: { tipo: 'explicacion', pasoId: paso.id, conceptos: [], ...(veredicto ? { veredicto } : {}) },
  };
}
