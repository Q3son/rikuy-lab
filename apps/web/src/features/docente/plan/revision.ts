/**
 * Review of a read plan: pure state, tested without a DOM. Every item starts "pendiente"; the teacher accepts,
 * rejects or edits it (an edit is mapped to the CNEB again with the same rules). Only the approved plan is stored,
 * without rejected items. Nothing is used before approval.
 */
import {
  PRACTICAS_SUGERIBLES,
  curriculoCneb,
  limpiarPlan,
  mapearItem,
  mapearPlan,
  planSimulado,
  proponerMejoras,
  quitarNombresEstudiantes,
  resumir,
  type FuenteModelo,
  type ItemMapeado,
  type LecturaPlan,
  type MejorasPlan,
  type PlanExtraido,
  type PlanMapeado,
  type PracticaPropuesta,
} from '@rikuy/ai';

export type Decision = 'pendiente' | 'aceptado' | 'rechazado';
export interface ItemRevision extends ItemMapeado {
  decision: Decision;
  editado: boolean;
}
export interface UnidadRevision extends Omit<PlanMapeado['unidades'][number], 'items'> {
  items: ItemRevision[];
}
export interface RevisionPlan extends Omit<PlanMapeado, 'unidades'> {
  unidades: UnidadRevision[];
  privacidad: { retirados: number };
  fuente: FuenteModelo;
}

/** The approved class plan, as stored on this device. */
export interface PlanClase extends Omit<RevisionPlan, 'unidades'> {
  id: 'actual';
  aprobadoEn: string;
  unidades: Array<
    Omit<UnidadRevision, 'items'> & {
      items: Array<Omit<ItemRevision, 'decision'>>;
    }
  >;
  practicas: PracticaPropuesta[];
}

const curriculo = curriculoCneb();

export function iniciarRevision(l: LecturaPlan): RevisionPlan {
  return {
    ...l.plan,
    unidades: l.plan.unidades.map((u) => ({
      ...u,
      items: u.items.map((i) => ({
        ...i,
        decision: 'pendiente' as const,
        editado: false,
      })),
    })),
    privacidad: l.privacidad,
    fuente: l.fuente,
  };
}

/** Mock mode without a gateway: the sample plan, read, cleaned and mapped on the device. */
export function lecturaDeEjemplo(): LecturaPlan {
  const { plan, retirados } = limpiarPlan(planSimulado());
  return {
    plan: mapearPlan(plan, curriculo),
    privacidad: { retirados },
    fuente: {
      adaptador: 'gemini',
      fuente: 'ia-nube',
      modelo: 'simulado-gemini',
      simulado: true,
    },
  };
}

function cambiarItem(r: RevisionPlan, id: string, f: (i: ItemRevision) => ItemRevision): RevisionPlan {
  const unidades = r.unidades.map((u) => ({
    ...u,
    items: u.items.map((i) => (i.id === id ? f(i) : i)),
  }));
  return { ...r, unidades, resumen: resumir(unidades) };
}

export const decidir = (r: RevisionPlan, id: string, decision: Decision) => cambiarItem(r, id, (i) => ({ ...i, decision }));

/** The teacher's wording replaces the read one; it is cleaned and mapped again, and counts as accepted. */
export function editar(r: RevisionPlan, id: string, texto: string): RevisionPlan {
  const limpio = quitarNombresEstudiantes(texto.trim()).texto;
  if (!limpio) return r;
  const alcance = {
    nivel: r.nivel ?? 'secundaria',
    ...(r.grado !== undefined ? { grado: r.grado } : {}),
  } as const;
  return cambiarItem(r, id, (i) => {
    const correspondencia = mapearItem({ ...i, texto: limpio }, curriculo, alcance);
    const factor = correspondencia.estado === 'no_aplica' ? 1 : correspondencia.puntaje;
    return {
      ...i,
      texto: limpio,
      editado: true,
      decision: 'aceptado',
      correspondencia,
      confianzaTotal: Number(factor.toFixed(2)),
    };
  });
}

export const aceptarPendientes = (r: RevisionPlan): RevisionPlan => {
  const unidades = r.unidades.map((u) => ({
    ...u,
    items: u.items.map((i) => (i.decision === 'pendiente' ? { ...i, decision: 'aceptado' as const } : i)),
  }));
  return { ...r, unidades };
};

export function contar(r: RevisionPlan): Record<Decision, number> {
  const c: Record<Decision, number> = {
    pendiente: 0,
    aceptado: 0,
    rechazado: 0,
  };
  for (const u of r.unidades) for (const i of u.items) c[i.decision]++;
  return c;
}

/** The plan as the extractor shape (for the suggestions), without rejected items. */
export function comoPlanExtraido(r: RevisionPlan): PlanExtraido {
  return {
    tipoDocumento: r.tipoDocumento,
    ...(r.nivel ? { nivel: r.nivel } : {}),
    ...(r.grado !== undefined ? { grado: r.grado } : {}),
    ...(r.area ? { area: r.area } : {}),
    ...(r.anio ? { anio: r.anio } : {}),
    unidades: r.unidades.map((u) => ({
      titulo: u.titulo,
      ...(u.situacionSignificativa ? { situacionSignificativa: u.situacionSignificativa } : {}),
      ...(u.periodo ? { periodo: u.periodo } : {}),
      items: u.items
        .filter((i) => i.decision !== 'rechazado')
        .map(({ tipo, texto, confianza, fuente }) => ({
          tipo,
          texto,
          confianza,
          fuente,
        })),
    })),
  };
}

/** Deterministic suggestions, computed on the device (no network needed). */
export function mejorar(r: RevisionPlan): MejorasPlan {
  return proponerMejoras(mapearPlan(comoPlanExtraido(r), curriculo), curriculo, PRACTICAS_SUGERIBLES);
}

/** Approve: pending items are accepted, rejected ones are dropped; only the chosen practices are kept. */
export function aprobar(r: RevisionPlan, practicas: PracticaPropuesta[], ahora: Date): PlanClase {
  const a = aceptarPendientes(r);
  const unidades = a.unidades.map((u) => ({
    ...u,
    items: u.items.filter((i) => i.decision === 'aceptado').map(({ decision: _d, ...i }) => i),
  }));
  return {
    ...a,
    id: 'actual',
    aprobadoEn: ahora.toISOString(),
    unidades,
    resumen: resumir(unidades),
    practicas,
  };
}

/** The approved desempeños with a CNEB id, for the Creador picker. */
export function desempenosDelPlan(p: PlanClase): Array<{
  unidad: string;
  texto: string;
  ref: {
    nivel: 'primaria' | 'secundaria';
    grado: number;
    competencia: number;
    desempeno: number;
  };
  textoOficial: string;
}> {
  return p.unidades.flatMap((u) =>
    u.items.flatMap((i) => {
      const c = i.correspondencia;
      if (i.tipo !== 'desempeno' || c.desempeno === undefined || !c.nivel || c.grado === undefined || c.competencia === undefined || !c.textoOficial) return [];
      return [
        {
          unidad: u.titulo,
          texto: i.texto,
          ref: {
            nivel: c.nivel,
            grado: c.grado,
            competencia: c.competencia,
            desempeno: c.desempeno,
          },
          textoOficial: c.textoOficial,
        },
      ];
    }),
  );
}
