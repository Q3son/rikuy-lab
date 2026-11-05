import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.ts';
import { SpeakButton, type Narracion } from '../speak-button.tsx';

/** One idea per card, never nested. 2 px border, 16 px radius, 16 px padding (DESIGN.md 11). */
const cardVariants = cva('rounded-card border-2 p-4 shadow-card', {
  variants: {
    tone: {
      default: 'border-line bg-surface text-ink',
      hypothesis: 'border-sol bg-sol-tint text-ink',
      evidence: 'border-foton-ink bg-foton-tint text-ink',
      conclusion: 'border-ichu bg-ichu-tint text-ink',
      alert: 'border-grana bg-grana-tint text-ink',
      muted: 'border-line bg-surface-2 text-ink',
      dashed: 'border-dashed border-line-strong bg-surface text-ink',
    },
  },
  defaultVariants: { tone: 'default' },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  /** Offers the speak / stop button of the audio mode on this card. */
  narracion?: Narracion;
}

export function Card({ className, tone, narracion, children, ...props }: CardProps) {
  return (
    <div data-tone={tone ?? 'default'} className={cn(cardVariants({ tone }), className)} {...props}>
      {children}
      {narracion ? (
        <div className="mt-2 flex justify-end">
          <SpeakButton {...narracion} />
        </div>
      ) : null}
    </div>
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-title-sm font-bold text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-small text-ink-2', className)} {...props} />;
}
