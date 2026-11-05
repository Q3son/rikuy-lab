/** The room curator's question (no answer key). Any honest answer opens the back gallery. */
import { preguntaDeSala, responderCurador } from '@rikuy/campus';
import { useState } from 'react';

export function CuradorPanel({ salaId, abierta, alResponder, alCerrar }: { salaId: string; abierta: boolean; alResponder: () => void; alCerrar: () => void }) {
  const pregunta = preguntaDeSala(salaId);
  const [respuesta, setRespuesta] = useState<string | null>(null);
  if (!pregunta) return null;
  return (
    <section className="rk-panel" aria-labelledby="titulo-curador" style={{ borderColor: 'var(--m-sol)' }}>
      <h2 id="titulo-curador">La curadora de la sala pregunta</h2>
      <p style={{ margin: 0 }}>{pregunta.pregunta}</p>
      <div className="rk-fila" role="group" aria-label="Respuestas">
        {pregunta.opciones.map((o, i) => (
          <button
            key={o.texto}
            type="button"
            className="rk-btn"
            onClick={() => {
              const r = responderCurador(salaId, i);
              if (!r) return;
              setRespuesta(r.mensaje);
              alResponder();
            }}
          >
            {o.texto}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" style={{ margin: 0 }}>
        {respuesta ? `${respuesta} La reja de la galería ya está abierta.` : abierta ? 'La reja de la galería ya está abierta.' : ''}
      </p>
      <button type="button" className="rk-btn" onClick={alCerrar}>
        Seguir recorriendo
      </button>
    </section>
  );
}
