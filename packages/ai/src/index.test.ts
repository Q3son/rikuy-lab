import { describe, expect, it } from 'vitest';
import { packageName } from './index.ts';

describe('@rikuy/ai skeleton', () => {
  it('exposes its package name', () => {
    expect(packageName).toBe('@rikuy/ai');
  });
});
