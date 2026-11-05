import { describe, expect, it } from 'vitest';
import { cn, packageName } from './index.ts';

describe('@rikuy/ui skeleton', () => {
  it('exposes its package name', () => {
    expect(packageName).toBe('@rikuy/ui');
  });

  it('merges tailwind classes, last one wins', () => {
    const hidden = false;
    expect(cn('p-2', hidden && 'hidden', 'p-4')).toBe('p-4');
  });
});
