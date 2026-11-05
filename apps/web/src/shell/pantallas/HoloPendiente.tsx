import { Button } from '@rikuy/ui';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

const PAGINAS = { display: 'display.html', control: 'control.html', clasico: 'clasico.html' } as const;

/**
 * Landing of the redirected old hologram URLs until F3 ports the viewer to `@rikuy/holo`. The route
 * `/holo` is theirs (a feature route registered before this one replaces it); until then the person
 * gets a button to the legacy page that is still served, with the same room code.
 */
export function HoloPendiente() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const modo = params.get('modo') as keyof typeof PAGINAS | null;
  const pagina = (modo && PAGINAS[modo]) ?? PAGINAS.clasico;
  const sala = params.get('sala');
  const href = `./${pagina}${sala ? `?sala=${encodeURIComponent(sala)}` : ''}`;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[var(--rk-w-phone)] flex-col justify-center gap-4 px-4 py-8">
      <h1 className="m-0 text-title font-extrabold">{t('holo.titulo')}</h1>
      <p className="measure m-0 text-body text-ink-2">{t('holo.pendiente')}</p>
      <Button asChild size="lg">
        <a href={href}>{t('holo.abrirClasico')}</a>
      </Button>
    </main>
  );
}
