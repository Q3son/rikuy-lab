import { BottomTabs, CameraPill, CaptionBar, KnotIcon, Logo, SyncChip, TopBar, UpdateBanner, cn, type TabItem } from '@rikuy/ui';
import { Brain, CalendarCheck, ChartColumn, ClipboardList, FlaskConical, Landmark, Presentation, Settings, User } from 'lucide-react';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useVersion } from '../platform/pwa/actualizacion.ts';
import { useAjustesA11y } from '../shell/accesibilidad/ajustes.ts';
import { BarridoActivo } from '../shell/accesibilidad/BarridoActivo.tsx';
import { CueVisual } from '../shell/accesibilidad/cues-ui.tsx';
import { useEstadoNarrador, useNarrador } from '../shell/accesibilidad/narracion.tsx';
import { textoDePantalla } from '../shell/accesibilidad/texto-pantalla.ts';
import { estadoDeRed, useCamara, useRed } from '../shell/estado.ts';
import { useMarco } from '../shell/marco.ts';
import { rutaAPantallaCompleta, rutaSinMarco, tabActivo, TABS_DOCENTE, TABS_ESTUDIANTE } from '../shell/navegacion.ts';
import { useSesion } from '../shell/sesion.ts';
import { useEscritorio } from '../features/escritorio/useEscritorio.ts';

const ICONOS: Record<string, ReactNode> = {
  museo: <Landmark />,
  lab: <FlaskConical />,
  cerebro: <Brain />,
  quipu: <KnotIcon tipo="largo" />,
  yo: <User />,
  hoy: <CalendarCheck />,
  clase: <Presentation />,
  evidencia: <ClipboardList />,
  reportes: <ChartColumn />,
  ajustes: <Settings />,
};

const TITULOS = {
  museo: 'museo.titulo',
  lab: 'lab.titulo',
  cerebro: 'cerebro.titulo',
  quipu: 'quipu.titulo',
  yo: 'yo.titulo',
  hoy: 'hoy.titulo',
  clase: 'clase.titulo',
  evidencia: 'evidencia.titulo',
  reportes: 'reportes.titulo',
  ajustes: 'ajustes.titulo',
} as const;

/** Chip with the connection and sync state; offline is a normal state, never an alarm. */
function ChipDeRed() {
  const { t } = useTranslation();
  const red = useRed();
  const { estado, clave, conteo } = estadoDeRed(red);
  return <SyncChip estado={estado} label={clave === 'red.porEnviar' ? t(clave, { count: conteo }) : t(clave)} />;
}

function PildoraCamara({ className }: { className?: string }) {
  const { t } = useTranslation();
  const camara = useCamara();
  if (!camara.activa) return null;
  return <CameraPill className={className} label={t('camara.activa')} apagarLabel={t('camara.apagar')} onApagar={() => camara.apagar?.()} />;
}

function BannerDeVersion() {
  const { t } = useTranslation();
  const { nueva, descartada, aplicar, descartar } = useVersion();
  if (!nueva || descartada) return null;
  return <UpdateBanner mensaje={t('pwa.nueva')} accion={t('pwa.actualizar')} onAccion={() => aplicar?.()} descartar={t('pwa.despues')} onDescartar={descartar} />;
}

/** Audio mode: when it is on, each new screen is read aloud (recording first, then the device voice). */
function NarradorDePantalla({ principal }: { principal: RefObject<HTMLElement | null> }) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const narrador = useNarrador();
  const modoAudio = useAjustesA11y((s) => s.modoAudio);
  const titulo = useMarco((s) => s.titulo);
  useEffect(() => {
    if (!modoAudio) return;
    const id = setTimeout(() => {
      const raiz = principal.current;
      if (!raiz) return;
      const cuerpo = textoDePantalla(raiz);
      void narrador.narrar({ id: 'pantalla', clave: `pantalla:${pathname}`, texto: [t('a11y.audio.pantalla', { titulo: titulo ?? '' }), cuerpo].filter(Boolean).join(' ') });
    }, 300);
    return () => clearTimeout(id);
  }, [modoAudio, pathname, narrador, principal, t, i18n.language, titulo]);
  return null;
}

function SubtitulosDeNarracion() {
  const { t } = useTranslation();
  const { subtitulo } = useEstadoNarrador();
  return <CaptionBar texto={subtitulo} etiqueta={t('a11y.subtitulos')} className="mx-3 mb-2" />;
}

function ControlDeBarrido() {
  const { t } = useTranslation();
  const barrido = useAjustesA11y((s) => s.barrido);
  const barridoMs = useAjustesA11y((s) => s.barridoMs);
  const modoAudio = useAjustesA11y((s) => s.modoAudio);
  const soloLector = useAjustesA11y((s) => s.soloLectorPantalla);
  const fijar = useAjustesA11y((s) => s.fijar);
  const narrador = useNarrador();
  if (!barrido) return null;
  return (
    <BarridoActivo
      intervaloMs={barridoMs}
      onSalir={() => fijar({ barrido: false })}
      alMover={(el) => {
        // With the audio mode on, the scan says what it is about to select.
        if (modoAudio && !soloLector) void narrador.narrar({ id: 'barrido', texto: el.getAttribute('aria-label') ?? el.textContent ?? '' });
      }}
      etiquetas={{
        titulo: t('a11y.barrido.titulo'),
        ayuda: t('a11y.barrido.barra'),
        pausar: t('a11y.barrido.pausar'),
        reanudar: t('a11y.barrido.reanudar'),
        salir: t('a11y.barrido.salir'),
      }}
    />
  );
}

/**
 * Desktop rail (>= 1024 px): the same tabs as the bottom bar, as a vertical rail on the left, so the
 * world and the side panels get the whole width. Links with aria-current; the router keeps the history.
 */
function RielEscritorio({ items, activo, etiqueta, alElegir }: { items: TabItem[]; activo: string | null; etiqueta: string; alElegir: (item: TabItem) => void }) {
  return (
    <nav aria-label={etiqueta} className="flex w-[92px] shrink-0 flex-col items-center gap-1 border-r-2 border-line bg-surface py-4">
      <Logo className="mb-4 h-7 w-auto max-w-[76px]" />
      {items.map((item) => {
        const sel = item.id === activo;
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={sel ? 'page' : undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              alElegir(item);
            }}
            className={cn(
              'relative flex w-[76px] flex-col items-center gap-1 rounded-ctl px-1 py-2 text-[0.8125rem] leading-4 no-underline',
              sel ? 'bg-primary-tint font-extrabold text-ink' : 'font-medium text-ink-2 hover:bg-bg',
            )}
          >
            <span className={cn('inline-flex [&_svg]:size-6', sel ? 'text-primary' : '')} aria-hidden="true">
              {item.icon}
            </span>
            <span className="max-w-full truncate">{item.label}</span>
            {sel ? <span aria-hidden="true" className="absolute left-0 top-1/2 h-8 w-[5px] -translate-y-1/2 rounded-r-chip bg-primary" /> : null}
          </a>
        );
      })}
    </nav>
  );
}

const SALTO = 'sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-ctl focus:bg-surface focus:p-3';

/**
 * The one frame of the product: same top bar, same tab bar, same chips on every screen (DESIGN.md 0).
 * Screens of the entry (role, join), the family page and the display phone have no chrome.
 */
export function Shell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const rol = useSesion((s) => s.rol);
  const codigoClase = useSesion((s) => s.codigoClase);
  const marco = useMarco();
  const principal = useRef<HTMLElement | null>(null);
  const primera = useRef(true);
  const sinMarco = rutaSinMarco(pathname);
  const escritorio = useEscritorio();

  // After a route change, focus the content so screen readers announce the new screen.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    principal.current?.focus();
    if (principal.current) principal.current.scrollTop = 0;
  }, [pathname]);

  if (!sinMarco && !rol) return <Navigate to="/" replace />;
  if (!sinMarco && rol === 'grupo' && !codigoClase) return <Navigate to="/entrar" replace />;

  const comun = (
    <>
      <BannerDeVersion />
      <CueVisual />
      <ControlDeBarrido />
      <NarradorDePantalla principal={principal} />
    </>
  );

  if (sinMarco || !rol) {
    return (
      <div className="min-h-dvh bg-bg text-ink">
        {comun}
        <PildoraCamara className="fixed right-3 top-3 z-50" />
        <a href="#contenido" className={SALTO}>
          {t('app.saltarAlContenido')}
        </a>
        <div id="contenido" ref={principal as RefObject<HTMLDivElement>} tabIndex={-1} className="outline-none">
          <Outlet />
        </div>
      </div>
    );
  }

  const tabs = rol === 'docente' ? TABS_DOCENTE : TABS_ESTUDIANTE;
  const activo = tabActivo(pathname, rol);
  const items: TabItem[] = tabs.map((tab) => ({ id: tab.id, label: t(tab.clave), href: `#${tab.ruta}`, icon: ICONOS[tab.id] }));
  const titulo = marco.titulo ?? (activo ? t(TITULOS[activo as keyof typeof TITULOS]) : t('app.nombre'));
  const ancho = rol === 'docente' ? 'max-w-[var(--rk-w-tablet)]' : 'max-w-[var(--rk-w-phone)]';
  const etiquetaNav = t(rol === 'docente' ? 'nav.docente' : 'nav.estudiante');

  if (escritorio) {
    const completa = rutaAPantallaCompleta(pathname);
    return (
      <div className="flex h-dvh bg-bg text-ink">
        {comun}
        <a href="#contenido" className={SALTO}>
          {t('app.saltarAlContenido')}
        </a>
        <RielEscritorio items={items} activo={activo} etiqueta={etiquetaNav} alElegir={(item) => navegar(item.href.slice(1))} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={titulo}
            onBack={marco.volverA ? () => navegar(marco.volverA!) : undefined}
            backLabel={t('topbar.volver')}
            trailing={
              <>
                <PildoraCamara />
                <ChipDeRed />
              </>
            }
          />
          <main
            id="contenido"
            ref={principal}
            tabIndex={-1}
            className={completa ? 'min-h-0 w-full flex-1 overflow-hidden outline-none' : cn('mx-auto min-h-0 w-full flex-1 overflow-y-auto px-6 py-6 outline-none', rol === 'docente' ? 'max-w-[1480px]' : 'max-w-[var(--rk-w-panel)]')}
          >
            <div className={completa ? 'h-full' : 'flex flex-col gap-4'}>
              <Outlet />
            </div>
          </main>
          <SubtitulosDeNarracion />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-bg text-ink">
      {comun}
      <a href="#contenido" className={SALTO}>
        {t('app.saltarAlContenido')}
      </a>
      <TopBar
        title={titulo}
        onBack={marco.volverA ? () => navegar(marco.volverA!) : undefined}
        backLabel={t('topbar.volver')}
        trailing={
          <>
            <PildoraCamara />
            <ChipDeRed />
          </>
        }
      />
      <main id="contenido" ref={principal} tabIndex={-1} className={`mx-auto min-h-0 w-full flex-1 overflow-y-auto px-4 py-4 outline-none ${ancho}`}>
        <div className="flex flex-col gap-4">
          <Outlet />
        </div>
      </main>
      <SubtitulosDeNarracion />
      <BottomTabs onSelect={(item) => navegar(item.href.slice(1))} items={items} activeId={activo} ariaLabel={etiquetaNav} className="shrink-0" />
    </div>
  );
}
