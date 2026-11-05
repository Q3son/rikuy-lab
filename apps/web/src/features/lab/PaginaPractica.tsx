/**
 * Pendulum practice (E-06 to E-12): guiding question → mandatory prediction → measure 3 lengths ×
 * 10 oscillations (stopwatch, typed time or the optional accelerometer) → table → comparison with
 * T = 2π√(L/g) → conclusion citing an own datum. Everything is saved in the device event log.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { VisorExhibicion } from '@rikuy/holo';
import { comparisonTable, type MeasurementSource } from '@rikuy/lab-engine';
import { PRACTICAS, PRACTICA_PENDULO } from './catalogo.ts';
import { RegistroLab } from './datos/registro.ts';
import { crearSesion } from './datos/sesion.ts';
import { cm, formatoNumero } from './formato.ts';
import { Cronometro, GraficaComparacion, TablaComparacion, TablaMediciones, TarjetaHipotesis } from './instrumentos.tsx';
import { MedicionSensor } from './MedicionSensor.tsx';
import { ModeloTutorSimulado, type ModeloTutor } from './tutorMock.ts';
import { usePractica } from './usePractica.ts';

export interface PaginaPracticaProps {
  registro?: RegistroLab;
  tutor?: ModeloTutor;
}

const VARIABLES = ['Largo de la cuerda', 'Peso de la piedra', 'Cómo la sueltas'];
const tarjeta = 'flex flex-col gap-3 rounded-2xl border-2 border-[#D3D9CC] bg-white p-4';
const primario = 'h-14 rounded-xl border-2 border-[#04474F] bg-[#075E6C] text-lg font-bold text-white disabled:border-[#D3D9CC] disabled:bg-[#E9ECE4] disabled:text-[#4D6368]';
const campo = 'min-h-12 rounded-xl border-2 border-[#6A7568] px-3 py-2 text-[17px]';

export function PaginaPractica({ registro: registroProp, tutor: tutorProp }: PaginaPracticaProps) {
  const practica = PRACTICAS[useParams().practicaId ?? ''] ?? PRACTICA_PENDULO;
  const sesion = useMemo(() => crearSesion(), []);
  const registro = useMemo(() => registroProp ?? new RegistroLab(sesion), [registroProp, sesion]);
  const tutor = useMemo(() => tutorProp ?? new ModeloTutorSimulado(), [tutorProp]);
  const { estado, error, tutorMsg, despachar, preguntar } = usePractica(practica, sesion, registro, tutor);

  const [variable, setVariable] = useState<string | null>(null);
  const [pasara, setPasara] = useState('');
  const [porque, setPorque] = useState('');
  const [largo, setLargo] = useState(practica.protocolo.valoresIndependiente[0]);
  const [tiempo, setTiempo] = useState('');
  const [modo, setModo] = useState<'cronometro' | 'escrito' | 'sensor'>('cronometro');
  const [holo, setHolo] = useState(false);
  const [citado, setCitado] = useState<number | null>(null);
  const [conclusion, setConclusion] = useState('');

  if (!estado) return <p role="status" className="p-4">Cargando la práctica…</p>;
  const n = practica.protocolo.repeticiones;
  const tabla = comparisonTable(estado);

  async function guardarPrediccion() {
    const text = `Cambio: ${variable?.toLowerCase()}. Creo que: ${pasara.trim()}. Porque: ${porque.trim()}`;
    if (await despachar({ type: 'predict', text, entrada: 'teclado' })) preguntar({ momento: 'prediccion', texto: pasara });
  }
  async function guardarMedida(totalTimeS: number, source: MeasurementSource) {
    if (await despachar({ type: 'measure', lengthM: largo, totalTimeS, oscillations: n, source })) {
      setTiempo('');
      preguntar({ momento: 'medicion', longitudM: largo });
      const siguiente = practica.protocolo.valoresIndependiente.find((L) => !tabla.rows.find((r) => r.lengthM === L)?.measuredPeriodS && L !== largo);
      if (siguiente !== undefined) setLargo(siguiente);
    }
  }
  async function comparar() {
    if (await despachar({ type: 'compare' })) preguntar({ momento: 'comparacion', errorMedio: comparisonTable(estado!).meanRelativeError });
  }
  async function concluir() {
    if (citado === null) return;
    if (await despachar({ type: 'conclude', text: conclusion, citedLengthM: citado, entrada: 'teclado' })) preguntar({ momento: 'conclusion', texto: conclusion });
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 bg-[#F5F6F1] p-4 pb-16 text-[#0D2B33]">
      <header>
        <Link to="/" className="text-sm text-[#075E6C] underline">‹ Volver</Link>
        <h1 className="mt-1 text-2xl font-extrabold">{practica.titulo}</h1>
      </header>

      {estado.prediction && <TarjetaHipotesis texto={estado.prediction.text} />}

      {tutorMsg && (
        <aside aria-live="polite" className="rounded-2xl border-2 border-[#00566A] bg-[#D9F4FA] p-3">
          <p className="text-xs font-semibold text-[#00566A]">Rikuy pregunta · {tutorMsg.fuente === 'reglas' ? 'reglas, sin IA' : 'IA'}</p>
          <p className="text-[17px]">{tutorMsg.texto}</p>
        </aside>
      )}
      {error && <p role="alert" className="rounded-xl border-2 border-[#A8123B] bg-[#FBE6EA] p-3 text-[#96102F]">{error}</p>}

      {estado.phase === 'prediction' && (
        <>
          <section className={tarjeta}>
            <h2 className="text-xl font-extrabold">{practica.preguntaGuia}</h2>
            <p className="text-sm font-semibold">Necesitan</p>
            <ul className="list-disc pl-5">{practica.materiales.map((m) => <li key={m.nombre}>{m.nombre}</li>)}</ul>
            <p className="rounded-xl bg-[#FFF1CC] p-2 text-sm text-[#6B4300]">Cuidado: no gires la piedra cerca de la cara de otra persona.</p>
          </section>
          <section className={tarjeta} aria-label="Predicción">
            <h2 className="text-xl font-extrabold">Antes de medir, ¿qué crees?</h2>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-semibold">1. ¿Qué vas a cambiar?</legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={variable === v} onClick={() => setVariable(v)} className={`min-h-12 rounded-full border-2 px-4 ${variable === v ? 'border-[#F5B301] bg-[#FFF1CC] font-bold' : 'border-[#6A7568]'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 font-semibold">
              2. ¿Qué pasará?
              <input value={pasara} onChange={(e) => setPasara(e.target.value)} maxLength={200} placeholder="Si alargo la cuerda…" className={campo} />
            </label>
            <label className="flex flex-col gap-1 font-semibold">
              3. ¿Por qué lo crees?
              <input value={porque} onChange={(e) => setPorque(e.target.value)} maxLength={200} placeholder="Porque…" className={campo} />
            </label>
            <button type="button" disabled={!variable || !pasara.trim()} onClick={() => void guardarPrediccion()} className={primario}>
              Guardar predicción (abre la medición)
            </button>
            <p className="text-xs text-[#4D6368]">Sin predicción no se puede medir: el dato es de ustedes.</p>
          </section>
        </>
      )}

      {estado.phase !== 'prediction' && (
        <button type="button" onClick={() => setHolo((v) => !v)} className="h-12 rounded-xl border-2 border-[#075E6C] bg-[#DCEBEC] font-semibold text-[#04474F]">
          {holo ? 'Ocultar el holograma' : '◇ Ver el holograma'}
        </button>
      )}
      {holo && <VisorExhibicion practica={practica} escena={practica.escenaHolo ?? 'pendulo'} modo="pantalla" variables={{ longitud: largo }} />}

      {estado.phase === 'measurement' && (
        <section className={tarjeta} aria-label="Medir">
          <h2 className="text-xl font-extrabold">Mide {n} oscilaciones</h2>
          <div role="radiogroup" aria-label="Largo de la cuerda" className="grid grid-cols-3 gap-2">
            {practica.protocolo.valoresIndependiente.map((L) => (
              <button key={L} type="button" role="radio" aria-checked={largo === L} onClick={() => setLargo(L)} className={`h-12 rounded-xl border-2 font-bold ${largo === L ? 'border-[#04474F] bg-[#075E6C] text-white' : 'border-[#6A7568] bg-white'}`}>
                {cm(L)}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Cómo medir" className="grid grid-cols-3 gap-2 text-sm">
            {([['cronometro', 'Cronómetro'], ['escrito', 'Escribir tiempo'], ['sensor', 'Sensor del celular']] as const).map(([m, t]) => (
              <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => setModo(m)} className={`min-h-12 rounded-xl border-2 px-1 ${modo === m ? 'border-[#04474F] font-bold' : 'border-[#D3D9CC]'}`}>
                {t}
              </button>
            ))}
          </div>
          {modo === 'cronometro' && <Cronometro key={largo} oscilaciones={n} onTerminado={(s) => void guardarMedida(s, 'cronometro')} />}
          {modo === 'sensor' && <MedicionSensor oscilaciones={n} onEstimado={(s) => void guardarMedida(s, 'acelerometro')} onNoDisponible={() => setModo('cronometro')} />}
          <label className="flex flex-col gap-1 font-semibold">
            Tiempo de {n} oscilaciones (segundos)
            <input inputMode="decimal" value={tiempo} onChange={(e) => setTiempo(e.target.value)} placeholder="14,2" className={`${campo} text-2xl tabular-nums`} />
          </label>
          <button type="button" disabled={!tiempo.trim()} onClick={() => void guardarMedida(Number(tiempo.replace(',', '.')), 'manual')} className={primario}>
            Guardar esta medida
          </button>
        </section>
      )}

      {estado.phase !== 'prediction' && estado.measurements.length > 0 && (
        <section className={tarjeta} aria-label="Tabla de datos">
          <h2 className="text-xl font-extrabold">Tabla</h2>
          <TablaMediciones filas={estado.measurements} onAnular={(id) => void despachar({ type: 'annul', measurementId: id, reason: 'dato raro' })} />
          <p className="text-xs text-[#4D6368]">Periodo = tiempo de {n} oscilaciones ÷ {n}. Un dato raro se marca, no se borra.</p>
          {estado.phase === 'measurement' && (
            <button type="button" onClick={() => void comparar()} disabled={tabla.rows.some((r) => r.measuredPeriodS === null)} className={primario}>
              Comparar con el modelo
            </button>
          )}
        </section>
      )}

      {(estado.phase === 'comparison' || estado.phase === 'done') && (
        <section className={tarjeta} aria-label="Comparar con el modelo">
          <h2 className="text-xl font-extrabold">Comparar con el modelo</h2>
          <GraficaComparacion tabla={tabla} />
          <TablaComparacion tabla={tabla} />
          <p className="text-sm">Modelo: T = 2π·√(L/g). Error promedio: <b>{formatoNumero(tabla.meanRelativeError * 100, 0)} %</b>.</p>
          <p className="text-xs text-[#4D6368]">{practica.limitaciones[0]}</p>
        </section>
      )}

      {estado.phase === 'comparison' && (
        <section className={`${tarjeta} border-[#14592D]`} aria-label="Conclusión">
          <h2 className="text-xl font-extrabold">Tu conclusión</h2>
          <fieldset>
            <legend className="mb-1 font-semibold">¿Qué dato prueba lo que dices?</legend>
            <div role="radiogroup" className="grid grid-cols-1 gap-2">
              {tabla.rows.map((r) => (
                <button key={r.lengthM} type="button" role="radio" aria-checked={citado === r.lengthM} onClick={() => setCitado(r.lengthM)} className={`min-h-12 rounded-xl border-2 px-3 text-left ${citado === r.lengthM ? 'border-[#14592D] bg-[#E3F2E6] font-bold' : 'border-[#6A7568]'}`}>
                  {`${cm(r.lengthM)}: ${formatoNumero(r.measuredPeriodS ?? 0)} s`}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 font-semibold">
            Mi conclusión
            <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} maxLength={500} rows={3} placeholder="Mi dato … muestra que …" className={campo} />
          </label>
          <button type="button" disabled={citado === null || !conclusion.trim()} onClick={() => void concluir()} className={primario}>
            Guardar conclusión
          </button>
        </section>
      )}

      {estado.phase === 'done' && (
        <section role="status" className="rounded-2xl border-2 border-[#14592D] bg-[#E3F2E6] p-4">
          <p className="text-xl font-extrabold text-[#14592D]">✓ Práctica terminada</p>
          <p>«{estado.conclusion?.text}»</p>
          <p className="text-sm">Todo quedó guardado en este celular, aunque no haya internet.</p>
        </section>
      )}
    </main>
  );
}
