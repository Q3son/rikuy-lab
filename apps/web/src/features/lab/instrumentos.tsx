/**
 * Lab instrument widgets (DESIGN 11): hypothesis card, stopwatch with the ten-knot cord,
 * measurement table, comparison chart. Presentational; numbers formatted with Intl.
 */
import { useEffect, useRef, useState } from 'react';
import { Stopwatch, type ComparisonTable, type MeasurementRow } from '@rikuy/lab-engine';
import { avisarOscilacion } from '../../platform/sensores/avisos.ts';

import { cm, formatoNumero as fmt } from './formato.ts';

export function TarjetaHipotesis({ texto }: { texto: string }) {
  return (
    <section aria-label="Mi hipótesis" className="rounded-2xl border-2 border-l-[10px] border-[#F5B301] bg-[#FFF1CC] p-3 text-[#0D2B33]">
      <p className="flex items-center gap-2 text-sm font-bold text-[#6B4300]">
        <span aria-hidden="true">💡</span> Mi hipótesis
        <span className="ml-auto rounded-full border border-[#6B4300] px-2 text-xs">🔒 Antes de medir</span>
      </p>
      <p className="mt-1 text-[17px]">«{texto}»</p>
    </section>
  );
}

/** Stopwatch (DESIGN 11): 56 px tabular readout, ten-knot cord, one big primary action. */
export function Cronometro({ oscilaciones, onTerminado, sonido = true }: { oscilaciones: number; onTerminado: (totalS: number) => void; sonido?: boolean }) {
  const sw = useRef<Stopwatch | null>(null);
  const [, setTick] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [cuenta, setCuenta] = useState(0);
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (!corriendo) return;
    let raf = requestAnimationFrame(function loop() {
      setMs(sw.current?.elapsedMs() ?? 0);
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [corriendo]);

  function iniciar() {
    sw.current = new Stopwatch({ now: () => performance.now() }, oscilaciones);
    sw.current.start();
    setCuenta(0);
    setCorriendo(true);
    if (sonido) avisarOscilacion(0, oscilaciones);
  }
  function contar() {
    const s = sw.current;
    if (!s) return;
    s.countOscillation();
    setCuenta(s.count);
    if (sonido) avisarOscilacion(s.count, oscilaciones);
    if (s.completed) {
      setCorriendo(false);
      setMs(s.elapsedMs());
      onTerminado(s.elapsedMs() / 1000);
    }
    setTick((t) => t + 1);
  }
  function parar() {
    sw.current?.stop();
    setCorriendo(false);
  }
  function reiniciar() {
    sw.current?.reset();
    setCorriendo(false);
    setCuenta(0);
    setMs(0);
  }

  const seg = ms / 1000;
  const lectura = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${fmt(seg % 60, 1).padStart(4, '0')}`;
  return (
    <div role="timer" aria-label="Cronómetro" className="flex flex-col gap-3 rounded-2xl border-2 border-[#D3D9CC] bg-white p-4">
      <p className="text-center text-[56px] font-extrabold leading-none tabular-nums" aria-live="off">{lectura}</p>
      <p className="text-center text-sm font-semibold">Oscilación {cuenta} de {oscilaciones}</p>
      <ol aria-hidden="true" className="flex justify-center gap-1.5">
        {Array.from({ length: oscilaciones }, (_, i) => (
          <li key={i} className={`rounded-full ${i < cuenta ? 'h-4 w-4 bg-[#075E6C]' : i === cuenta && corriendo ? 'h-5 w-5 bg-[#F5B301]' : 'h-4 w-4 border-2 border-[#6A7568]'}`} />
        ))}
      </ol>
      {corriendo ? (
        <button type="button" onClick={contar} className="h-16 rounded-xl bg-[#075E6C] text-xl font-bold text-white">Va y vuelve ({cuenta + 1})</button>
      ) : (
        <button type="button" onClick={iniciar} className="h-14 rounded-xl bg-[#075E6C] text-lg font-bold text-white">▶ Iniciar al soltar</button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={parar} disabled={!corriendo} className="h-12 rounded-xl border-2 border-[#6A7568] font-semibold disabled:opacity-50">Parar</button>
        <button type="button" onClick={reiniciar} className="h-12 rounded-xl border-2 border-[#6A7568] font-semibold">Reiniciar</button>
      </div>
      <p className="text-xs text-[#4D6368]">Toca «Va y vuelve» cada vez que el péndulo vuelve al punto de partida (10 veces). Suena un pitido y vibra en cada una.</p>
    </div>
  );
}

const FUENTE: Record<MeasurementRow['source'], string> = { cronometro: 'cronómetro', acelerometro: 'sensor (estimado)', manual: 'escrito' };

export function TablaMediciones({ filas, onAnular }: { filas: MeasurementRow[]; onAnular: (id: string) => void }) {
  if (filas.length === 0) return <p className="text-[#33494F]">Aún no tienes medidas. Mide una longitud para ver la tabla.</p>;
  return (
    <table className="w-full border-collapse text-right tabular-nums">
      <caption className="sr-only">Tus mediciones</caption>
      <thead>
        <tr className="border-b-2 border-[#0D2B33] text-sm">
          <th scope="col" className="text-left">Cuerda</th><th scope="col">Periodo (s)</th><th scope="col">Cómo</th><th scope="col"><span className="sr-only">Acción</span></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.id} className={`border-b-2 border-[#D3D9CC] ${f.annulled ? 'text-[#4D6368] line-through' : ''}`}>
            <th scope="row" className="py-2 text-left">{cm(f.lengthM)}{f.attempt > 1 ? ` (${f.attempt}.ª)` : ''}</th>
            <td>{fmt(f.periodS)}</td>
            <td className="text-sm">{FUENTE[f.source]}</td>
            <td>{!f.annulled && <button type="button" onClick={() => onAnular(f.id)} className="h-12 px-2 text-sm text-[#96102F] underline" aria-label={`Marcar dato raro ${cm(f.lengthM)}`}>Dato raro</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TablaComparacion({ tabla }: { tabla: ComparisonTable }) {
  return (
    <table aria-label="Comparación con el modelo" className="w-full border-collapse text-right tabular-nums">
      <thead>
        <tr className="border-b-2 border-[#0D2B33] text-sm">
          <th scope="col" className="text-left">Cuerda</th><th scope="col">Tu periodo</th><th scope="col">Teoría</th><th scope="col">Error</th>
        </tr>
      </thead>
      <tbody>
        {tabla.rows.map((r) => (
          <tr key={r.lengthM} className="border-b-2 border-[#D3D9CC]">
            <th scope="row" className="py-2 text-left">{cm(r.lengthM)}</th>
            <td>{r.measuredPeriodS === null ? '—' : fmt(r.measuredPeriodS)}</td>
            <td>{fmt(r.theoreticalPeriodS)}</td>
            <td className="text-[#14592D]">{r.relativeError === null ? '—' : `${fmt(r.relativeError * 100, 0)} %`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** SVG chart (DESIGN 11): theory = dashed line, own data = filled dots with halo, direct labels. */
export function GraficaComparacion({ tabla }: { tabla: ComparisonTable }) {
  const W = 320, H = 196, L = 40, B = 30, T = 12, R = 12;
  const maxL = Math.max(...tabla.rows.map((r) => r.lengthM)) * 1.1;
  const maxT = Math.max(...tabla.rows.map((r) => Math.max(r.theoreticalPeriodS, r.measuredPeriodS ?? 0))) * 1.15;
  const x = (l: number) => L + (l / maxL) * (W - L - R);
  const y = (t: number) => H - B - (t / maxT) * (H - B - T);
  const curva = Array.from({ length: 41 }, (_, i) => {
    const l = (i / 40) * maxL;
    return `${i ? 'L' : 'M'}${x(l).toFixed(1)} ${y(2 * Math.PI * Math.sqrt(l / 9.80665)).toFixed(1)}`;
  }).join(' ');
  const error = Number.isFinite(tabla.meanRelativeError) ? `${fmt(tabla.meanRelativeError * 100, 0)} %` : 'sin datos';
  return (
    <svg role="img" aria-label={`Gráfica: tus puntos sobre la curva del modelo, error promedio ${error}`} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl border-2 border-[#D3D9CC] bg-white">
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#D3D9CC" strokeWidth="2" />
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="#D3D9CC" strokeWidth="2" />
      <text x={W / 2} y={H - 6} fontSize="12.5" fill="#33494F" textAnchor="middle">Largo de la cuerda (cm)</text>
      <text x={12} y={H / 2} fontSize="12.5" fill="#33494F" textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>Periodo (s)</text>
      <path d={curva} fill="none" stroke="#0D2B33" strokeWidth="2" strokeDasharray="6 4" />
      <text x={W - R - 4} y={y(2 * Math.PI * Math.sqrt(maxL / 9.80665)) - 6} fontSize="12.5" fill="#0D2B33" textAnchor="end">Teoría</text>
      {tabla.rows.map((r) =>
        r.measuredPeriodS === null ? null : (
          <circle key={r.lengthM} cx={x(r.lengthM)} cy={y(r.measuredPeriodS)} r="6" fill="#075E6C" stroke="#fff" strokeWidth="2.5" />
        ),
      )}
      <text x={L + 8} y={T + 12} fontSize="12.5" fill="#075E6C">● Tus datos</text>
    </svg>
  );
}
