/**
 * Containers that put the Guardián (F10) in the app: the student check-in (Yo) and the two teacher views
 * (Clase > Acercarse, Reportes > Curso). Level 1 only; level-2 behaviour signals stay behind the
 * `guardianNivel2` flag and the five gates of `nivel2Disponible`.
 */
import { agregarCurso, generarSugerencias, nivel2Disponible } from '@rikuy/senales';
import { useMemo, useState } from 'react';
import { useBandejaGuardian } from './bandeja.ts';
import { DelCurso } from './DelCurso.tsx';
import { GuardianDemo } from './GuardianDemo.tsx';
import { ParaAcercarse } from './ParaAcercarse.tsx';

export interface IdentidadGrupo {
  estudianteId: string;
  claseId: string;
}

/** Student: "¿Cómo vamos?" check-in, "Necesito hablar" and the weekly pulse. */
export function CheckInPagina({ identidad }: { identidad: IdentidadGrupo }) {
  const agregarAutorreporte = useBandejaGuardian((s) => s.agregarAutorreporte);
  const agregarPedido = useBandejaGuardian((s) => s.agregarPedido);
  return <GuardianDemo identidad={identidad} onAutorreporte={agregarAutorreporte} onPedido={agregarPedido} />;
}

const nombrePaso = (paso: string) => (paso === 'medir' ? 'la medición' : paso);

/** Teacher: at most three "para acercarse" suggestions, worded for teaching, decided by the teacher. */
export function ParaAcercarsePagina({ nivel2 = false, alias = (id: string) => `Estudiante ${id.slice(-3)}` }: { nivel2?: boolean; alias?(id: string): string }) {
  const { pedidos, autorreportes, decisiones, decidir, apagado, esDemo } = useBandejaGuardian();
  // Level 2 (behaviour signals) needs the build flag plus the class, consent, switch and indicator gates;
  // none is signed in this build, so only the student-initiated level 1 inputs reach the teacher.
  const nivel2Activo = nivel2Disponible({ flagCompilacion: nivel2 }).disponible;
  const [ahora] = useState(() => Date.now());
  const { sugerencias } = useMemo(() => generarSugerencias({ senales: [], pedidos, autorreportes }, { ahora, nombrePaso }), [pedidos, autorreportes, ahora]);
  if (apagado) return <p className="dc-card">Rikuy Guardián está apagado para esta clase.</p>;
  const pendientes = sugerencias.filter((s) => !decisiones[s.id]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {esDemo ? <span className="rk-gd-chip">Datos de ejemplo</span> : null}
      <ParaAcercarse sugerencias={pendientes} alias={alias} onDecidir={decidir} />
      {nivel2Activo ? null : <p className="dc-muted">Nivel 1: solo lo que los grupos cuentan o piden. Las señales de conducta (nivel 2) están apagadas.</p>}
    </div>
  );
}

/** Teacher: class-level Guardián counts (suppressed under 5 participants). */
export function DelCursoPagina() {
  const { autorreportes, apagar, apagado, esDemo } = useBandejaGuardian();
  const [ahora] = useState(() => Date.now());
  const agregado = useMemo(() => {
    const inicio = autorreportes.reduce((min, a) => Math.min(min, Number(a.hlc.slice(0, 13))), ahora);
    return agregarCurso({ participantes: autorreportes.map((a) => a.estudianteId), autorreportes, eventos: [], inicioClaseMs: inicio, gruposTotal: 4, nombrePaso });
  }, [autorreportes, ahora]);
  if (apagado) return <p className="dc-card">Rikuy Guardián está apagado para esta clase.</p>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {esDemo ? <span className="rk-gd-chip">Datos de ejemplo</span> : null}
      <DelCurso agregado={agregado} onApagarClase={apagar} />
    </div>
  );
}
