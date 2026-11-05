import { Card, OpcionesRadio, SelectField } from '@rikuy/ui';
import { useTranslation } from 'react-i18next';
import type { Lengua } from '@rikuy/contracts';
import { LENGUAS_DE_LA_UI } from '../../platform/i18n/i18n.ts';
import { estadoRevision } from '../../platform/i18n/registro.ts';
import { useUi, type Tema } from '../estado.ts';
import { PanelAccesibilidad } from '../accesibilidad/PanelAccesibilidad.tsx';

const TEMAS: Tema[] = ['auto', 'light', 'dark', 'holo'];

/** Language and theme, shared by Yo (students) and Ajustes (teacher). */
export function LenguaYTema() {
  const { t } = useTranslation();
  const lengua = useUi((s) => s.lengua);
  const tema = useUi((s) => s.tema);
  const fijarLengua = useUi((s) => s.fijarLengua);
  const fijarTema = useUi((s) => s.fijarTema);
  const catalogo = LENGUAS_DE_LA_UI.find((c) => c.lengua === lengua);
  const revision = catalogo ? estadoRevision(catalogo) : null;

  return (
    <>
      <Card className="flex flex-col gap-2">
        <h2 className="m-0 text-title-sm font-bold">{t('ajustes.lengua.titulo')}</h2>
        <SelectField
          label={t('ajustes.lengua.etiqueta')}
          value={lengua}
          onChange={(e) => fijarLengua(e.target.value as Lengua)}
          options={LENGUAS_DE_LA_UI.map((c) => ({ value: c.lengua, label: c.variedad ? `${c.nombre} (${c.variedad})` : c.nombre }))}
        />
        {lengua !== 'es' && revision ? <p className="m-0 text-small font-semibold text-ink">{t('ajustes.lengua.revision', revision)}</p> : null}
        <p className="m-0 text-small text-ink-2">{t('ajustes.lengua.aviso')}</p>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="m-0 text-title-sm font-bold">{t('ajustes.tema.titulo')}</h2>
        <OpcionesRadio ariaLabel={t('ajustes.tema.etiqueta')} value={tema} onValueChange={(v) => fijarTema(v as Tema)} opciones={TEMAS.map((id) => ({ value: id, label: t(`tema.${id}`) }))} />
      </Card>
    </>
  );
}

/** Everything a person can adapt on this device: language, theme and accessibility. */
export function AjustesGenerales() {
  return (
    <>
      <LenguaYTema />
      <PanelAccesibilidad />
    </>
  );
}
