import { ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { createMemoryKeyStore, createStudentVault } from './boveda.ts';

describe('per-student encryption and crypto-erase (primitives for F4)', () => {
  it('encrypts and decrypts with a per-student key; ciphertexts differ each time', async () => {
    const vault = createStudentVault(createMemoryKeyStore());
    const a = await vault.encrypt(ids.estudiante1, 'predijo que tarda más');
    const b = await vault.encrypt(ids.estudiante1, 'predijo que tarda más');
    expect(a).not.toBe(b);
    expect(a).not.toContain('predijo');
    expect(await vault.decrypt(ids.estudiante1, a)).toBe('predijo que tarda más');
  });

  it('a student key cannot open another student data', async () => {
    const vault = createStudentVault(createMemoryKeyStore());
    const a = await vault.encrypt(ids.estudiante1, 'secreto');
    await vault.encrypt(ids.estudiante2, 'otro');
    await expect(vault.decrypt(ids.estudiante2, a)).rejects.toThrow();
  });

  it('after forget() the data is unrecoverable and new writes are refused', async () => {
    const store = createMemoryKeyStore();
    const vault = createStudentVault(store);
    const blob = await vault.encrypt(ids.estudiante1, 'memoria');
    await vault.forget(ids.estudiante1);
    await expect(vault.decrypt(ids.estudiante1, blob)).rejects.toThrow(/forgotten/);
    await expect(vault.encrypt(ids.estudiante1, 'nueva')).rejects.toThrow(/forgotten/);
    expect(await store.get(ids.estudiante1)).toBeUndefined();
  });
});
