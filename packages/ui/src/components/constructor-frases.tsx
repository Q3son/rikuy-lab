import { Check, Delete, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { SpeakButton, type Narracion } from './speak-button.tsx';
import { Button } from './ui/button.tsx';

export interface Pictograma {
  id: string;
  /** The word the pictogram stands for. Pictograms always carry their word. */
  label: string;
  icono: ReactNode;
}

export interface EtiquetasConstructor {
  titulo: string;
  paleta: string;
  frase: string;
  vacio: string;
  quitarUltimo: string;
  borrar: string;
  confirmar: string;
  /** "Quitar {palabra}": the accessible name of the remove button of each chosen pictogram. */
  quitar: (palabra: string) => string;
}

/**
 * Pictogram sentence builder (Milo-style, FUNCIONES_EXTRA function 3, UI part). The group builds a
 * prediction or a conclusion by tapping pictograms. It helps those who write little, who speak
 * Quechua or who have communication difficulties. The sentence is ALWAYS shown as text as well, can be
 * read aloud, and each pictogram can be removed. The pictogram set comes from the caller (F7's
 * `Pictogramas` port); this component draws and edits, nothing else. No emotion board on purpose.
 */
export function ConstructorFrases({
  pictogramas,
  value,
  onChange,
  onConfirmar,
  etiquetas,
  narracion,
  className,
}: {
  pictogramas: Pictograma[];
  value: string[];
  onChange: (ids: string[]) => void;
  onConfirmar?: (ids: string[]) => void;
  etiquetas: EtiquetasConstructor;
  narracion?: Narracion;
  className?: string;
}) {
  const porId = new Map(pictogramas.map((p) => [p.id, p]));
  const elegidos = value.map((id, i) => ({ id, i, p: porId.get(id) })).filter((x): x is { id: string; i: number; p: Pictograma } => x.p !== undefined);
  const texto = elegidos.map((x) => x.p.label).join(' ');

  return (
    <section aria-label={etiquetas.titulo} className={cn('flex flex-col gap-3', className)}>
      <div className="rounded-card border-2 border-line-strong bg-surface p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="m-0 text-small font-bold text-ink-2">{etiquetas.frase}</h3>
          {narracion ? <SpeakButton {...narracion} disabled={narracion.disabled ?? elegidos.length === 0} /> : null}
        </div>
        {elegidos.length === 0 ? (
          <p className="m-0 mt-2 text-body text-ink-2">{etiquetas.vacio}</p>
        ) : (
          <ul aria-label={etiquetas.frase} className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
            {elegidos.map(({ id, i, p }) => (
              <li key={`${id}-${i}`}>
                <button
                  type="button"
                  aria-label={etiquetas.quitar(p.label)}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="inline-flex min-h-12 items-center gap-2 rounded-ctl border-2 border-primary bg-primary-tint px-3 text-body font-bold text-primary-press [&_svg]:size-6"
                >
                  <span aria-hidden="true" className="inline-flex">
                    {p.icono}
                  </span>
                  <span aria-hidden="true">{p.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p data-testid="frase-texto" className={cn('m-0 mt-2 text-body-lg font-semibold text-ink', elegidos.length === 0 && 'sr-only')}>
          {texto}
        </p>
      </div>

      <div role="group" aria-label={etiquetas.paleta} className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
        {pictogramas.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange([...value, p.id])}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-ctl border-2 border-line-strong bg-surface p-2 text-small font-semibold text-ink [&_svg]:size-7 [&_svg]:text-primary"
          >
            <span aria-hidden="true" className="inline-flex">
              {p.icono}
            </span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={elegidos.length === 0} onClick={() => onChange(value.slice(0, -1))}>
          <Delete />
          {etiquetas.quitarUltimo}
        </Button>
        <Button variant="secondary" disabled={elegidos.length === 0} onClick={() => onChange([])}>
          <Trash2 />
          {etiquetas.borrar}
        </Button>
      </div>
      {onConfirmar ? (
        <Button size="lg" disabled={elegidos.length === 0} onClick={() => onConfirmar(elegidos.map((x) => x.id))}>
          <Check />
          {etiquetas.confirmar}
        </Button>
      ) : null}
    </section>
  );
}
