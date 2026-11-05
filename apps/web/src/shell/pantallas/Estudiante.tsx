import { Button, Chip, HallSign, KnotIcon, Mascot, type SalaId } from '@rikuy/ui';
import { QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { efectosDeNivel } from '../nivel.ts';
import { ConstructorDeFrases } from '../frases/ConstructorDeFrases.tsx';
import { TarjetaNarrable } from '../TarjetaNarrable.tsx';
import { useSesion } from '../sesion.ts';
import { AjustesGenerales } from './AjustesGenerales.tsx';

const SALAS: SalaId[] = ['fisica', 'bio', 'quim', 'tierra'];

/** E-01 vestibule (placeholder until F5 draws the 2D map): hall signs and the closed-door message. */
export function Museo() {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center gap-3">
        <Mascot estado="curiosa" size={64} />
        <p className="m-0 text-body-lg font-semibold">{t('museo.vestibulo')}</p>
      </div>
      <section aria-label={t('museo.salas')} className="flex flex-col gap-3">
        {SALAS.map((sala) => (
          <HallSign key={sala} sala={sala} nombre={t(`salas.${sala}`)} contador={sala === 'fisica' ? undefined : t('museo.cerrado')} />
        ))}
      </section>
      <TarjetaNarrable id="museo-cerrado" texto={t('museo.cerrado')} />
    </>
  );
}

/** E-22 Lab home: continue the exhibit in progress. Empty until F3 reports one. */
export function Lab() {
  const { t } = useTranslation();
  const conApoyo = efectosDeNivel(useSesion((s) => s.nivel)).pictogramas;
  const inicio = (
    <TarjetaNarrable id="lab-vacio" titulo={t('lab.vacio.titulo')} texto={t('lab.vacio.texto')}>
      <Button asChild className="mt-3 w-full" size="lg">
        <Link to="/museo">{t('lab.irMuseo')}</Link>
      </Button>
    </TarjetaNarrable>
  );
  const frases = (
    <div className="flex flex-col gap-2">
      <h2 className="m-0 text-title-sm font-bold">
        {t('frases.titulo')}
      </h2>
      <ConstructorDeFrases />
    </div>
  );
  // With support the pictogram builder comes first: it is the main way to say a prediction.
  return conApoyo ? (
    <>
      {frases}
      {inicio}
    </>
  ) : (
    <>
      {inicio}
      {frases}
    </>
  );
}

/** E-19 Mi Cerebro Rikuy: empty state. A node lights only from real evidence (F10 draws the map). */
export function Cerebro() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3">
      <Mascot estado="piensa" size={96} />
      <TarjetaNarrable id="cerebro-vacio" texto={t('cerebro.vacio')} className="w-full" />
    </div>
  );
}

/** E-15 Quipu: the legend of the three knots and an empty cord. No ranking, no scores, no streaks. */
export function Quipu() {
  const { t } = useTranslation();
  return (
    <>
      <TarjetaNarrable id="quipu-vacio" texto={t('quipu.vacio')} />
      <section aria-labelledby="leyenda-nudos" className="flex flex-col gap-2">
        <h2 id="leyenda-nudos" className="m-0 text-title-sm font-bold">
          {t('quipu.leyenda')}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {(['simple', 'largo', 'ocho'] as const).map((tipo) => (
            <li key={tipo} className="flex min-h-12 items-center gap-3 rounded-ctl border-2 border-line bg-surface px-3 py-2">
              <KnotIcon tipo={tipo} size={32} className="text-primary" />
              <span className="text-body">{t(`nudo.${tipo}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** E-23 Yo: what belongs to this group's phone: its class, my QR, language, theme, accessibility. */
export function Yo() {
  const { t } = useTranslation();
  const apodo = useSesion((s) => s.apodo);
  const codigo = useSesion((s) => s.codigoClase);
  const salirDeLaClase = useSesion((s) => s.salirDeLaClase);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {apodo ? <Chip variant="hall">{t('yo.grupo', { apodo: t(`apodos.${apodo}`) })}</Chip> : null}
        {codigo ? <Chip>{t('yo.clase', { codigo })}</Chip> : null}
      </div>
      <TarjetaNarrable id="yo-qr" titulo={t('yo.miQr')} texto={t('yo.miQrAyuda')}>
        <Button asChild variant="tonal" className="mt-3 w-full">
          <Link to="/relevo">
            <QrCode />
            {t('yo.miQr')}
          </Link>
        </Button>
      </TarjetaNarrable>
      <AjustesGenerales />
      <Button variant="danger" onClick={salirDeLaClase}>
        {t('yo.salir')}
      </Button>
    </>
  );
}
