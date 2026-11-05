/** E-21 Punto de encuentro: closed reaction list of the contract. No free chat, no voice. */
import type { Reaccion } from '@rikuy/contracts';
import { useState } from 'react';

const ETIQUETAS: Record<Reaccion, string> = {
  saludar: 'Saludar',
  senalar: '¡Ven a ver!',
  aplaudir: 'Aplaudir',
  ayuda: 'Ayuda',
};

export function Reacciones({ alReaccionar }: { alReaccionar: (r: Reaccion) => void }) {
  const [ultima, setUltima] = useState<Reaccion | null>(null);
  return (
    <section className="rk-panel" aria-labelledby="titulo-reacciones">
      <h2 id="titulo-reacciones">Reaccionar</h2>
      <div className="rk-fila">
        {(Object.keys(ETIQUETAS) as Reaccion[]).map((r) => (
          <button
            key={r}
            type="button"
            className="rk-btn"
            onClick={() => {
              alReaccionar(r);
              setUltima(r);
            }}
          >
            {ETIQUETAS[r]}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" style={{ margin: 0 }}>
        {ultima ? `Enviaste «${ETIQUETAS[ultima]}» a los grupos de esta sala.` : 'Solo reacciones de esta lista: no hay chat.'}
      </p>
    </section>
  );
}
