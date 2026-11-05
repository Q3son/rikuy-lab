import { describe, expect, it } from 'vitest';
import { sha256 } from './sha256.ts';

describe('sha256', () => {
  it('matches the standard vectors', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });
  it('hashes UTF-8 text', () => {
    expect(sha256('péndulo')).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256('péndulo')).not.toBe(sha256('pendulo'));
  });
});
