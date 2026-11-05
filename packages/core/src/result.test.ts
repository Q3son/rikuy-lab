import { describe, expect, it } from 'vitest';
import { err, isOk, ok } from './result.ts';

describe('Result', () => {
  it('discriminates ok and err', () => {
    const a = ok(3);
    const b = err('boom');
    expect(isOk(a)).toBe(true);
    expect(isOk(b)).toBe(false);
    if (a.ok) expect(a.value).toBe(3);
    if (!b.ok) expect(b.error).toBe('boom');
  });
});
