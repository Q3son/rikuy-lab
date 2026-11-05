import { Logo, Mascot } from '@rikuy/ui';
import { GraduationCap, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { INICIO_POR_ROL, type Rol } from '../shell/navegacion.ts';
import { useSesion } from '../shell/sesion.ts';

/**
 * Entry (E-00 / T-00): choose how to use Rikuy. One home, no accounts. A device that already chose a
 * role (and, for a group, a class) goes straight to its home.
 */
export function Inicio() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const rol = useSesion((s) => s.rol);
  const codigoClase = useSesion((s) => s.codigoClase);
  const elegirRol = useSesion((s) => s.elegirRol);

  if (rol === 'docente' || (rol === 'grupo' && codigoClase)) return <Navigate to={INICIO_POR_ROL[rol]} replace />;

  const elegir = (nuevo: Rol) => {
    elegirRol(nuevo);
    navegar(nuevo === 'docente' ? INICIO_POR_ROL.docente : '/entrar');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[var(--rk-w-phone)] flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <Mascot estado="curiosa" size={112} />
        <h1 className="m-0">
          <Logo className="h-10" />
        </h1>
        <p className="measure m-0 text-body-lg font-semibold text-ink">{t('roles.titulo')}</p>
        <p className="measure m-0 text-small text-ink-2">{t('roles.ayuda')}</p>
      </header>

      <div className="flex flex-col gap-3">
        {(
          [
            ['docente', <GraduationCap key="d" />],
            ['grupo', <Users key="g" />],
          ] as const
        ).map(([id, icono]) => (
          <button
            key={id}
            type="button"
            onClick={() => elegir(id)}
            className="flex min-h-20 w-full items-center gap-4 rounded-card border-2 border-line-strong bg-surface p-4 text-left shadow-card [&_svg]:size-8 [&_svg]:shrink-0 [&_svg]:text-primary"
          >
            {icono}
            <span className="flex flex-col">
              <span className="text-title-sm font-extrabold text-ink">{t(`roles.${id}.titulo`)}</span>
              <span className="text-small text-ink-2">{t(`roles.${id}.descripcion`)}</span>
            </span>
          </button>
        ))}
      </div>

      <a href="./clasico.html" className="rk-hit mt-auto inline-flex items-center justify-center rounded-ctl border-2 border-line-strong px-4 text-body font-semibold text-primary">
        {t('roles.clasico')}
      </a>
    </main>
  );
}
