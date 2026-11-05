/**
 * Container hook: replays the persisted events, runs the lab-engine reducer, appends every new
 * record to the log, and asks the (mocked) tutor for a Socratic follow-up.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Practica } from '@rikuy/contracts';
import { createPractice, replay, step, type PracticeAction, type PracticeError, type PracticeState } from '@rikuy/lab-engine';
import { protocoloPendulo } from './catalogo.ts';
import type { RegistroLab } from './datos/registro.ts';
import { newUlid, type SesionLab } from './datos/sesion.ts';
import type { EntradaTutor, ModeloTutor, RespuestaTutor } from './tutorMock.ts';

const ERRORES: Record<PracticeError, string> = {
  prediction_required: 'Primero escribe tu predicción.',
  prediction_empty: 'Escribe qué crees que pasará.',
  prediction_locked: 'La predicción ya está guardada.',
  unknown_length: 'Elige uno de los largos de la práctica.',
  wrong_oscillation_count: 'Cuenta 10 oscilaciones.',
  invalid_time: 'Ese tiempo no sirve. Escribe los segundos de las 10 oscilaciones.',
  unknown_measurement: 'No encontré esa medida.',
  measurements_incomplete: 'Falta medir algún largo.',
  not_compared: 'Primero compara con el modelo.',
  conclusion_empty: 'Escribe tu conclusión.',
  cited_length_not_measured: 'Elige un dato que hayas medido.',
  practice_finished: 'La práctica ya terminó.',
};

export function usePractica(practica: Practica, sesion: SesionLab, registro: RegistroLab, tutor: ModeloTutor) {
  const ctx = { claseId: sesion.claseId, grupoId: sesion.grupoId, practicaId: practica.id, lengua: 'es' as const };
  const [estado, setEstado] = useState<PracticeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tutorMsg, setTutorMsg] = useState<RespuestaTutor | null>(null);
  const actual = useRef<PracticeState | null>(null);

  useEffect(() => {
    let vivo = true;
    void registro.eventosDe(practica.id).then((eventos) => {
      if (!vivo) return;
      const s = eventos.length ? replay(protocoloPendulo(practica), ctx, eventos) : createPractice(protocoloPendulo(practica), ctx);
      actual.current = s;
      setEstado(s);
    });
    return () => {
      vivo = false;
    };
    // ctx is derived from practica and sesion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practica, sesion, registro]);

  const preguntar = useCallback(
    (e: EntradaTutor) => {
      void tutor.responder(e).then(setTutorMsg).catch(() => setTutorMsg(null));
    },
    [tutor],
  );

  const despachar = useCallback(
    async (accion: PracticeAction): Promise<boolean> => {
      const s = actual.current;
      if (!s) return false;
      const r = step(s, accion, newUlid);
      if (!r.ok) {
        setError(ERRORES[r.error]);
        return false;
      }
      for (const e of r.value.events) await registro.agregar(e);
      actual.current = r.value.state;
      setEstado(r.value.state);
      setError(null);
      return true;
    },
    [registro],
  );

  return { estado, error, tutorMsg, despachar, preguntar };
}
