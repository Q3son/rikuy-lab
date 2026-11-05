import { Button, Card, Chip, Mascot, Stepper, Tabs, TabsContent, TabsList, TabsTrigger, type Paso } from '@rikuy/ui';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { estadoDeTramo, TRAMOS, useJornada, type Tramo } from '../jornada.ts';
import { TarjetaNarrable } from '../TarjetaNarrable.tsx';
import { AjustesGenerales } from './AjustesGenerales.tsx';

/** Where each stage of the day leads. F6 and F7 own the screens behind these routes. */
const DESTINO: Record<Tramo, string> = {
  preparar: '/creador',
  museo: '/clase?tramo=museo',
  cierre: '/evidencia',
  llevar: '/clase?tramo=llevar',
};

/** T-01 "Mi clase de hoy": the day in four stages and one main action. */
export function Hoy() {
  const { t } = useTranslation();
  const clase = useJornada((s) => s.clase);
  const pasos: Paso[] = TRAMOS.map((tramo) => {
    const estado = estadoDeTramo(tramo, clase?.tramo ?? null);
    return { id: tramo, label: t(`hoy.paso.${tramo}`), estado, estadoLabel: t(`hoy.estado.${estado}`), href: `#${DESTINO[tramo]}` };
  });

  return (
    <>
      {clase ? (
        <Card tone="evidence" className="flex flex-col gap-1">
          <p className="m-0 text-title-sm font-extrabold text-ink">{clase.titulo}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{t('hoy.codigo', { codigo: clase.codigo })}</Chip>
            <Chip variant="sync">{t('hoy.grupos', { count: clase.grupos })}</Chip>
          </div>
        </Card>
      ) : (
        <div className="flex items-center gap-3">
          <Mascot estado="curiosa" size={64} />
          <TarjetaNarrable id="hoy-vacio" titulo={t('hoy.vacio.titulo')} texto={t('hoy.vacio.texto')} className="flex-1" />
        </div>
      )}

      <Stepper ariaLabel={t('hoy.pasos')} pasos={pasos} />

      {clase ? (
        <Button asChild size="lg">
          <Link to={DESTINO[clase.tramo === 'preparar' ? 'preparar' : 'museo']}>{t('hoy.abrirMuseo')}</Link>
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link to={DESTINO.preparar}>{t('hoy.vacio.crear')}</Link>
        </Button>
      )}
    </>
  );
}

/** Clase = Preparar + Museo + Para llevar, as a segmented control (the screens belong to F6 and F7). */
export function Clase() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const actual = (['preparar', 'museo', 'llevar'] as const).find((x) => x === params.get('tramo')) ?? 'preparar';
  return (
    <Tabs value={actual} onValueChange={(v) => setParams({ tramo: v })}>
      <TabsList aria-label={t('clase.segmentos')}>
        {(['preparar', 'museo', 'llevar'] as const).map((id) => (
          <TabsTrigger key={id} value={id}>
            {t(`clase.${id}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      {(['preparar', 'museo', 'llevar'] as const).map((id) => (
        <TabsContent key={id} value={id}>
          <TarjetaNarrable id={`clase-${id}`} texto={t('clase.vacio')} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Evidencia = Cierre. Empty until F6 receives the students' evidence. "No evaluable" is not zero. */
export function Evidencia() {
  const { t } = useTranslation();
  return (
    <>
      <TarjetaNarrable id="evidencia-vacio" tone="dashed" texto={t('evidencia.vacio')} />
      <p className="m-0 text-small font-semibold text-ink-2">{t('evidencia.leyenda')}</p>
    </>
  );
}

export function Reportes() {
  const { t } = useTranslation();
  return <TarjetaNarrable id="reportes-vacio" tone="dashed" texto={t('reportes.vacio')} />;
}

export function Ajustes() {
  return <AjustesGenerales />;
}
