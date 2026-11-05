/**
 * Labelled corpus of plausible 2.º secundaria sentences (gate of ARQUITECTURA 5.4, F4).
 *
 * Labels were written by meaning BEFORE the rules were implemented and are independent of the
 * lexicons used by `indicios.ts`. Convention:
 *  - variable:      the sentence names an experimental FACTOR (length, mass, temperature, pH, gravity,
 *                   altitude). The measured quantity (period, time) is not a factor.
 *  - prediccion:    the sentence states an expectation or claim about an effect (direction, "no change",
 *                   "stops working"...). Intentions ("voy a cambiar"), measurement reports, questions and
 *                   plain facts are NOT predictions.
 *  - justificacion: the sentence gives a reason ("porque", "ya que", "debido a"...). A bare "porque sí"
 *                   or "no sé por qué" gives none.
 * Hard cases are kept on purpose ("masa", "nada más", "no más", "más o menos", "porque sí").
 */
export interface FraseEtiquetada {
  texto: string;
  variable: boolean;
  prediccion: boolean;
  justificacion: boolean;
}

const f = (texto: string, v: 0 | 1, p: 0 | 1, j: 0 | 1): FraseEtiquetada => ({
  texto,
  variable: v === 1,
  prediccion: p === 1,
  justificacion: j === 1,
});

export const CORPUS: readonly FraseEtiquetada[] = [
  // Péndulo
  f('Si alargo la cuerda el péndulo va a tardar más', 1, 1, 0),
  f('Creo que si la cuerda es más corta el péndulo se mueve más rápido porque tiene menos camino', 1, 1, 1),
  f('La masa no cambia el periodo porque todos los cuerpos caen igual', 1, 1, 1),
  f('Voy a cambiar la masa', 1, 0, 0),
  f('La masa del péndulo es de 200 gramos', 1, 0, 0),
  f('Con más masa el péndulo se demora más', 1, 1, 0),
  f('Nada más voy a cambiar la cuerda', 1, 0, 0),
  f('Medí diez oscilaciones nada más', 0, 0, 0),
  f('Mi hipótesis es que una cuerda larga hace el péndulo más lento', 1, 1, 0),
  f('Si le pongo una masa más pesada se mueve más lento porque pesa más', 1, 1, 1),
  f('La masa y la longitud son las variables', 1, 0, 0),
  f('Voy a dejar la masa fija y cambiar la longitud', 1, 0, 0),
  f('La gravedad no afecta al péndulo', 1, 1, 0),
  f('Si cambio la longitud de 30 a 60 cm el periodo aumenta', 1, 1, 0),
  f('El péndulo tarda más porque la cuerda es más larga', 1, 1, 1),
  f('Mi péndulo tardó 1,4 segundos', 0, 0, 0),
  f('Ya terminé de medir las diez oscilaciones', 0, 0, 0),
  f('Profe no entiendo qué hay que hacer', 0, 0, 0),
  f('No sé', 0, 0, 0),
  f('Pienso que el peso no influye en el tiempo', 1, 1, 0),
  f('Quiero que me muestres el péndulo', 0, 0, 0),
  f('Si la cuerda es muy larga el péndulo no va a moverse igual', 1, 1, 0),
  f('El periodo depende de la longitud ya que a mayor largo mayor recorrido', 1, 1, 1),
  f('Por más masa que le ponga el periodo no cambia', 1, 1, 0),
  f('Va a ser más rápido cuando la cuerda sea corta', 1, 1, 0),
  f('Cambiamos la cuerda y medimos tres veces', 1, 0, 0),
  f('Medimos el tiempo de diez vueltas con el cronómetro', 0, 0, 0),
  f('El que tiene la masa más grande se mueve más lento', 1, 1, 0),
  f('Porque la gravedad jala al péndulo hacia abajo', 1, 0, 1),
  f('Mi grupo cree que la altura de donde soltamos cambia el tiempo', 1, 1, 0),
  f('xq la cuerda es más larga se demora más', 1, 1, 1),
  f('Se demora mas xq la cuerda es larga', 1, 1, 1),
  f('El péndulo va a demorar más si la cuerda es larga', 1, 1, 0),
  f('Si la masa es mayor el péndulo va mas rapido', 1, 1, 0),
  f('La masa no hace nada', 1, 1, 0),
  f('Pesamos la masa con la balanza de la profe', 1, 0, 0),
  f('Más o menos 1,5 segundos', 0, 0, 0),
  f('No más cambiamos la longitud', 1, 0, 0),
  f('Si el hilo es más largo tarda más porque recorre más distancia', 1, 1, 1),
  f('Entonces la longitud es la que cambia el tiempo', 1, 1, 0),
  f('La masa pesa 200 gramos y la cuerda mide 50 centímetros', 1, 0, 0),
  // Lactasa
  f('Si caliento la leche la lactasa deja de funcionar porque se deforma', 1, 1, 1),
  f('A 70 grados la enzima ya no trabaja', 1, 1, 0),
  f('Si aumento el pH la enzima va a funcionar mejor', 1, 1, 0),
  f('Creo que la lactasa funciona más rápido a 37 grados', 1, 1, 0),
  f('La enzima se rompe con el calor porque es una proteína', 1, 1, 1),
  f('No creo que la temperatura influya', 1, 1, 0),
  f('Si la leche está fría la enzima trabaja lento', 1, 1, 0),
  f('Pienso que el pH cambia la velocidad de la enzima', 1, 1, 0),
  f('La lactasa rompe la lactosa en glucosa y galactosa', 0, 0, 0),
  f('Voy a subir la temperatura hasta 50 grados', 1, 0, 0),
  f('Pusimos la temperatura en 40 grados y corrimos la simulación', 1, 0, 0),
  f('El pH ácido hace que la lactasa trabaje más despacio', 1, 1, 0),
  f('No hay que calentar demasiado porque la enzima se daña', 1, 1, 1),
  f('¿Qué es la lactasa?', 0, 0, 0),
  f('¿Qué pasaría si caliento la leche?', 1, 0, 0),
  f('Quiero ver el intestino', 0, 0, 0),
  f('Si subimos la temperatura a 90 grados la enzima se desnaturaliza', 1, 1, 0),
  // Respiración y altitud
  f('En la altura respiramos más rápido porque hay menos oxígeno', 1, 1, 1),
  f('Si subimos a 4000 msnm el corazón late más rápido', 1, 1, 0),
  f('A mayor altitud la frecuencia respiratoria aumenta', 1, 1, 0),
  f('No me falta el aire en mi pueblo', 0, 0, 0),
  f('La altitud cambia cuánto aire entra', 1, 1, 0),
  // Conversación
  f('Hola', 0, 0, 0),
  f('Gracias profe', 0, 0, 0),
  f('Ya entendí', 0, 0, 0),
  f('No me sale', 0, 0, 0),
  f('Porque sí', 0, 0, 0),
  f('No sé por qué pasa eso', 0, 0, 0),
  f('Por favor repite la pregunta', 0, 0, 0),
  // Second batch: written AFTER the rules were fixed and kept even where the rules miss (no tuning on it).
  f('yo creo q si le ponemos mas peso se va a demorar mas', 1, 1, 0),
  f('profe la cuerda es de 40 cm', 1, 0, 0),
  f('si lo calentamos mucho se malogra', 1, 1, 0),
  f('la bolita pesa mas y por eso cae mas rapido', 1, 1, 1),
  f('ahora probamos con 80 cm de hilo', 1, 0, 0),
  f('el aire de arriba es mas ligero porque hay menos presion', 0, 0, 1),
  f('creo que no va a pasar nada', 0, 1, 0),
  f('cuando sube la temperatura la enzima se pone loca', 1, 1, 0),
  f('dime la respuesta', 0, 0, 0),
  f('tarda lo mismo con cualquier masa', 1, 1, 0),
  f('a mi me salio 2 segundos y a ellos 3', 0, 0, 0),
  f('creo que mientras mas largo el hilo mas se demora', 1, 1, 0),
];
