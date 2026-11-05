/**
 * "Mi plan": the teacher uploads her own planning document (PDF or photos), reviews what was read next to its CNEB
 * match and the literal source, accepts/rejects/edits each item, reads the suggestions and approves. Only the
 * approved plan is stored on this device. No network: the upload waits in a local queue.
 */
import type { CorrespondenciaCneb, MejorasPlan, PracticaPropuesta } from '@rikuy/ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { almacenPlan, type AlmacenPlan } from './almacenPlan.ts';
import { ErrorSinRed, crearClientePlan, type ClientePlan } from './clientePlan.ts';
import { aprobar, contar, decidir, editar, iniciarRevision, lecturaDeEjemplo, mejorar, type ItemRevision, type PlanClase, type RevisionPlan } from './revision.ts';
import './plan.css';

type Fase = 'inicio' | 'leyendo' | 'en_cola' | 'revision' | 'aprobado';

interface Props {
  cliente?: ClientePlan;
  almacen?: AlmacenPlan;
  ahora?: () => Date;
  enLinea?: () => boolean;
}

const TIPOS: Record<ItemRevision['tipo'], string> = {
  competencia: 'Competencia',
  capacidad: 'Capacidad',
  desempeno: 'Desempeño',
  contenido: 'Contenido',
  evidencia: 'Evidencia',
  instrumento: 'Instrumento',
};

const pct = (x: number) => `${Math.round(x * 100)} %`;
const fecha = (iso: string) => iso.split('-').reverse().join('/');
const clavePractica = (p: PracticaPropuesta) => `${p.unidad}:${p.slug}`;

function EstadoCneb({ c }: { c: CorrespondenciaCneb }) {
  if (c.estado === 'exacta') return <span className="dc-chip dc-chip--ok">CNEB exacta{c.literal ? ' (literal)' : ''}</span>;
  if (c.estado === 'aproximada') return <span className="dc-chip dc-chip--warn">CNEB aproximada · {pct(c.puntaje)}</span>;
  if (c.estado === 'no_aplica') return <span className="dc-chip dc-chip--off">No se mapea al CNEB</span>;
  return <span className="dc-chip dc-chip--off pl-sin">Sin correspondencia CNEB</span>;
}

/** The approved plan, for "Mi plan", "Preparar" and the Creador. */
export function ResumenPlanClase({ plan, compacto = false }: { plan: PlanClase; compacto?: boolean }) {
  return (
    <section className="dc-card" aria-labelledby="pl-resumen">
      <h2 id="pl-resumen">Plan de clase aprobado</h2>
      <p className="dc-muted" style={{ margin: 0 }}>
        {[plan.grado ? `${plan.grado}.º de ${plan.nivel ?? 'secundaria'}` : undefined, plan.area, plan.region].filter(Boolean).join(' · ')} · {plan.resumen.total} elementos · aprobado el{' '}
        {fecha(plan.aprobadoEn.slice(0, 10))}
      </p>
      {!compacto && (
        <ol className="pl-unidades">
          {plan.unidades.map((u) => (
            <li key={u.indice}>
              <strong>{u.titulo}</strong> <span className="dc-muted">{u.periodo?.texto ?? ''}</span>
            </li>
          ))}
        </ol>
      )}
      {plan.practicas.length > 0 && (
        <>
          <h3 className="pl-h3">Prácticas del museo en el calendario</h3>
          <ul className="pl-lista">
            {plan.practicas.map((p) => (
              <li key={clavePractica(p)}>
                {fecha(p.fechaSugerida)}
                {p.fechaAproximada ? ' (aprox.)' : ''} · {p.titulo} · <span className="dc-muted">Unidad {p.unidad}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Item({ i, onDecidir, onEditar }: { i: ItemRevision; onDecidir: (d: ItemRevision['decision']) => void; onEditar: (texto: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(i.texto);
  const c = i.correspondencia;
  return (
    <article className={`pl-item pl-item--${i.decision}`} aria-label={i.texto}>
      <div className="pl-col">
        <span className="pl-etq">
          {TIPOS[i.tipo]} · lectura {pct(i.confianza)}
        </span>
        {editando ? (
          <>
            <label className="pl-etq" htmlFor={`ed-${i.id}`}>
              Tu redacción
            </label>
            <textarea id={`ed-${i.id}`} className="dc-input" rows={3} value={texto} onChange={(e) => setTexto(e.currentTarget.value)} />
            <button
              type="button"
              className="dc-btn dc-btn--primary"
              onClick={() => {
                onEditar(texto);
                setEditando(false);
              }}
            >
              Guardar cambio
            </button>
          </>
        ) : (
          <p className="pl-texto">
            {i.texto}
            {i.editado ? <span className="dc-muted"> (editado)</span> : null}
          </p>
        )}
      </div>
      <div className="pl-col">
        <span className="pl-etq">Correspondencia CNEB</span>
        <EstadoCneb c={c} />
        {c.id ? <code className="pl-id">{c.id}</code> : null}
        {c.textoOficial ? <blockquote className="pl-oficial">{c.textoOficial}</blockquote> : null}
      </div>
      <div className="pl-col">
        <span className="pl-etq">Fuente · pág. {i.fuente.pagina}</span>
        <blockquote className="pl-fuente">«{i.fuente.fragmento}»</blockquote>
      </div>
      <div className="pl-acciones">
        <button type="button" className="dc-btn dc-btn--tonal" aria-pressed={i.decision === 'aceptado'} onClick={() => onDecidir('aceptado')}>
          Aceptar
        </button>
        <button type="button" className="dc-btn dc-btn--tonal" aria-pressed={i.decision === 'rechazado'} onClick={() => onDecidir('rechazado')}>
          Rechazar
        </button>
        <button type="button" className="dc-btn dc-btn--tonal" onClick={() => setEditando((x) => !x)}>
          {editando ? 'Cancelar' : 'Editar'}
        </button>
      </div>
    </article>
  );
}

function Sugerencias({
  m,
  elegidas,
  onElegir,
  onUsar,
}: {
  m: MejorasPlan;
  elegidas: Set<string>;
  onElegir: (p: PracticaPropuesta, si: boolean) => void;
  onUsar: (itemId: string, texto: string) => void;
}) {
  return (
    <section className="dc-card pl-sugerencias" aria-labelledby="pl-sug">
      <h2 id="pl-sug">Sugerencias para mejorar tu plan</h2>
      <p className="dc-chip dc-chip--warn" style={{ width: 'fit-content' }}>
        Son sugerencias: nada se agrega sin que lo elijas
      </p>
      {m.competenciasFaltantes.length > 0 && (
        <>
          <h3 className="pl-h3">Competencias del CNEB que faltan</h3>
          <ul className="pl-lista">
            {m.competenciasFaltantes.map((c) => (
              <li key={c.id}>
                <strong>{c.nombre}</strong> <code className="pl-id">{c.id}</code>
                <br />
                <span className="dc-muted">{c.motivo}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {m.desempenosObservables.length > 0 && (
        <>
          <h3 className="pl-h3">Desempeños con verbos observables</h3>
          <ul className="pl-lista">
            {m.desempenosObservables.map((d) => (
              <li key={d.itemId}>
                <span className="dc-muted">Dice:</span> {d.original}
                <br />
                <span className="dc-muted">Podría decir:</span> <strong>{d.propuesta}</strong>{' '}
                <button type="button" className="dc-btn dc-btn--tonal" onClick={() => onUsar(d.itemId, d.propuesta)}>
                  Usar esta redacción
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="pl-h3">Prácticas del museo Rikuy para tus unidades</h3>
      {m.practicas.length === 0 ? (
        <p className="dc-muted">Ninguna práctica del museo encaja todavía con tus unidades.</p>
      ) : (
        <ul className="pl-lista">
          {m.practicas.map((p) => (
            <li key={clavePractica(p)}>
              <label className="pl-check">
                <input type="checkbox" checked={elegidas.has(clavePractica(p))} onChange={(e) => onElegir(p, e.currentTarget.checked)} />
                <span>
                  <strong>{p.titulo}</strong> · Unidad {p.unidad} · {fecha(p.fechaSugerida)}
                  {p.fechaAproximada ? ' (fecha aproximada)' : ''}
                  <br />
                  <span className="dc-muted">{p.motivo}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const AHORA = () => new Date();
const EN_LINEA = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

export function MiPlan({ cliente: inyectado, almacen: almacenInyectado, ahora = AHORA, enLinea = EN_LINEA }: Props) {
  const cliente = useMemo(() => inyectado ?? crearClientePlan(), [inyectado]);
  const almacen = useMemo(() => almacenInyectado ?? almacenPlan(), [almacenInyectado]);
  const [fase, setFase] = useState<Fase>('inicio');
  const [revision, setRevision] = useState<RevisionPlan>();
  const [guardado, setGuardado] = useState<PlanClase>();
  const [mejoras, setMejoras] = useState<MejorasPlan>();
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string>();
  const ocupado = useRef(false);

  const abrir = (r: RevisionPlan) => {
    setRevision(r);
    setMejoras(undefined);
    setElegidas(new Set());
    setAviso(undefined);
    setFase('revision');
  };

  const procesarCola = useCallback(async () => {
    if (ocupado.current || !enLinea()) return;
    const [primero] = await almacen.pendientes().catch(() => []);
    if (!primero) return;
    ocupado.current = true;
    setFase('leyendo');
    try {
      const l = await cliente.extraer(primero.archivos);
      await almacen.quitar(primero.id!);
      abrir(iniciarRevision(l));
    } catch (e) {
      setFase('en_cola');
      if (!(e instanceof ErrorSinRed)) setAviso(e instanceof Error ? e.message : 'No se pudo leer el documento.');
    } finally {
      ocupado.current = false;
    }
  }, [almacen, cliente, enLinea]);

  useEffect(() => {
    let vivo = true;
    almacen.leer().then(
      (p) => {
        if (vivo && p) {
          setGuardado(p);
          setFase((f) => (f === 'inicio' ? 'aprobado' : f));
        }
      },
      () => undefined,
    );
    const primera = setTimeout(() => void procesarCola(), 0);
    const alVolver = () => void procesarCola();
    window.addEventListener('online', alVolver);
    return () => {
      vivo = false;
      clearTimeout(primera);
      window.removeEventListener('online', alVolver);
    };
  }, [almacen, procesarCola]);

  async function leer(archivos: Blob[]) {
    if (archivos.length === 0) return;
    setAviso(undefined);
    if (!enLinea()) {
      await almacen.encolar(archivos, ahora());
      setFase('en_cola');
      return;
    }
    setFase('leyendo');
    try {
      abrir(iniciarRevision(await cliente.extraer(archivos)));
    } catch (e) {
      if (e instanceof ErrorSinRed) {
        await almacen.encolar(archivos, ahora());
        setFase('en_cola');
      } else {
        setAviso(e instanceof Error ? e.message : 'No se pudo leer el documento.');
        setFase('inicio');
      }
    }
  }

  async function aprobarPlan() {
    if (!revision) return;
    const practicas = (mejoras?.practicas ?? []).filter((p) => elegidas.has(clavePractica(p)));
    const plan = aprobar(revision, practicas, ahora());
    await almacen.guardar(plan);
    setGuardado(plan);
    setRevision(undefined);
    setFase('aprobado');
  }

  const cambiar = (f: (r: RevisionPlan) => RevisionPlan) => setRevision((r) => (r ? f(r) : r));
  const conteo = revision ? contar(revision) : undefined;

  return (
    <div className="pl">
      <section className="dc-card" aria-labelledby="pl-titulo">
        <h2 id="pl-titulo">Mi plan</h2>
        <p className="dc-muted" style={{ margin: 0 }}>
          Sube tu programación anual, tu unidad de aprendizaje o tu malla. Rikuy la lee, la relaciona con el CNEB y te propone prácticas del museo. Tú revisas y apruebas: nada se usa sin tu
          aprobación.
        </p>
        <p className="pl-privacidad">
          Privacidad: el documento se envía una sola vez para leerlo y no se guarda en la nube. Antes de guardar, Rikuy quita nombres de estudiantes, teléfonos, correos y DNI.
        </p>
      </section>

      {aviso && (
        <p role="alert" className="dc-card">
          {aviso}
        </p>
      )}

      {(fase === 'inicio' || fase === 'aprobado' || fase === 'en_cola') && (
        <section className="dc-card" aria-labelledby="pl-subir">
          <h2 id="pl-subir">{fase === 'aprobado' ? 'Subir otro plan' : 'Subir tu plan'}</h2>
          <div className="pl-subidas">
            <label className="dc-btn dc-btn--primary pl-archivo">
              Subir PDF
              <input type="file" accept="application/pdf" onChange={(e) => void leer([...(e.currentTarget.files ?? [])].slice(0, 1))} />
            </label>
            <label className="dc-btn dc-btn--tonal pl-archivo">
              Tomar o elegir fotos
              <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => void leer([...(e.currentTarget.files ?? [])].slice(0, 10))} />
            </label>
            <button type="button" className="dc-btn dc-btn--tonal" onClick={() => abrir(iniciarRevision(lecturaDeEjemplo()))}>
              Usar plan de ejemplo
            </button>
          </div>
          <p className="dc-muted" style={{ margin: 0 }}>
            Un PDF de hasta 7 MB, o hasta 10 fotos nítidas de las hojas (una por página).
          </p>
        </section>
      )}

      {fase === 'en_cola' && (
        <p role="status" className="dc-card">
          Sin conexión: guardamos tu documento en este celular y lo leeremos cuando vuelva la red. Puedes seguir usando Rikuy mientras tanto.
        </p>
      )}

      {fase === 'leyendo' && (
        <section role="status" aria-live="polite" className="dc-card">
          <strong>Leyendo tu documento…</strong>
          <progress aria-label="Leyendo tu documento" />
          <span className="dc-muted">Puede tardar hasta un minuto con un PDF largo.</span>
        </section>
      )}

      {fase === 'aprobado' && guardado && (
        <>
          <ResumenPlanClase plan={guardado} />
          <p className="dc-card" style={{ margin: 0 }}>
            Tu plan ya aparece en «Preparar» y en el <Link to="/creador">Creador de prácticas</Link>.
          </p>
        </>
      )}

      {fase === 'revision' && revision && conteo && (
        <>
          <section className="dc-card" aria-labelledby="pl-rev">
            <h2 id="pl-rev">Revisa lo que leímos</h2>
            {revision.fuente.simulado && (
              <p className="dc-chip dc-chip--warn" style={{ width: 'fit-content' }}>
                Datos simulados: plan de ejemplo, sin IA real
              </p>
            )}
            <p style={{ margin: 0 }}>
              {[revision.grado ? `${revision.grado}.º de ${revision.nivel ?? 'secundaria'}` : 'Grado no indicado', revision.area, revision.region].filter(Boolean).join(' · ')}
            </p>
            <p className="dc-muted" style={{ margin: 0 }}>
              {revision.resumen.exactas} exactas · {revision.resumen.aproximadas} aproximadas · {revision.resumen.sinCorrespondencia} sin correspondencia CNEB · {conteo.pendiente} por revisar
            </p>
            {revision.privacidad.retirados > 0 && <p className="pl-privacidad">Se quitaron {revision.privacidad.retirados} nombres o datos personales del documento.</p>}
            {revision.avisos.map((a) => (
              <p key={a} className="dc-muted" style={{ margin: 0 }}>
                {a}
              </p>
            ))}
          </section>

          {revision.unidades.map((u) => (
            <section key={u.indice} className="dc-card" aria-labelledby={`pl-u${u.indice}`}>
              <h3 id={`pl-u${u.indice}`} className="pl-h3">
                {u.titulo}
              </h3>
              {u.periodo?.texto ? <span className="dc-muted">{u.periodo.texto}</span> : null}
              {u.situacionSignificativa ? <p className="dc-muted pl-situacion">{u.situacionSignificativa}</p> : null}
              {u.items.map((i) => (
                <Item key={i.id} i={i} onDecidir={(d) => cambiar((r) => decidir(r, i.id, d))} onEditar={(t) => cambiar((r) => editar(r, i.id, t))} />
              ))}
            </section>
          ))}

          {mejoras && (
            <Sugerencias
              m={mejoras}
              elegidas={elegidas}
              onElegir={(p, si) =>
                setElegidas((s) => {
                  const n = new Set(s);
                  if (si) n.add(clavePractica(p));
                  else n.delete(clavePractica(p));
                  return n;
                })
              }
              onUsar={(id, t) => cambiar((r) => editar(r, id, t))}
            />
          )}

          <section className="dc-card pl-barra" aria-label="Acciones del plan">
            <button type="button" className="dc-btn dc-btn--tonal" onClick={() => setMejoras(mejorar(revision))}>
              Mejorar la información
            </button>
            <button type="button" className="dc-btn dc-btn--primary" onClick={() => void aprobarPlan()}>
              Aprobar plan
            </button>
            <span className="dc-muted">Al aprobar, lo que sigue «por revisar» se acepta y lo rechazado se descarta.</span>
          </section>
        </>
      )}
    </div>
  );
}
