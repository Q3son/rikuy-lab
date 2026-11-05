// @vitest-environment jsdom
import { dispositivos, ejemplos, ids } from '@rikuy/contracts/fixtures';
import { createEventWriter } from '@rikuy/sync';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from '@rikuy/sync/testing';
import { renderHook, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createRikuyDb } from './db.ts';
import { useClassEventCount, useClassState, useClassVector } from './react.ts';
import { createDexieStore } from './store.ts';

const keys = fakeClassKeys();

describe('live hooks (useLiveQuery)', () => {
  it('re-render when events are appended', async () => {
    // Global IndexedDB on purpose: liveQuery does not fire with an injected indexedDB option.
    const store = createDexieStore(createRikuyDb(`rikuy-react-${Math.random()}`));
    const state = renderHook(() => useClassState(store.db, ids.clase));
    const count = renderHook(() => useClassEventCount(store.db, ids.clase));
    const vv = renderHook(() => useClassVector(store.db, ids.clase));
    await waitFor(() => expect(count.result.current).toBe(0));
    expect(state.result.current).toBeUndefined();

    const w = createEventWriter({ claseId: ids.clase, dispositivo: dispositivos.docente, repo: store.repo, cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada, clock: manualClock(), random: seededRandom('r') });
    await w.append('clase.creada', { ...ejemplos.clase, claveClasePub: keys.clavePub });
    await w.append('tutor.interruptor', { activo: false });

    await waitFor(() => expect(count.result.current).toBe(2));
    await waitFor(() => expect(state.result.current?.clase?.codigo).toBe('PEND42'));
    expect(state.result.current?.interruptores.tutor['*']).toBe(false);
    await waitFor(() => expect(vv.result.current).toEqual({ [dispositivos.docente]: 2 }));
  });
});
