/**
 * Device-wide store for the relevo feature. One Dexie database per origin ("rikuy").
 * If the shell later owns a shared store instance, this module can re-export it.
 */
import { createDexieStore, createRikuyDb, type DexieStore } from '@rikuy/store-dexie';
import { createRelevo, type Relevo } from './relevo.ts';

let store: DexieStore | undefined;
let relevo: Relevo | undefined;

export function getRelevo(): Relevo {
  store ??= createDexieStore(createRikuyDb('rikuy'));
  relevo ??= createRelevo(store);
  return relevo;
}
