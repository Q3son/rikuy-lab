/**
 * The Creador chain (5.4 F7):
 *   CNEB performance -> Gemini draft -> deterministic verifier (exact quote, no answer-revealing hint)
 *   -> Muse review -> teacher edit/approve (verifier runs again) -> signature (`firma.ts`).
 * The AI proposes, the rules decide, the teacher confirms (4.1). Everything fails closed.
 */
import { Practica, type RecursoExhibicion } from '@rikuy/contracts';
import type { CatalogoDesempenos, CatalogoPracticas } from './catalogo.ts';
import type { Enrutador, Interruptores, NombreAdaptador } from './enrutador.ts';
import type { BorradorPractica, ResultadoEsperado, SolicitudPractica } from './esquemas.ts';
import { canonico, sha256Hex } from './firma.ts';
import type { FalloIA } from './puertos.ts';
import { err, ok, type Result } from './result.ts';
import { anonimizar } from './texto.ts';
import { citaLiteral, verificarBorrador, type ContextoVerificacion, type Hallazgo, type ResultadoVerificacion } from './verificador.ts';

export interface DepsCreador {
  enrutador: Enrutador;
  catalogo: CatalogoDesempenos;
  practicas: CatalogoPracticas;
  nuevoId(): string;
}
export interface PeticionCreador {
  colegioId: string;
  interruptores?: Interruptores;
}

export interface Revision {
  por: string;
  veredicto: 'ok' | 'observado';
  notas: string[];
}
export interface FuenteModelo {
  adaptador: NombreAdaptador;
  fuente: string;
  modelo: string;
  simulado: boolean;
}
export interface PictogramaBorrador {
  id: string;
  descripcion: string;
  imagen?: { mime: string; base64: string };
}

export interface PropuestaCreador {
  practica: Practica; // estado: 'borrador'
  resultadoEsperado: ResultadoEsperado; // teacher-only, never published
  recursos: RecursoExhibicion[]; // revisado: false until the teacher approves
  guionVideo?: string[];
  pictogramas: PictogramaBorrador[];
  verificacion: ResultadoVerificacion;
  revisiones: Revision[];
  fuentes: { generador: FuenteModelo; revisor?: FuenteModelo };
  textoOficial: string;
}

export type SalidaCreador =
  | { estado: 'propuesta'; propuesta: PropuestaCreador }
  | { estado: 'rechazado'; hallazgos: Hallazgo[] }
  | { estado: 'catalogo'; fallo: FalloIA; catalogo: Practica[] };

const aBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const contexto = (deps: DepsCreador, ref: SolicitudPractica['desempeno']): ContextoVerificacion => ({
  desempeno: ref,
  textoOficial: (r) => deps.catalogo.textoOficial(r),
});

async function crearRecurso<T extends RecursoExhibicion['tipo']>(tipo: T, id: string, contenido: unknown, extra: object): Promise<RecursoExhibicion> {
  const json = canonico(contenido);
  return {
    tipo,
    id,
    lengua: 'es',
    revisado: false,
    licencia: 'CC-BY-4.0',
    autoria: 'Borrador con IA, pendiente de revisión de la docente',
    sha256: await sha256Hex(json),
    bytes: new TextEncoder().encode(json).length,
    precache: 'bajo_demanda',
    ...extra,
  } as RecursoExhibicion;
}

async function recursosDeBorrador(b: BorradorPractica, ref: SolicitudPractica['desempeno']): Promise<RecursoExhibicion[]> {
  const out: RecursoExhibicion[] = [];
  if (b.quiz && b.quiz.length > 0) {
    const preguntas = b.quiz.map((p) => ({ ...p, desempeno: { competencia: ref.competencia, desempeno: ref.desempeno } }));
    out.push(await crearRecurso('quiz', 'quiz-1', preguntas, { preguntas }));
  }
  if (b.diagrama) out.push(await crearRecurso('diagrama', 'diagrama-1', b.diagrama, { svg: b.diagrama.svg, etiquetas: { es: b.diagrama.etiquetas } }));
  return out;
}

function ensamblarPractica(deps: DepsCreador, s: SolicitudPractica, b: BorradorPractica, procedencia: Practica['procedencia']): Practica {
  return Practica.parse({
    id: deps.nuevoId(),
    version: 1,
    titulo: b.titulo,
    desempeno: { ...s.desempeno, cita: b.citaDesempeno },
    preguntaGuia: b.preguntaGuia,
    prediccionRequerida: true,
    materiales: b.materiales,
    variables: b.variables,
    protocolo: b.protocolo,
    ...(b.modeloId ? { modelo: { id: b.modeloId, version: 1 } } : {}),
    pistas: b.pistas,
    limitaciones: b.limitaciones,
    procedencia,
    estado: 'borrador',
  });
}

function aCatalogo(deps: DepsCreador, s: SolicitudPractica, fallo: FalloIA): SalidaCreador {
  return {
    estado: 'catalogo',
    fallo,
    catalogo: deps.practicas.listar({ nivel: s.desempeno.nivel, grado: s.desempeno.grado, competencia: s.desempeno.competencia }),
  };
}

export async function ejecutarCadena(deps: DepsCreador, peticion: PeticionCreador, solicitudEntrada: SolicitudPractica): Promise<SalidaCreador> {
  const interruptores = peticion.interruptores ?? {};
  const pet = { colegioId: peticion.colegioId, interruptores };
  // Free text leaves the device only anonymized (4.4).
  const s: SolicitudPractica = { ...solicitudEntrada, ...(solicitudEntrada.tema ? { tema: anonimizar(solicitudEntrada.tema) } : {}) };
  const ctxV = contexto(deps, s.desempeno);

  // 1. The requested performance must exist and the quote must be literal.
  const oficial = deps.catalogo.textoOficial(s.desempeno);
  if (oficial === undefined) return { estado: 'rechazado', hallazgos: [{ regla: 'desempeno_inexistente', mensaje: 'El desempeño pedido no existe en el currículo cargado.', ruta: 'desempeno' }] };
  if (!citaLiteral(s.desempeno.cita, oficial)) return { estado: 'rechazado', hallazgos: [{ regla: 'cita_literal', mensaje: 'La cita pedida no es una subcadena exacta del desempeño oficial.', ruta: 'desempeno.cita' }] };

  // 2. Draft (Gemini), verified; one retry feeding the findings back.
  let gen = await deps.enrutador.ejecutar('generarPractica', pet, (impl, ctx) => impl.generar(s, ctx));
  if (!gen.resultado.ok) return aCatalogo(deps, s, gen.resultado.error);
  let borrador = gen.resultado.valor;
  let verificacion = verificarBorrador(borrador, ctxV);
  if (!verificacion.ok) {
    const correcciones = verificacion.hallazgos.map((h) => `${h.regla}: ${h.mensaje}`).slice(0, 20);
    const primeros = verificacion.hallazgos;
    gen = await deps.enrutador.ejecutar('generarPractica', pet, (impl, ctx) => impl.generar({ ...s, correcciones }, ctx));
    if (!gen.resultado.ok) return { estado: 'rechazado', hallazgos: primeros };
    borrador = gen.resultado.valor;
    verificacion = verificarBorrador(borrador, ctxV);
    if (!verificacion.ok) return { estado: 'rechazado', hallazgos: verificacion.hallazgos };
  }
  const generador: FuenteModelo = { adaptador: gen.adaptador!, fuente: gen.fuente!, modelo: gen.modelo!, simulado: gen.simulado ?? false };

  // 3. Second reviewer (Muse). If it is down, the verifier alone is the floor.
  const revisiones: Revision[] = [{ por: 'verificador', veredicto: 'ok', notas: [] }];
  let revisor: FuenteModelo | undefined;
  const rev = await deps.enrutador.ejecutar('revisarPractica', pet, (impl, ctx) => impl.revisar(borrador, ctx));
  if (rev.resultado.ok) {
    revisiones.push({ por: 'muse', veredicto: rev.resultado.valor.veredicto, notas: rev.resultado.valor.observaciones });
    revisor = { adaptador: rev.adaptador!, fuente: rev.fuente!, modelo: rev.modelo!, simulado: rev.simulado ?? false };
  }

  // 4. Pictograms (optional; no text inside the image).
  const pictogramas: PictogramaBorrador[] = [];
  if (s.recursos.pictogramas) {
    for (const p of borrador.pictogramas ?? []) {
      const img = await deps.enrutador.ejecutar('pictogramas', pet, (impl, ctx) => impl.generar({ id: p.id, descripcion: p.descripcion }, ctx));
      if (img.resultado.ok) {
        const bytes = new Uint8Array(await img.resultado.valor.arrayBuffer());
        pictogramas.push({ ...p, imagen: { mime: img.resultado.valor.type || 'image/png', base64: aBase64(bytes) } });
      } else pictogramas.push({ ...p });
    }
  }

  const practica = ensamblarPractica(deps, s, borrador, {
    generadoPor: 'ia+docente',
    modelos: [generador.modelo, ...(revisor ? [revisor.modelo] : [])],
    revisiones,
  });
  return {
    estado: 'propuesta',
    propuesta: {
      practica,
      resultadoEsperado: borrador.resultadoEsperado,
      recursos: s.recursos.quiz || s.recursos.diagrama ? (await recursosDeBorrador(borrador, s.desempeno)).filter((r) => (r.tipo === 'quiz' ? s.recursos.quiz : s.recursos.diagrama)) : [],
      ...(s.recursos.guionVideo && borrador.guionVideo ? { guionVideo: borrador.guionVideo } : {}),
      pictogramas,
      verificacion,
      revisiones,
      fuentes: { generador, ...(revisor ? { revisor } : {}) },
      textoOficial: oficial,
    },
  };
}

/** Rebuilds the verifiable draft from a (possibly edited) proposal. */
export function borradorDesdePropuesta(p: PropuestaCreador): BorradorPractica {
  const quiz = p.recursos.find((r) => r.tipo === 'quiz');
  const diagrama = p.recursos.find((r) => r.tipo === 'diagrama');
  const pr = p.practica;
  return {
    titulo: pr.titulo,
    preguntaGuia: pr.preguntaGuia,
    citaDesempeno: pr.desempeno.cita,
    materiales: pr.materiales,
    variables: pr.variables,
    protocolo: pr.protocolo,
    ...(pr.modelo ? { modeloId: pr.modelo.id } : {}),
    pistas: pr.pistas,
    limitaciones: pr.limitaciones,
    resultadoEsperado: p.resultadoEsperado,
    ...(quiz && quiz.tipo === 'quiz' ? { quiz: quiz.preguntas.map(({ enunciado, opciones, correcta, retro }) => ({ enunciado, opciones, correcta, retro })) } : {}),
    ...(diagrama && diagrama.tipo === 'diagrama' ? { diagrama: { svg: diagrama.svg, etiquetas: diagrama.etiquetas.es ?? {} } } : {}),
    ...(p.guionVideo ? { guionVideo: p.guionVideo } : {}),
    pictogramas: p.pictogramas.map(({ id, descripcion }) => ({ id, descripcion })),
  };
}

export interface AprobacionDocente {
  docente: string;
}
export interface PropuestaAprobada {
  practica: Practica; // estado: 'aprobada'
  recursos: RecursoExhibicion[]; // revisado: true
}

/**
 * Teacher approval. The verifier runs again over the edited content: if it fails, the draft cannot be approved.
 */
export async function aprobarPropuesta(deps: DepsCreador, propuesta: PropuestaCreador, aprobacion: AprobacionDocente): Promise<Result<PropuestaAprobada, Hallazgo[]>> {
  const pr = propuesta.practica;
  const v = verificarBorrador(borradorDesdePropuesta(propuesta), contexto(deps, pr.desempeno));
  if (!v.ok) return err(v.hallazgos);
  const aprobada = Practica.safeParse({
    ...pr,
    estado: 'aprobada',
    procedencia: { ...pr.procedencia, revisiones: [...pr.procedencia.revisiones, { por: aprobacion.docente, veredicto: 'ok', notas: [] }] },
  });
  if (!aprobada.success) return err([{ regla: 'variables', mensaje: 'La práctica editada no cumple el esquema.' }]);
  return ok({ practica: aprobada.data, recursos: propuesta.recursos.map((r) => ({ ...r, revisado: true })) });
}
