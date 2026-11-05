import { useId, useState } from 'react';

export interface DudaEnviada {
  conceptoId: string;
  frase?: string;
}

export interface CajaDeDudasProps {
  conceptos: { id: string; etiqueta: string }[];
  onEnviar(d: DudaEnviada): void;
}

/** "Tengo una duda": a concept from a fixed list plus an optional short phrase. No name field, no chat. */
export function CajaDeDudas({ conceptos, onEnviar }: CajaDeDudasProps) {
  const base = useId();
  const [conceptoId, setConceptoId] = useState<string | undefined>();
  const [frase, setFrase] = useState('');
  return (
    <section aria-labelledby={`${base}-t`} style={{ display: 'grid', gap: 12, padding: 16, border: '2px solid var(--rk-border, #d3d9cc)', borderRadius: 16 }}>
      <h2 id={`${base}-t`}>Tengo una duda</h2>
      <p>Tu docente verá el tema, no tu nombre. En un curso pequeño podría imaginar quién fue.</p>
      <div role="radiogroup" aria-label="¿Sobre qué tema?">
        {conceptos.map((c) => (
          <label key={c.id} style={{ display: 'flex', gap: 8, minHeight: 48, alignItems: 'center' }}>
            <input type="radio" name={`${base}-c`} checked={conceptoId === c.id} onChange={() => setConceptoId(c.id)} />
            {c.etiqueta}
          </label>
        ))}
      </div>
      <label>
        Si quieres, escribe una frase corta
        <input type="text" maxLength={80} value={frase} onChange={(e) => setFrase(e.target.value)} />
      </label>
      <button
        type="button"
        disabled={conceptoId === undefined}
        onClick={() => conceptoId && onEnviar({ conceptoId, ...(frase.trim() ? { frase: frase.trim() } : {}) })}
      >
        Enviar mi duda
      </button>
    </section>
  );
}
