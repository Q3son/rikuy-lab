/**
 * Optional accelerometer mode (E-09 note 2): the phone hangs as the bob, the zero-crossing
 * estimator gives the period. Labelled as an estimate; unavailable → back to the stopwatch.
 */
import { useEffect, useRef, useState } from 'react';
import { dominantAxis, estimatePeriodFromZeroCrossings, type AccelReading } from '@rikuy/lab-engine';
import { SensorMovimiento } from '../../platform/sensores/movimiento.ts';
import { formatoNumero } from './formato.ts';

export function MedicionSensor({ oscilaciones, onEstimado, onNoDisponible }: { oscilaciones: number; onEstimado: (totalS: number) => void; onNoDisponible: () => void }) {
  const sensor = useRef(new SensorMovimiento());
  const lecturas = useRef<AccelReading[]>([]);
  const parar = useRef<(() => void) | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => () => parar.current?.(), []);

  async function empezar() {
    if (!sensor.current.available || !(await sensor.current.permitir())) {
      setMensaje('Este celular no tiene sensor disponible. Usaremos el cronómetro.');
      onNoDisponible();
      return;
    }
    lecturas.current = [];
    parar.current = sensor.current.subscribe((r) => lecturas.current.push(r));
    setGrabando(true);
    setMensaje('Cuelga el celular como si fuera la piedra y suéltalo. Toca «Terminar» después de unas 10 idas y vueltas.');
  }

  function terminar() {
    parar.current?.();
    parar.current = null;
    setGrabando(false);
    const est = estimatePeriodFromZeroCrossings(dominantAxis(lecturas.current));
    lecturas.current = [];
    if (!est) {
      setMensaje('No pude estimar el periodo. Prueba otra vez o usa el cronómetro.');
      return;
    }
    setMensaje(`Estimado con el sensor: ${formatoNumero(est.periodS)} s por oscilación (${est.cycles} oscilaciones detectadas).`);
    onEstimado(est.periodS * oscilaciones);
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-[#00566A] bg-[#D9F4FA] p-3">
      <p className="text-sm font-bold text-[#00566A]">Sensor del celular (acelerómetro) · resultado estimado</p>
      {grabando ? (
        <button type="button" onClick={terminar} className="h-14 rounded-xl bg-[#075E6C] font-bold text-white">Terminar</button>
      ) : (
        <button type="button" onClick={() => void empezar()} className="h-14 rounded-xl border-2 border-[#075E6C] bg-white font-bold text-[#075E6C]">Empezar a registrar</button>
      )}
      {mensaje && <p aria-live="polite" className="text-sm">{mensaje}</p>}
    </div>
  );
}
