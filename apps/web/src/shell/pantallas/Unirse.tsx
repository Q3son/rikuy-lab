import { Button, Field, Mascot, OpcionesRadio, SelectField } from '@rikuy/ui';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { useAjustesA11y } from '../accesibilidad/ajustes.ts';
import { INICIO_POR_ROL } from '../navegacion.ts';
import { efectosDeNivel, NIVELES, type NivelAcompanamiento } from '../nivel.ts';
import { useSesion } from '../sesion.ts';
import { APODOS, validarUnirse } from '../unirse.ts';

/**
 * E-00: join by class code and group nickname, then choose how the group wants to work today.
 * The nickname comes from a closed list (no free text, no real names). The level of support is not a
 * diagnosis and is not stored as a label of any student.
 */
export function Unirse() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const rol = useSesion((s) => s.rol);
  const codigoClase = useSesion((s) => s.codigoClase);
  const unirse = useSesion((s) => s.unirse);
  const [codigo, setCodigo] = useState('');
  const [apodo, setApodo] = useState('');
  const [nivel, setNivel] = useState<NivelAcompanamiento>('normal');
  const [errores, setErrores] = useState<{ codigo?: string; apodo?: string }>({});

  if (rol === 'docente') return <Navigate to={INICIO_POR_ROL.docente} replace />;
  if (rol === 'grupo' && codigoClase) return <Navigate to={INICIO_POR_ROL.grupo} replace />;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = validarUnirse(codigo, apodo);
    if (!r.ok) {
      setErrores({ codigo: r.errores.codigo && t(r.errores.codigo), apodo: r.errores.apodo && t(r.errores.apodo) });
      return;
    }
    unirse({ codigo: r.codigo, apodo: r.apodo, nivel });
    if (efectosDeNivel(nivel).modoAudio) useAjustesA11y.getState().fijar({ modoAudio: true });
    navegar(INICIO_POR_ROL.grupo);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[var(--rk-w-phone)] flex-col gap-5 px-4 py-6">
      <header className="flex items-center gap-3">
        <Mascot estado="curiosa" size={64} />
        <h1 className="m-0 text-title font-extrabold">{t('unirse.titulo')}</h1>
      </header>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Field
          label={t('unirse.codigo')}
          hint={t('unirse.codigoAyuda')}
          error={errores.codigo}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          className="text-title font-extrabold tracking-widest"
        />
        <SelectField
          label={t('unirse.apodo')}
          error={errores.apodo}
          value={apodo}
          onChange={(e) => setApodo(e.target.value)}
          placeholder={t('unirse.apodoPlaceholder')}
          options={APODOS.map((a) => ({ value: a, label: t(`apodos.${a}`) }))}
        />

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 p-0 text-body font-semibold text-ink">{t('nivel.titulo')}</legend>
          <OpcionesRadio
            ariaLabel={t('nivel.titulo')}
            value={nivel}
            onValueChange={(v) => setNivel(v as NivelAcompanamiento)}
            vertical
            opciones={NIVELES.map((n) => ({ value: n, label: t(`nivel.${n}`), descripcion: t(`nivel.${n}Ayuda`) }))}
          />
          <p className="measure m-0 text-caption text-ink-2">{t('nivel.aviso')}</p>
        </fieldset>

        <Button type="submit" size="lg">
          {t('unirse.entrar')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navegar('/')}>
          {t('unirse.volver')}
        </Button>
      </form>
    </main>
  );
}
