import { Check, Info, Upload, WifiOff } from 'lucide-react';
import { Chip } from './ui/chip.tsx';
import { cn } from '../lib/cn.ts';

export type EstadoSync = 'sin-red' | 'por-enviar' | 'enviando' | 'enviado' | 'error';

const CONFIG = {
  'sin-red': { variant: 'off', Icon: WifiOff },
  'por-enviar': { variant: 'warn', Icon: Upload },
  enviando: { variant: 'sync', Icon: Upload },
  enviado: { variant: 'ok', Icon: Check },
  error: { variant: 'off', Icon: Info },
} as const;

/**
 * Offline and sync status chip (DESIGN.md 11). Icon + word, always says where the data is:
 * the caller provides the sentence ("Sin red, todo guardado"). Tappable chips open the queue.
 */
export function SyncChip({ estado, label, onClick, className }: { estado: EstadoSync; label: string; onClick?: () => void; className?: string }) {
  const { variant, Icon } = CONFIG[estado];
  const icon = <Icon className={cn(estado === 'enviando' && 'motion-safe:animate-spin')} />;
  return (
    <span role="status" aria-live="polite" data-estado={estado} className={cn('inline-flex', className)}>
      <Chip variant={variant} icon={icon} onClick={onClick}>
        {label}
      </Chip>
    </span>
  );
}
