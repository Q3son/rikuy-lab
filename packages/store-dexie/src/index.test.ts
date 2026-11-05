import { describe, expect, it } from 'vitest';
import { packageName } from './index.ts';

describe('@rikuy/store-dexie skeleton', () => {
  it('exposes its package name', () => {
    expect(packageName).toBe('@rikuy/store-dexie');
  });
});
