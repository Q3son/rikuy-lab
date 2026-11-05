import { Button, Card, OpcionesRadio, Switch, porcentajeEscala } from '@rikuy/ui';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAnunciar } from './anuncios.tsx';
import { useHaptica } from './cues-ui.tsx';
import { useAjustesA11y, VELOCIDADES_BARRIDO, VELOCIDADES_VOZ } from './ajustes.ts';
import { useNarrador } from './narracion.tsx';

/**
 * Accessibility panel (Yo and Ajustes). Everything is a labelled control that states its value in
 * words. Nothing here is required to use the app: all of it is opt-in and stored on this device only.
 */
export function PanelAccesibilidad() {
  const { t, i18n } = useTranslation();
  const anunciar = useAnunciar();
  const narrador = useNarrador();
  const haptica = useHaptica();
  const a = useAjustesA11y();
  const porcentaje = porcentajeEscala(a.escalaTexto);
  const formato = new Intl.NumberFormat('es-PE');
  const sinVoz = i18n.language === 'es' && narrador.disponibilidad({ id: 'sonda', texto: 'sonda' }) === 'sin-voz';
  const vibra = haptica.disponible;
  const si = t('a11y.si');
  const no = t('a11y.no');

  return (
    <section aria-labelledby="a11y-titulo" className="flex flex-col gap-3">
      <h2 id="a11y-titulo" className="m-0 text-title font-extrabold">
        {t('a11y.titulo')}
      </h2>

      <Card>
        <Switch
          label={t('a11y.audio.etiqueta')}
          onLabel={t('a11y.activo')}
          offLabel={t('a11y.apagado')}
          checked={a.modoAudio}
          onCheckedChange={(v) => {
            a.fijar({ modoAudio: v });
            anunciar(t(v ? 'a11y.audio.encendido' : 'a11y.audio.apagado'));
          }}
        />
        <p className="measure m-0 text-small text-ink-2">{t('a11y.audio.ayuda')}</p>
        {sinVoz && !a.soloLectorPantalla ? <p className="measure mt-2 text-small font-semibold text-sol-ink">{t('a11y.audio.sinVoz')}</p> : null}
        <p className="mt-3 text-small font-bold">{t('a11y.velocidad.titulo')}</p>
        <OpcionesRadio
          ariaLabel={t('a11y.velocidad.titulo')}
          value={String(a.velocidadVoz)}
          onValueChange={(v) => a.fijar({ velocidadVoz: Number(v) as (typeof VELOCIDADES_VOZ)[number] })}
          opciones={VELOCIDADES_VOZ.map((v) => ({ value: String(v), label: `${formato.format(v)}x` }))}
        />
        <Switch
          label={t('a11y.soloLector.etiqueta')}
          onLabel={t('a11y.activo')}
          offLabel={t('a11y.apagado')}
          checked={a.soloLectorPantalla}
          onCheckedChange={(v) => a.fijar({ soloLectorPantalla: v })}
        />
        <p className="measure m-0 text-small text-ink-2">{t('a11y.soloLector.ayuda')}</p>
      </Card>

      <Card>
        <p className="m-0 text-body font-semibold">{t('a11y.texto.titulo')}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="icon" aria-label={t('a11y.texto.menos')} disabled={a.escalaTexto <= 1} onClick={() => a.cambiarEscala(-1)}>
            <Minus />
          </Button>
          <p role="status" className="m-0 min-w-0 flex-1 text-center text-body font-bold tabular">
            {t('a11y.texto.actual', { porcentaje })}
          </p>
          <Button variant="secondary" size="icon" aria-label={t('a11y.texto.mas')} disabled={a.escalaTexto >= 2} onClick={() => a.cambiarEscala(1)}>
            <Plus />
          </Button>
        </div>
      </Card>

      <Card>
        <Switch
          label={t('a11y.movimiento.etiqueta')}
          onLabel={si}
          offLabel={no}
          checked={a.movimiento === 'reducido'}
          onCheckedChange={(v) => a.fijar({ movimiento: v ? 'reducido' : 'auto' })}
        />
        <Switch label={t('a11y.contraste.etiqueta')} onLabel={si} offLabel={no} checked={a.contraste === 'alto'} onCheckedChange={(v) => a.fijar({ contraste: v ? 'alto' : 'normal' })} />
        <Switch
          label={t('a11y.haptica.etiqueta')}
          onLabel={si}
          offLabel={no}
          checked={a.haptica}
          disabled={!vibra}
          onCheckedChange={(v) => {
            a.fijar({ haptica: v });
            if (v) crearHapticaConfirmacion();
          }}
        />
        {!vibra ? <p className="m-0 text-small text-ink-2">{t('a11y.haptica.noDisponible')}</p> : null}
      </Card>

      <Card>
        <Switch label={t('a11y.barrido.etiqueta')} onLabel={si} offLabel={no} checked={a.barrido} onCheckedChange={(v) => a.fijar({ barrido: v })} />
        <p className="measure m-0 text-small text-ink-2">{t('a11y.barrido.ayuda')}</p>
        <OpcionesRadio
          ariaLabel={t('a11y.barrido.velocidad')}
          value={String(a.barridoMs)}
          onValueChange={(v) => a.fijar({ barridoMs: Number(v) })}
          opciones={VELOCIDADES_BARRIDO.map((ms) => ({ value: String(ms), label: t(ms === 4000 ? 'a11y.barrido.lento' : ms === 2500 ? 'a11y.barrido.normal' : 'a11y.barrido.rapido') }))}
          className="mt-2"
        />
      </Card>
    </section>
  );
}

/** One short vibration so the person feels that the option works. */
function crearHapticaConfirmacion(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(20);
}
