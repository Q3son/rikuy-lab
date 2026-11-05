/**
 * @rikuy/ui: shadcn/ui components, tokens and presentational components (props only, no domain).
 * Sprint 0 skeleton; owned by F1.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const packageName = '@rikuy/ui' as const;

/** shadcn/ui class merge helper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
