import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn.ts';

/** DESIGN.md 11: 48 px (56 px primary large), 12 px radius, 2 px border, label 17 px / 600. */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-ctl border-2 px-4 text-body font-semibold ' +
    'ease-rk select-none ' +
    'disabled:pointer-events-none disabled:border-line disabled:bg-surface-2 disabled:text-niebla disabled:shadow-none ' +
    '[&_svg]:size-6 [&_svg]:shrink-0 [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'press-edge border-primary bg-primary text-primary-on',
        secondary: 'border-line-strong bg-surface text-ink active:translate-y-0.5',
        tonal: 'border-primary bg-primary-tint text-primary-press active:translate-y-0.5',
        danger: 'border-grana bg-grana-tint text-grana-ink active:translate-y-0.5',
        ghost: 'border-transparent bg-transparent text-ink active:translate-y-0.5',
      },
      size: {
        default: 'h-12',
        lg: 'h-14',
        icon: 'h-12 w-12 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Optional secondary-language sublabel (14 px italic, under the label). */
  sublabel?: ReactNode;
}

export function Button({ className, variant, size, asChild = false, sublabel, children, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  const content = sublabel ? (
    <span className="flex flex-col items-center leading-tight">
      <span>{children}</span>
      <span className="text-caption font-normal italic text-niebla">{sublabel}</span>
    </span>
  ) : (
    children
  );
  return (
    <Comp
      data-variant={variant ?? 'primary'}
      className={cn(buttonVariants({ variant, size }), sublabel && 'h-auto min-h-12 py-1', className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    >
      {asChild ? children : content}
    </Comp>
  );
}
