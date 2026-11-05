import { ConstructorFrases, type Pictograma } from '@rikuy/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnunciar } from '../accesibilidad/anuncios.tsx';
import { useNarracion } from '../accesibilidad/narracion.tsx';
import { TarjetaNarrable } from '../TarjetaNarrable.tsx';
import { PICTOGRAMAS_PENDULO } from './pictogramas.tsx';

/**
 * Pictogram sentence builder with the app wiring: translated words, narration of the sentence and a
 * confirmation card. `onConfirmar` hands the ordered pictogram ids and the sentence to whoever owns the
 * step (F3 uses it for the prediction and the conclusion; F4 for the helper requests). Nothing is stored
 * here and nothing is labelled: it is a way to say a sentence, not an assessment.
 */
export function ConstructorDeFrases({ onConfirmar }: { onConfirmar?: (ids: string[], frase: string) => void }) {
  const { t } = useTranslation();
  const anunciar = useAnunciar();
  const [ids, setIds] = useState<string[]>([]);
  const [confirmada, setConfirmada] = useState<string | null>(null);

  const pictogramas = useMemo<Pictograma[]>(() => PICTOGRAMAS_PENDULO.map((p) => ({ id: p.id, label: t(p.clave), icono: p.icono })), [t]);
  const texto = ids.map((id) => pictogramas.find((p) => p.id === id)?.label ?? '').join(' ');
  const narracionDeLaFrase = useNarracion({ id: 'frase-en-construccion', texto });

  return (
    <div className="flex flex-col gap-3">
      <ConstructorFrases
        pictogramas={pictogramas}
        value={ids}
        onChange={(nuevos) => {
          setIds(nuevos);
          setConfirmada(null);
        }}
        narracion={{ ...narracionDeLaFrase, disabled: ids.length === 0 || narracionDeLaFrase.disabled }}
        onConfirmar={(elegidos) => {
          setConfirmada(texto);
          anunciar(t('frases.lista'));
          onConfirmar?.(elegidos, texto);
        }}
        etiquetas={{
          titulo: t('frases.titulo'),
          paleta: t('frases.paleta'),
          frase: t('frases.tuFrase'),
          vacio: t('frases.vacio'),
          quitarUltimo: t('frases.quitarUltimo'),
          borrar: t('frases.borrar'),
          confirmar: t('frases.confirmar'),
          quitar: (palabra) => t('frases.quitar', { palabra }),
        }}
      />
      {confirmada ? <TarjetaNarrable id="frase-confirmada" titulo={t('frases.listaTitulo')} texto={confirmada} /> : null}
    </div>
  );
}
