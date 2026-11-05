import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn.ts';

/** Static chips are 32 px and not interactive; any tappable chip is 48 px (DESIGN.md 4, 11). */
const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-chip border-2 px-3 text-caption font-semibold [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'border-line-strong bg-surface text-ink-2',
        ok: 'border-ichu bg-ichu-tint text-ichu-ink',
        off: 'border-grana bg-grana-tint text-grana-ink',
        sync: 'border-foton-ink bg-foton-tint text-foton-ink',
        warn: 'border-sol bg-sol-tint text-sol-ink',
        hall: 'border-hall bg-hall-tint text-hall-ink',
        dashed: 'border-dashed border-line-strong bg-surface text-ink-2',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'>, VariantProps<typeof chipVariants> {
  icon?: ReactNode;
  onClick?: () => void;
}

export function Chip({ className, variant, icon, onClick, children, ...props }: ChipProps) {
  const body = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        data-chip
        data-variant={variant ?? 'neutral'}
        onClick={onClick}
        className={cn(chipVariants({ variant }), 'min-h-12', className)}
        {...(props as HTMLAttributes<HTMLButtonElement>)}
      >
        {body}
      </button>
    );
  }
  return (
    <span data-chip data-variant={variant ?? 'neutral'} className={cn(chipVariants({ variant }), 'h-8', className)} {...props}>
      {body}
    </span>
  );
}
