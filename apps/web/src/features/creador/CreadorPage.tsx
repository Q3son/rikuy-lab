/**
 * Creador de prácticas (F7). Container: talks to the cloud gateway, signs with the teacher key and keeps the flow
 * CNEB desempeño -> borrador (IA) -> verificador -> revisión (Muse) -> edición y aprobación de la docente -> firma.
 * The AI proposes, the rules decide, the teacher confirms (4.1). No API key exists in this bundle (2.3.3).
 */
import { exportarClavePublica, firmarPaquete, generarParClaves, paquetePractica, type FalloIA, type PropuestaCreador, type SolicitudPractica } from '@rikuy/ai';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { crearClienteNube, type ClienteNube, type DesempenoListado, type EstadoNube, type HallazgoUI } from './clienteNube.ts';
import { estadoInicial, reducir } from './estado.ts';

const claveRef = (d: DesempenoListado) => `${d.ref.nivel}-${d.ref.grado}:c${d.ref.competencia}:d${d.ref.desempeno}`;

function avisoDeFallo(f: FalloIA): string {
  if (f.tipo === 'cuota') return 'Se acabó el cupo de IA de tu colegio este mes. Puedes usar una práctica del catálogo.';
  if (f.tipo === 'sin_red' || f.tipo === 'timeout') return 'No hay conexión con la IA ahora. Puedes usar una práctica del catálogo.';
  if (f.tipo === 'politica') return 'La IA en la nube está desactivada para este uso. Puedes usar una práctica del catálogo.';
  return 'La IA no pudo preparar el borrador. Puedes usar una práctica del catálogo.';
}

interface Props {
  /** Injected in tests; by default the HTTP client of `apps/cloud`. */
  cliente?: ClienteNube;
}

export function CreadorPage({ cliente: inyectado }: Props) {
  const cliente = useMemo(() => inyectado ?? crearClienteNube(), [inyectado]);
  const [e, enviar] = useReducer(reducir, estadoInicial);
  const [estadoNube, setEstadoNube] = useState<EstadoNube>();
  const [desempenos, setDesempenos] = useState<DesempenoListado[]>([]);
  const [elegido, setElegido] = useState('');
  const [tema, setTema] = useState('');

  useEffect(() => {
    let vivo = true;
    cliente.estado().then((s) => vivo && setEstadoNube(s), () => undefined);
    cliente.desempenos().then(
      (d) => {
        if (!vivo) return;
        setDesempenos(d);
        if (d[0]) setElegido(claveRef(d[0]));
      },
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [cliente]);

  const simulado = estadoNube?.modo === 'simulado' || e.propuesta?.fuentes.generador.simulado;

  async function generar() {
    const d = desempenos.find((x) => claveRef(x) === elegido);
    if (!d) return;
    enviar({ tipo: 'generar' });
    const solicitud = {
      desempeno: { ...d.ref, area: 'ciencia-y-tecnologia', cita: d.texto },
      ...(tema.trim() ? { tema: tema.trim() } : {}),
      lengua: 'es',
      recursos: { quiz: true, diagrama: true, guionVideo: true, pictogramas: false },
    } as SolicitudPractica;
    try {
      const s = await cliente.generar(solicitud);
      if (s.estado === 'propuesta') enviar({ tipo: 'propuesta', propuesta: s.propuesta });
      else if (s.estado === 'catalogo') enviar({ tipo: 'catalogo', catalogo: s.catalogo, aviso: avisoDeFallo(s.fallo) });
      else enviar({ tipo: 'rechazada', hallazgos: s.hallazgos });
    } catch (err) {
      enviar({ tipo: 'error', aviso: err instanceof Error ? err.message : 'No se pudo generar el borrador.' });
    }
  }

  async function aprobarYFirmar() {
    if (!e.propuesta) return;
    enviar({ tipo: 'verificar' });
    try {
      const r = await cliente.aprobar(e.propuesta, 'docente');
      if (!r.ok) return enviar({ tipo: 'no_aprobada', hallazgos: r.hallazgos });
      // The teacher key lives on the teacher device (F2 will persist it); here it is generated for this session.
      const { privada, publica } = await generarParClaves();
      const paquete = await firmarPaquete(paquetePractica(r.practica, 'docente-web'), privada);
      enviar({ tipo: 'aprobada', practica: r.practica, recursos: r.recursos, paquete, clavePublica: await exportarClavePublica(publica) });
    } catch (err) {
      enviar({ tipo: 'error', aviso: err instanceof Error ? err.message : 'No se pudo aprobar la práctica.' });
    }
  }

  async function publicar() {
    if (!e.paquete || !e.clavePublica) return;
    enviar({ tipo: 'publicar' });
    try {
      const r = await cliente.publicar(e.paquete, e.clavePublica);
      enviar({ tipo: 'publicada', id: r.id, version: r.version });
    } catch (err) {
      enviar({ tipo: 'error', aviso: err instanceof Error ? err.message : 'No se pudo publicar.' });
    }
  }

  const editar = (cambio: (p: PropuestaCreador) => PropuestaCreador) => enviar({ tipo: 'editar', cambio });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Creador de prácticas</h1>
        <p className="text-sm text-neutral-400">La IA propone un borrador; las reglas lo verifican y tú decides. Nada llega a tu clase sin tu aprobación y tu firma.</p>
        {simulado && (
          <p role="status" className="w-fit rounded border border-amber-500/60 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
            Datos simulados: no se usa ninguna IA real
          </p>
        )}
      </header>

      {e.aviso && (
        <p role="status" className="rounded border border-neutral-700 p-3 text-sm">
          {e.aviso}
        </p>
      )}
      {e.hallazgos.length > 0 && <Hallazgos hallazgos={e.hallazgos} />}

      {(e.fase === 'inicio' || e.fase === 'generando') && (
        <section aria-labelledby="t-pedir" className="flex flex-col gap-3">
          <h2 id="t-pedir" className="text-lg font-semibold">
            1. Elige el desempeño
          </h2>
          <label className="flex flex-col gap-1 text-sm">
            Desempeño del CNEB
            <select className="rounded border border-neutral-700 bg-neutral-900 p-2" value={elegido} onChange={(ev) => setElegido(ev.target.value)}>
              {desempenos.map((d) => (
                <option key={claveRef(d)} value={claveRef(d)}>
                  {`${d.ref.nivel} ${d.ref.grado}.º · C${d.ref.competencia} D${d.ref.desempeno}: ${d.texto.slice(0, 70)}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tema (opcional, sin nombres ni teléfonos)
            <input className="rounded border border-neutral-700 bg-neutral-900 p-2" value={tema} maxLength={200} onChange={(ev) => setTema(ev.target.value)} />
          </label>
          <button className="w-fit rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50" disabled={!elegido || e.fase === 'generando'} onClick={generar}>
            {e.fase === 'generando' ? 'Preparando el borrador…' : 'Generar borrador'}
          </button>
          {e.catalogo && (
            <ul aria-label="Catálogo de prácticas" className="flex flex-col gap-2">
              {e.catalogo.map((p) => (
                <li key={p.id} className="rounded border border-neutral-700 p-3 text-sm">
                  <strong>{p.titulo}</strong>
                  <p className="text-neutral-400">{p.preguntaGuia}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {e.propuesta && (e.fase === 'propuesta' || e.fase === 'verificando') && (
        <section aria-labelledby="t-borrador" className="flex flex-col gap-4">
          <h2 id="t-borrador" className="text-lg font-semibold">
            2. Borrador de la práctica
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-neutral-300">
            <li>Verificador: {e.propuesta.verificacion.ok ? 'aprobado' : 'con observaciones'}</li>
            {e.propuesta.revisiones.filter((r) => r.por === 'muse').map((r) => (
              <li key="muse">
                Revisión de Muse: {r.veredicto}
                {r.notas.length > 0 && ` · ${r.notas.join(' · ')}`}
              </li>
            ))}
            {!e.propuesta.revisiones.some((r) => r.por === 'muse') && <li>Revisión de Muse: no disponible (solo verificador)</li>}
          </ul>
          <label className="flex flex-col gap-1 text-sm">
            Título
            <input className="rounded border border-neutral-700 bg-neutral-900 p-2" value={e.propuesta.practica.titulo} maxLength={90} onChange={(ev) => editar((p) => ({ ...p, practica: { ...p.practica, titulo: ev.target.value } }))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pregunta guía
            <textarea className="rounded border border-neutral-700 bg-neutral-900 p-2" rows={2} value={e.propuesta.practica.preguntaGuia} onChange={(ev) => editar((p) => ({ ...p, practica: { ...p.practica, preguntaGuia: ev.target.value } }))} />
          </label>
          {e.propuesta.practica.pistas.map((pista, i) => (
            <label key={i} className="flex flex-col gap-1 text-sm">
              {`Pista ${i + 1}`}
              <textarea
                className="rounded border border-neutral-700 bg-neutral-900 p-2"
                rows={2}
                value={pista}
                onChange={(ev) => editar((p) => ({ ...p, practica: { ...p.practica, pistas: p.practica.pistas.map((x, j) => (j === i ? ev.target.value : x)) } }))}
              />
            </label>
          ))}
          <p className="rounded border border-neutral-800 p-3 text-xs text-neutral-400">
            Solo para ti: resultado esperado {e.propuesta.resultadoEsperado.valores.join(', ')} {e.propuesta.resultadoEsperado.unidad}. {e.propuesta.resultadoEsperado.conclusion}
          </p>
          <p className="text-xs text-neutral-500">Los recursos (quiz, diagrama) quedan sin revisar hasta que apruebes. Los textos en quechua o aimara no se muestran a estudiantes hasta que un hablante los revise.</p>
          <button className="w-fit rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50" disabled={e.fase === 'verificando'} onClick={aprobarYFirmar}>
            {e.fase === 'verificando' ? 'Verificando…' : 'Aprobar y firmar'}
          </button>
        </section>
      )}

      {(e.fase === 'aprobada' || e.fase === 'publicando' || e.fase === 'publicada') && e.aprobada && (
        <section aria-labelledby="t-firmada" className="flex flex-col gap-3">
          <h2 id="t-firmada" className="text-lg font-semibold">
            3. Práctica aprobada y firmada
          </h2>
          <p className="text-sm text-neutral-300">{e.aprobada.practica.titulo}</p>
          <p className="text-xs text-neutral-500">Firma ECDSA de tu dispositivo. Puedes llevarla a tu clase por QR o publicarla en la nube para otras docentes.</p>
          {e.fase !== 'publicada' ? (
            <button className="w-fit rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50" disabled={e.fase === 'publicando'} onClick={publicar}>
              {e.fase === 'publicando' ? 'Publicando…' : 'Publicar en la nube'}
            </button>
          ) : (
            <p role="status" className="text-emerald-300">
              Publicada en la nube (versión {e.publicada?.version}).
            </p>
          )}
          <button className="w-fit rounded border border-neutral-700 px-3 py-1 text-sm" onClick={() => enviar({ tipo: 'reiniciar' })}>
            Crear otra práctica
          </button>
        </section>
      )}
    </main>
  );
}

function Hallazgos({ hallazgos }: { hallazgos: HallazgoUI[] }) {
  return (
    <div role="alert" className="rounded border border-red-500/60 bg-red-500/10 p-3 text-sm">
      <p className="font-semibold">No se puede aprobar todavía:</p>
      <ul className="list-disc pl-5">
        {hallazgos.map((h, i) => (
          <li key={i}>{h.mensaje}</li>
        ))}
      </ul>
    </div>
  );
}
