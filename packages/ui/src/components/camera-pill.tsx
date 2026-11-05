import { Camera, Power } from 'lucide-react';
import { cn } from '../lib/cn.ts';

/**
 * "Cámara activa" pill: Grana tint, 2 px border, camera icon, text and a round power button
 * (36 px visible, 48 px target) that is the kill-switch. 48 px high (DESIGN.md 10.3).
 */
export function CameraPill({ label, apagarLabel, onApagar, className }: { label: string; apagarLabel: string; onApagar: () => void; className?: string }) {
  return (
    <div
      role="status"
      data-camera-pill
      className={cn('inline-flex h-12 items-center gap-2 rounded-chip border-2 border-grana bg-grana-tint pl-3 pr-0 text-caption font-bold text-grana-ink', className)}
    >
      <Camera className="size-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <button type="button" aria-label={apagarLabel} onClick={onApagar} className="inline-flex size-12 items-center justify-center rounded-chip">
        <span className="inline-flex size-9 items-center justify-center rounded-chip border-2 border-grana bg-grana text-grana-on">
          <Power className="size-5" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
