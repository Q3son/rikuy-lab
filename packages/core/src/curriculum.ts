/**
 * Mapa de conceptos y catálogo de prácticas.
 *
 * El mapa (nodos + relaciones) es la base de la analítica de exploración:
 * cuando un alumno pregunta algo que conecta dos sistemas distintos, se
 * registra como pensamiento relacional. Agregar un curso nuevo = agregar
 * nodos, relaciones y prácticas aquí, sin tocar el motor.
 */

export type SystemId =
  | 'digestivo'
  | 'respiratorio'
  | 'hepatico'
  | 'quimica'
  | 'fisica';

export type Level = 'sistema' | 'organo' | 'tejido' | 'celula' | 'molecula' | 'fenomeno';

export interface ConceptNode {
  id: string;
  label: string;
  system: SystemId;
  level: Level;
  /** Palabras o frases que lo identifican en lo que dice el alumno. */
  synonyms: string[];
  /** Escena 3D que representa este concepto, si existe. */
  sceneId?: string;
}

export interface ConceptEdge {
  from: string;
  to: string;
  relation: 'contiene' | 'produce' | 'actua_sobre' | 'depende_de' | 'se_relaciona';
}

export const CONCEPTS: ConceptNode[] = [
  // Digestivo, del sistema a la molécula
  { id: 'sistema_digestivo', label: 'Sistema digestivo', system: 'digestivo', level: 'sistema', synonyms: ['sistema digestivo', 'digestion', 'digestivo', 'digerir', 'digiere'], sceneId: 'digestivo' },
  { id: 'intestino_delgado', label: 'Intestino delgado', system: 'digestivo', level: 'organo', synonyms: ['intestino', 'intestino delgado', 'tripa'], sceneId: 'intestino' },
  { id: 'vellosidad', label: 'Vellosidad intestinal', system: 'digestivo', level: 'tejido', synonyms: ['vellosidad', 'vellosidades', 'velloso'], sceneId: 'vellosidad' },
  { id: 'enterocito', label: 'Enterocito', system: 'digestivo', level: 'celula', synonyms: ['enterocito', 'celula intestinal', 'borde en cepillo', 'microvellosidad'], sceneId: 'enterocito' },
  { id: 'lactasa', label: 'Lactasa', system: 'digestivo', level: 'molecula', synonyms: ['lactasa', 'enzima', 'enzimas'], sceneId: 'lactasa' },
  { id: 'lactosa', label: 'Lactosa', system: 'quimica', level: 'molecula', synonyms: ['lactosa', 'azucar de la leche', 'leche'], sceneId: 'lactasa' },
  { id: 'glucosa', label: 'Glucosa', system: 'quimica', level: 'molecula', synonyms: ['glucosa'] },
  { id: 'galactosa', label: 'Galactosa', system: 'quimica', level: 'molecula', synonyms: ['galactosa'] },
  { id: 'enlace_glucosidico', label: 'Enlace glucosídico', system: 'quimica', level: 'molecula', synonyms: ['enlace', 'enlace glucosidico', 'beta 1 4', 'union'] },
  { id: 'temperatura', label: 'Temperatura', system: 'fisica', level: 'fenomeno', synonyms: ['temperatura', 'calor', 'caliento', 'calentar', 'hervir', 'frio', 'grados'] },
  { id: 'ph', label: 'pH', system: 'quimica', level: 'fenomeno', synonyms: ['ph', 'acido', 'acidez', 'basico', 'alcalino'] },
  { id: 'desnaturalizacion', label: 'Desnaturalización', system: 'quimica', level: 'fenomeno', synonyms: ['desnaturaliza', 'desnaturalizacion', 'se rompe la enzima', 'se deforma'] },
  { id: 'intolerancia_lactosa', label: 'Intolerancia a la lactosa', system: 'digestivo', level: 'fenomeno', synonyms: ['intolerancia', 'intolerante', 'me cae mal la leche', 'leche deslactosada', 'sin lactosa'] },
  // Respiratorio
  { id: 'sistema_respiratorio', label: 'Sistema respiratorio', system: 'respiratorio', level: 'sistema', synonyms: ['respiratorio', 'respirar', 'respiracion', 'respiramos'], sceneId: 'respiratorio' },
  { id: 'pulmon', label: 'Pulmón', system: 'respiratorio', level: 'organo', synonyms: ['pulmon', 'pulmones'], sceneId: 'respiratorio' },
  { id: 'diafragma', label: 'Diafragma', system: 'respiratorio', level: 'organo', synonyms: ['diafragma'] },
  { id: 'altitud', label: 'Altitud', system: 'fisica', level: 'fenomeno', synonyms: ['altura', 'altitud', 'puna', 'soroche', 'msnm'] },
  // Hepático
  { id: 'higado', label: 'Hígado', system: 'hepatico', level: 'organo', synonyms: ['higado'], sceneId: 'higado' },
  { id: 'lobulillo_hepatico', label: 'Lobulillo hepático', system: 'hepatico', level: 'tejido', synonyms: ['lobulillo', 'lobulo', 'triada portal', 'vena central'], sceneId: 'lobulillo' },
  { id: 'hepatocito', label: 'Hepatocito', system: 'hepatico', level: 'celula', synonyms: ['hepatocito', 'celula del higado'] },
  // Física
  { id: 'pendulo', label: 'Péndulo simple', system: 'fisica', level: 'fenomeno', synonyms: ['pendulo', 'columpio', 'oscila', 'oscilacion'], sceneId: 'pendulo' },
  { id: 'periodo', label: 'Periodo de oscilación', system: 'fisica', level: 'fenomeno', synonyms: ['periodo', 'cuanto tarda', 'tiempo de ida y vuelta'] },
  { id: 'longitud', label: 'Longitud de la cuerda', system: 'fisica', level: 'fenomeno', synonyms: ['longitud', 'cuerda', 'largo', 'mas larga', 'mas corta'] },
  { id: 'gravedad', label: 'Gravedad', system: 'fisica', level: 'fenomeno', synonyms: ['gravedad', 'peso', 'cae'] },
];

export const EDGES: ConceptEdge[] = [
  { from: 'sistema_digestivo', to: 'intestino_delgado', relation: 'contiene' },
  { from: 'intestino_delgado', to: 'vellosidad', relation: 'contiene' },
  { from: 'vellosidad', to: 'enterocito', relation: 'contiene' },
  { from: 'enterocito', to: 'lactasa', relation: 'produce' },
  { from: 'lactasa', to: 'lactosa', relation: 'actua_sobre' },
  { from: 'lactosa', to: 'enlace_glucosidico', relation: 'contiene' },
  { from: 'lactosa', to: 'glucosa', relation: 'produce' },
  { from: 'lactosa', to: 'galactosa', relation: 'produce' },
  { from: 'lactasa', to: 'temperatura', relation: 'depende_de' },
  { from: 'lactasa', to: 'ph', relation: 'depende_de' },
  { from: 'temperatura', to: 'desnaturalizacion', relation: 'produce' },
  { from: 'lactasa', to: 'intolerancia_lactosa', relation: 'se_relaciona' },
  { from: 'sistema_respiratorio', to: 'pulmon', relation: 'contiene' },
  { from: 'sistema_respiratorio', to: 'diafragma', relation: 'contiene' },
  { from: 'diafragma', to: 'sistema_digestivo', relation: 'se_relaciona' },
  { from: 'altitud', to: 'sistema_respiratorio', relation: 'actua_sobre' },
  { from: 'higado', to: 'lobulillo_hepatico', relation: 'contiene' },
  { from: 'lobulillo_hepatico', to: 'hepatocito', relation: 'contiene' },
  { from: 'higado', to: 'sistema_digestivo', relation: 'se_relaciona' },
  { from: 'hepatocito', to: 'glucosa', relation: 'actua_sobre' },
  { from: 'pendulo', to: 'periodo', relation: 'produce' },
  { from: 'periodo', to: 'longitud', relation: 'depende_de' },
  { from: 'periodo', to: 'gravedad', relation: 'depende_de' },
];

export interface PracticeVariable {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface Practice {
  id: string;
  title: string;
  /** Competencia del área de Ciencia y Tecnología (MINEDU) a la que apunta. */
  competencia: string;
  guidingQuestion: string;
  /** Escena de entrada y ruta de zoom multiescala. */
  route: string[];
  variables: PracticeVariable[];
  /** Pistas progresivas: de la más general a la más concreta. Nunca la respuesta. */
  hints: string[];
  /** Avisos honestos sobre lo que la simulación simplifica. */
  limitations: string[];
}

export const PRACTICES: Practice[] = [
  {
    id: 'lactasa',
    title: '¿Cómo digiere la leche nuestro cuerpo?',
    competencia: 'Indaga mediante métodos científicos para construir sus conocimientos',
    guidingQuestion: '¿Qué crees que le pasa a la lactasa si calientas la leche?',
    route: ['digestivo', 'intestino', 'vellosidad', 'enterocito', 'lactasa'],
    variables: [
      { id: 'temperatura', label: 'Temperatura', unit: '°C', min: 0, max: 90, step: 1, default: 37 },
      { id: 'ph', label: 'pH', unit: '', min: 2, max: 10, step: 0.5, default: 6.5 },
    ],
    hints: [
      'Piensa en qué forma tiene la enzima y por qué esa forma importa.',
      'Las enzimas son proteínas. ¿Qué le pasa a una proteína como la clara de huevo cuando la calientas?',
      'Compara la actividad a 37 °C con la actividad a 70 °C. ¿Qué cambió en la forma de la lactasa?',
    ],
    limitations: [
      'La ruptura del enlace y la desnaturalización son animaciones didácticas, no una simulación molecular real.',
      'La curva de actividad es un modelo aproximado; la lactasa real varía según la fuente.',
    ],
  },
  {
    id: 'pendulo',
    title: '¿De qué depende el tiempo que tarda un péndulo?',
    competencia: 'Indaga mediante métodos científicos para construir sus conocimientos',
    guidingQuestion: 'Si alargas la cuerda, ¿el péndulo irá más rápido o más lento?',
    route: ['pendulo'],
    variables: [
      { id: 'longitud', label: 'Longitud', unit: 'm', min: 0.1, max: 2, step: 0.05, default: 0.5 },
      { id: 'masa', label: 'Masa', unit: 'kg', min: 0.05, max: 2, step: 0.05, default: 0.2 },
      { id: 'gravedad', label: 'Gravedad', unit: 'm/s²', min: 1.6, max: 24.8, step: 0.1, default: 9.8 },
    ],
    hints: [
      'Cambia una sola variable a la vez y mide el tiempo de 10 oscilaciones.',
      '¿Cambió el periodo cuando cambiaste la masa? ¿Y cuando cambiaste la longitud?',
      'Prueba con una longitud 4 veces mayor. ¿Cuántas veces cambió el periodo?',
    ],
    limitations: [
      'El modelo supone oscilaciones pequeñas y sin rozamiento del aire.',
    ],
  },
  {
    id: 'respiratorio',
    title: '¿Por qué en la altura respiramos más rápido?',
    competencia: 'Explica el mundo físico basándose en conocimientos científicos',
    guidingQuestion: 'En Puno o Cusco hay menos oxígeno por bocanada. ¿Qué crees que hace tu cuerpo?',
    route: ['respiratorio'],
    variables: [
      { id: 'altitud', label: 'Altitud', unit: 'msnm', min: 0, max: 5000, step: 100, default: 2335 },
    ],
    hints: [
      '¿Qué gas necesitan tus células y de dónde lo sacan?',
      'Si cada respiración trae menos oxígeno, ¿cómo podría el cuerpo compensarlo?',
    ],
    limitations: ['La frecuencia respiratoria mostrada es una aproximación ilustrativa, no un valor clínico.'],
  },
];

export const conceptById = new Map(CONCEPTS.map((c) => [c.id, c]));
export const practiceById = new Map(PRACTICES.map((p) => [p.id, p]));
