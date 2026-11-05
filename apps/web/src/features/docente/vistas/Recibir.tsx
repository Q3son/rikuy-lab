import { construirEscenario, partirEscenario } from '@rikuy/evidencia';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EscanerQr } from '../componentes/EscanerQr.tsx';
import type { ProgresoRelevo, ReceptorRelevo } from '../puertos.ts';
import { useAcciones, useClase, useProyeccion, useServicios } from '../Proveedor.tsx';
import { marcosDeGrupo } from '../simulacion/receptor.ts';

function Anillo({ recibidos, total }: { recibidos: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg className="dc-anillo" viewBox="0 0 56 56" role="img" aria-label={`${recibidos} de ${total} partes leídas`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--rk-border)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--rk-primary)" strokeWidth="6" strokeDasharray={c} strokeDashoffset={c * (1 - recibidos / Math.max(total, 1))} transform="rotate(-90 28 28)" />
    </svg>
  );
}

interface Props {
  /** ms between simulated frames (tests use a small value). */
  ritmoSimulacionMs?: number;
}

/** T-08: receive a group's evidence by reading its animated QR. Repeated frames are ignored. */
export function Recibir({ ritmoSimulacionMs = 250 }: Props) {
  const srv = useServicios();
  const acciones = useAcciones();
  const esDemo = useClase((s) => s.esDemo);
  const { p } = useProyeccion();
  const claseId = p.clase?.id ?? null;
  const receptor = useRef<ReceptorRelevo | null>(null);
  const [progreso, setProgreso] = useState<ProgresoRelevo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [camara, setCamara] = useState(false);
  const temporizador = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    receptor.current = claseId ? srv.crearReceptor(claseId) : null;
  }, [claseId, srv]);
  useEffect(() => () => void (temporizador.current && clearInterval(temporizador.current)), []);

  const alCuadro = useCallback(
    (texto: string) => {
      const r = receptor.current;
      if (!r) return;
      const res = r.agregarCuadro(texto);
      setProgreso(res);
      if (res.estado === 'completo') {
        const { nuevos, ignorados } = acciones.ingestar(res.eventos);
        setAviso(nuevos > 0 ? `Recibido: ${nuevos} eventos nuevos${ignorados ? ` (${ignorados} ya estaban)` : ''}.` : 'Ese grupo ya estaba recibido. Nada se duplicó.');
        receptor.current = claseId ? srv.crearReceptor(claseId) : null;
      } else if (res.estado === 'otra_clase') {
        setAviso('Ese código es de otra clase. Pide al grupo que abra la clase de hoy.');
      }
    },
    [acciones, claseId, srv],
  );

  function simular() {
    if (!claseId) return;
    const esc = construirEscenario();
    const { porGrupo } = partirEscenario(esc);
    const yaUnidos = new Set(p.grupos.map((g) => g.apodo));
    const apodo = Object.keys(porGrupo).find((a) => !yaUnidos.has(a)) ?? Object.keys(porGrupo)[0];
    const dispositivo = porGrupo[apodo][0].dispositivo;
    const marcos = marcosDeGrupo(claseId, dispositivo, porGrupo[apodo], porGrupo[apodo][0].hlc);
    let i = 0;
    if (temporizador.current) clearInterval(temporizador.current);
    temporizador.current = setInterval(() => {
      alCuadro(marcos[i]);
      i += 1;
      if (i >= marcos.length && temporizador.current) {
        clearInterval(temporizador.current);
        temporizador.current = null;
      }
    }, ritmoSimulacionMs);
  }

  const cuadrosFaltan = progreso?.estado === 'parcial' ? progreso : null;
  return (
    <>
      <section className="dc-card" aria-labelledby="recibir">
        <h2 id="recibir">Recibir evidencia</h2>
        <p className="dc-muted">Apunta al QR animado del grupo y mantén el celular quieto unos 10 segundos. Los cuadros repetidos se ignoran.</p>
        {cuadrosFaltan ? (
          <div className="dc-row" role="status">
            <Anillo recibidos={cuadrosFaltan.recibidos} total={cuadrosFaltan.total} />
            <span>
              {cuadrosFaltan.recibidos} de {cuadrosFaltan.total} cuadros. Faltan {cuadrosFaltan.faltan}. Lo ya leído no se pierde.
            </span>
          </div>
        ) : null}
        {progreso?.estado === 'invalido' ? <p role="status" className="dc-muted">Ese código no es de Rikuy. Prueba con el QR animado del grupo.</p> : null}
        {aviso ? <p role="status"><strong>{aviso}</strong></p> : null}
        <div className="dc-row">
          <button type="button" className="dc-btn dc-btn--primary" onClick={() => setCamara((x) => !x)} aria-pressed={camara}>
            {camara ? 'Cerrar cámara' : 'Escanear siguiente'}
          </button>
          {esDemo ? (
            <button type="button" className="dc-btn dc-btn--tonal" onClick={simular}>
              Simular QR de un grupo
            </button>
          ) : null}
        </div>
        <EscanerQr activo={camara} onTexto={alCuadro} />
      </section>

      <section className="dc-card" aria-labelledby="hoy-recibido">
        <h2 id="hoy-recibido">Recibido hoy</h2>
        {p.grupos.length === 0 ? <p className="dc-muted">Todavía no llega ningún grupo. Con el hub, la evidencia llega sola.</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {p.grupos.map((g) => (
            <li key={g.id} className="dc-row" style={{ justifyContent: 'space-between' }}>
              <strong>Grupo {g.apodo}</strong>
              <span className="dc-chip dc-chip--ok">{p.respuestas.filter((r) => r.dato.grupoId === g.id).length + p.mediciones.filter((m) => m.dato.grupoId === g.id).length} registros</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
