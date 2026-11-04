/**
 * Analítica de aprendizaje: mide cómo razona el alumno, no solo si acierta.
 *
 * Las funciones heurísticas de este archivo funcionan sin conexión y sin IA.
 * Cuando hay un LLM disponible, el servidor reemplaza la clasificación por
 * la del modelo, pero el formato del evento es el mismo.
 */
import { CONCEPTS, conceptById } from './curriculum.ts';

export type QuestionType = 'factual' | 'causal' | 'hipotetica' | 'relacional' | 'orden' | 'otro';

export interface Rubric {
  /** ¿Nombra la variable que cambia? 0/1 */
  variable: 0 | 1;
  /** ¿Predice un resultado? 0/1 */
  prediccion: 0 | 1;
  /** ¿Justifica con un porqué? 0/1 */
  justificacion: 0 | 1;
}

export interface LearningEvent {
  id: string;
  ts: string;
  /** Seudónimo de grupo (G1, G2...). Nunca nombres reales. */
  grupo: string;
  practica: string;
  kind: 'pregunta' | 'hipotesis' | 'conclusion' | 'pista' | 'accion' | 'cambio_variable';
  texto?: string;
  tipo_pregunta?: QuestionType;
  conceptos?: string[];
  rubrica?: Rubric;
  /** true si conecta conceptos de dos o más sistemas distintos. */
  relacional?: boolean;
  pista_nivel?: number;
  conclusion_correcta?: boolean | null;
  variable?: { id: string; valor: number };
  /** Origen de la clasificación, para transparencia ante el docente. */
  clasificado_por?: 'reglas' | 'llm';
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractConcepts(text: string): string[] {
  const t = ` ${normalize(text)} `;
  const found: string[] = [];
  for (const c of CONCEPTS) {
    if (c.synonyms.some((s) => t.includes(` ${normalize(s)} `) || t.includes(` ${normalize(s)}`))) {
      found.push(c.id);
    }
  }
  return found;
}

export function isRelational(conceptIds: string[]): boolean {
  const systems = new Set(conceptIds.map((id) => conceptById.get(id)?.system).filter(Boolean));
  return systems.size >= 2 && conceptIds.length >= 2;
}

export function classifyQuestion(text: string): QuestionType {
  const t = normalize(text);
  const concepts = extractConcepts(text);
  if (/^(muestra|muestrame|quiero ver|ensename|ve a|anda a|gira|rota|acerca|aleja|para|pausa|corre|inicia)/.test(t)) return 'orden';
  if (/que (tiene que ver|relacion)|como se relaciona|se conecta|influye|afecta a/.test(t) && concepts.length >= 2) return 'relacional';
  if (/que pasaria si|que pasa si|y si |si (caliento|calentamos|aumento|subo|bajo|cambio|alargo|acorto)/.test(t)) return 'hipotetica';
  if (/por que|como es que|como funciona|para que sirve|cual es la causa/.test(t)) return 'causal';
  if (/que es|cual es|donde (esta|queda)|cuantos|como se llama|que forma/.test(t)) return 'factual';
  if (isRelational(concepts)) return 'relacional';
  return 'otro';
}

/**
 * Rúbrica de 0 a 3 para una hipótesis. Heurística transparente:
 * el docente ve las frases que la sustentan y puede corregirla.
 */
export function scoreHypothesis(text: string): Rubric {
  const t = normalize(text);
  const concepts = extractConcepts(text);
  const variable: 0 | 1 = concepts.some((c) => ['temperatura', 'ph', 'longitud', 'gravedad', 'altitud'].includes(c)) || /si (cambio|aumento|subo|bajo|caliento|alargo)/.test(t) ? 1 : 0;
  const prediccion: 0 | 1 = /(va a|vamos a|sera|aumenta|disminuye|baja|sube|deja de|ya no|mas rapido|mas lento|menos|mas|se rompe|funciona)/.test(t) ? 1 : 0;
  const justificacion: 0 | 1 = /(porque|ya que|debido|por eso|pues|entonces)/.test(t) ? 1 : 0;
  return { variable, prediccion, justificacion };
}

export function rubricScore(r: Rubric): number {
  return r.variable + r.prediccion + r.justificacion;
}

/** Enriquecer un texto del alumno con la analítica heurística. */
export function analyzeUtterance(text: string): Pick<LearningEvent, 'tipo_pregunta' | 'conceptos' | 'relacional' | 'rubrica' | 'clasificado_por'> {
  const conceptos = extractConcepts(text);
  const tipo_pregunta = classifyQuestion(text);
  const rubrica = tipo_pregunta === 'hipotetica' ? scoreHypothesis(text) : undefined;
  return { tipo_pregunta, conceptos, relacional: isRelational(conceptos), rubrica, clasificado_por: 'reglas' };
}

// ---------------------------------------------------------------------------
// Agregación para el panel docente
// ---------------------------------------------------------------------------

export interface GroupSummary {
  grupo: string;
  preguntas: number;
  porTipo: Record<QuestionType, number>;
  razonamientoPromedio: number | null;
  pistas: number;
  conclusiones: number;
  conclusionesCorrectas: number;
  conceptos: string[];
  relacionales: number;
  /** Frases reales que sustentan los indicadores (transparencia). */
  evidencias: string[];
  /** Recomendación accionable para el docente. Orienta, no califica. */
  sugerencia: string;
}

export interface ClassSummary {
  totalEventos: number;
  grupos: GroupSummary[];
  /** Cuántos grupos exploraron cada concepto (mapa de calor). */
  mapaConceptos: Record<string, number>;
  porTipo: Record<QuestionType, number>;
  recomendaciones: string[];
}

const EMPTY_TYPES = (): Record<QuestionType, number> => ({ factual: 0, causal: 0, hipotetica: 0, relacional: 0, orden: 0, otro: 0 });

export function summarize(events: LearningEvent[]): ClassSummary {
  const byGroup = new Map<string, LearningEvent[]>();
  for (const e of events) {
    if (!byGroup.has(e.grupo)) byGroup.set(e.grupo, []);
    byGroup.get(e.grupo)!.push(e);
  }

  const porTipo = EMPTY_TYPES();
  const mapaConceptos: Record<string, number> = {};
  const grupos: GroupSummary[] = [];

  for (const [grupo, evs] of byGroup) {
    const tipos = EMPTY_TYPES();
    const conceptSet = new Set<string>();
    const scores: number[] = [];
    let pistas = 0;
    let conclusiones = 0;
    let correctas = 0;
    let relacionales = 0;
    const evidencias: string[] = [];

    for (const e of evs) {
      if (e.kind === 'pregunta' && e.tipo_pregunta) {
        tipos[e.tipo_pregunta]++;
        porTipo[e.tipo_pregunta]++;
      }
      if (e.kind === 'pista') pistas++;
      if (e.kind === 'conclusion') {
        conclusiones++;
        if (e.conclusion_correcta) correctas++;
      }
      if (e.rubrica) scores.push(rubricScore(e.rubrica));
      if (e.relacional) {
        relacionales++;
        if (e.texto && evidencias.length < 3) evidencias.push(e.texto);
      }
      for (const c of e.conceptos ?? []) conceptSet.add(c);
    }
    for (const c of conceptSet) mapaConceptos[c] = (mapaConceptos[c] ?? 0) + 1;

    const preguntas = Object.values(tipos).reduce((a, b) => a + b, 0);
    const razonamientoPromedio = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    grupos.push({
      grupo,
      preguntas,
      porTipo: tipos,
      razonamientoPromedio,
      pistas,
      conclusiones,
      conclusionesCorrectas: correctas,
      conceptos: [...conceptSet],
      relacionales,
      evidencias,
      sugerencia: suggestFor({ preguntas, tipos, razonamientoPromedio, pistas, conclusiones }),
    });
  }

  grupos.sort((a, b) => a.grupo.localeCompare(b.grupo));
  return { totalEventos: events.length, grupos, mapaConceptos, porTipo, recomendaciones: classRecommendations(grupos) };
}

function suggestFor(g: { preguntas: number; tipos: Record<QuestionType, number>; razonamientoPromedio: number | null; pistas: number; conclusiones: number }): string {
  if (g.preguntas === 0) return 'Aún no participa. Invitar al grupo a hacer una primera pregunta.';
  if (g.tipos.hipotetica === 0) return 'Pregunta pero no plantea hipótesis. Proponer: "¿qué crees que pasaría si...?"';
  if (g.razonamientoPromedio !== null && g.razonamientoPromedio < 2) return 'Sus hipótesis no justifican. Pedir que expliquen el porqué de su predicción.';
  if (g.pistas >= 3 && g.conclusiones === 0) return 'Usa muchas pistas sin concluir. Acompañar al grupo en el cierre.';
  if (g.tipos.relacional > 0) return 'Conecta conceptos entre sistemas. Proponer un reto de mayor nivel.';
  return 'Avanza bien. Pedir que formule su conclusión con sus palabras.';
}

function classRecommendations(grupos: GroupSummary[]): string[] {
  const recs: string[] = [];
  const sinHipotesis = grupos.filter((g) => g.porTipo.hipotetica === 0).length;
  if (sinHipotesis > grupos.length / 2) recs.push(`${sinHipotesis} de ${grupos.length} grupos no formularon hipótesis: conviene modelar una en voz alta.`);
  const sinConclusion = grupos.filter((g) => g.conclusiones === 0).length;
  if (sinConclusion > 0) recs.push(`${sinConclusion} grupo(s) sin conclusión: reservar 5 minutos de cierre.`);
  const relacional = grupos.filter((g) => g.relacionales > 0).length;
  if (relacional > 0) recs.push(`${relacional} grupo(s) conectaron conceptos entre sistemas: buen momento para una pregunta integradora.`);
  if (!recs.length) recs.push('Sin alertas. Revisar las conclusiones de cada grupo.');
  return recs;
}
