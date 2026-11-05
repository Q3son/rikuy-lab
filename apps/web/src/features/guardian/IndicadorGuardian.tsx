import './guardian.css';

export interface IndicadorGuardianProps {
  activo: boolean;
  /** One-tap kill switch (student, guardian or teacher). */
  onApagar(): void;
}

/** "Guardián activo" pill: icon + text (never color alone) plus the power button. Hidden when off. */
export function IndicadorGuardian({ activo, onApagar }: IndicadorGuardianProps) {
  if (!activo) return null;
  return (
    <div className="rk-gd-fila" role="status" style={{ alignItems: 'center', border: '2px solid var(--rk-grana, #a8123b)', background: 'var(--rk-grana-tint, #fbe6ea)', borderRadius: 999, padding: '0 6px 0 14px', minHeight: 48 }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      </svg>
      <span style={{ fontWeight: 700 }}>Guardián activo</span>
      <button type="button" aria-label="Apagar Guardián" onClick={onApagar} style={{ width: 48, height: 48, borderRadius: 999, border: '2px solid currentColor', background: 'transparent', cursor: 'pointer' }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0" />
        </svg>
      </button>
    </div>
  );
}
