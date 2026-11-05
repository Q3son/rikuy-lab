/**
 * Mock mode sample (4.5): what the reader returns for a typical "unidad/programación" of 2.º de secundaria,
 * Ciencia y Tecnología, in Arequipa. Example data only; the student names in it exist to show the privacy filter.
 */
import type { ItemExtraido, PlanExtraido } from './esquemas.ts';

const it = (tipo: ItemExtraido['tipo'], texto: string, pagina: number, confianza = 0.95, fragmento = texto): ItemExtraido => ({ tipo, texto, confianza, fuente: { pagina, fragmento } });

export function planSimulado(): PlanExtraido {
  return {
    tipoDocumento: 'programacion_anual',
    nivel: 'secundaria',
    grado: 2,
    area: 'Ciencia y Tecnología',
    institucion: 'I.E. de ejemplo',
    region: 'Arequipa',
    anio: 2026,
    unidades: [
      {
        titulo: 'Unidad 1: Indagamos el movimiento en nuestra ciudad',
        situacionSignificativa:
          'Muchos estudiantes llegan al colegio en combi por la avenida Ejército. Se preguntan por qué algunos viajes tardan más que otros y cómo se mide la velocidad.',
        periodo: { bimestre: 1, texto: 'I bimestre (marzo - mayo)' },
        fuente: { pagina: 1, fragmento: 'UNIDAD 1: Indagamos el movimiento en nuestra ciudad — I bimestre' },
        items: [
          it('competencia', 'Indaga mediante métodos científicos para construir conocimientos', 1, 0.97),
          it('capacidad', 'Problematiza situaciones', 1, 0.96),
          it('capacidad', 'Genera y registra datos e información', 1, 0.96),
          it(
            'desempeno',
            'Formula preguntas acerca de las variables que influyen en un hecho, fenómeno u objeto natural o tecnológico y selecciona aquella que puede ser indagada científicamente.',
            1,
            0.93,
          ),
          it('desempeno', 'Describe el movimiento rectilíneo uniforme relacionando distancia, tiempo y velocidad en situaciones cotidianas.', 1, 0.9),
          it('desempeno', 'Comprende el movimiento oscilatorio del péndulo y su periodo.', 2, 0.72, 'Comprende el mov. oscilatorio del péndulo y su periodo'),
          it('contenido', 'Movimiento: distancia, tiempo y velocidad', 2, 0.94),
          it('contenido', 'El péndulo simple: periodo y longitud de la cuerda', 2, 0.88),
          it('evidencia', 'Informe de indagación con tabla de datos y gráfica', 2, 0.91),
          it('instrumento', 'Lista de cotejo', 2, 0.97),
        ],
      },
      {
        titulo: 'Unidad 2: Energía y calor en la cocina arequipeña',
        situacionSignificativa:
          'En la preparación del adobo y del queso helado se calienta y se enfría. Como comentó la estudiante Rosa Quispe, la olla de barro tarda más en calentarse que la de aluminio.',
        periodo: { bimestre: 2, texto: 'II bimestre (mayo - julio)' },
        fuente: { pagina: 2, fragmento: 'UNIDAD 2: Energía y calor en la cocina arequipeña' },
        items: [
          it('competencia', 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', 2, 0.95),
          it('capacidad', 'Comprende y usa conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', 2, 0.93),
          it('desempeno', 'Explica que el calor se puede cuantificar y transferir de un cuerpo con mayor temperatura a otro de menor temperatura.', 3, 0.92),
          it('desempeno', 'Conoce las máquinas simples usadas en la construcción con sillar.', 3, 0.64, 'Conoce las maq. simples usadas en la construccion con sillar'),
          it('contenido', 'Calor y temperatura: transferencia de calor entre cuerpos', 3, 0.9),
          it('contenido', 'Trabajo, energía y máquinas simples: palancas y poleas', 3, 0.86),
          it('evidencia', 'Infografía sobre el calor en la cocina. Responsable: alumno Julio Mamani', 3, 0.8),
          it('instrumento', 'Rúbrica de evaluación', 3, 0.95),
        ],
      },
      {
        titulo: 'Unidad 3: Respiramos y nos nutrimos a 2335 m s. n. m.',
        situacionSignificativa: 'Los visitantes que llegan a Arequipa se cansan al subir escaleras. ¿Qué pasa en nuestro cuerpo con menos oxígeno? ¿Cómo aprovechamos los alimentos?',
        periodo: { bimestre: 3, texto: 'III bimestre (agosto - octubre)' },
        fuente: { pagina: 3, fragmento: 'UNIDAD 3: Respiramos y nos nutrimos a 2335 m s. n. m.' },
        items: [
          it('competencia', 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', 3, 0.95),
          it('desempeno', 'Describe cómo a través de los procesos de fotosíntesis y respiración se produce la energía que la célula utiliza para producir sustancias orgánicas.', 3, 0.94),
          it(
            'desempeno',
            'Establece semejanzas y diferencias entre las estructuras que han desarrollado los seres unicelulares y pluricelulares para realizar la función de nutrición.',
            4,
            0.9,
          ),
          it('desempeno', 'Propone procedimientos para observar, manipular la variable independiente, medir la variable dependiente y controlar la variable interviniente.', 4, 0.88),
          it('contenido', 'Respiración celular y frecuencia respiratoria en la altura', 4, 0.9),
          it('contenido', 'Digestión de la leche: enzimas y lactosa', 4, 0.85),
          it('evidencia', 'Tabla de datos de la frecuencia respiratoria del grupo', 4, 0.9),
          it('instrumento', 'Guía de observación', 4, 0.93),
        ],
      },
      {
        titulo: 'Unidad 4: Cuidamos el agua del río Chili',
        periodo: { bimestre: 4, texto: 'IV bimestre (octubre - diciembre)' },
        fuente: { pagina: 4, fragmento: 'UNIDAD 4: Cuidamos el agua del río Chili' },
        items: [
          it('desempeno', 'Justifica cómo las causas del cambio climático pueden ser mitigadas a partir del uso de fuentes de energía limpia en la generación de energía eléctrica.', 4, 0.91),
          it('desempeno', 'Participa en la campaña de limpieza del río Chili con su familia.', 4, 0.83),
          it('contenido', 'Ciclos biogeoquímicos y flujo de energía en el ecosistema del río', 4, 0.87),
          it('evidencia', 'Afiche para la campaña del río', 4, 0.9),
          it('instrumento', 'Lista de cotejo', 4, 0.96),
        ],
      },
    ],
  };
}
