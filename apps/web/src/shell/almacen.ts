/**
 * localStorage that can fail: private windows, blocked site data and quota errors must never break
 * the shell. Falls back to an in-memory store so the settings still work for the session.
 */
export function almacenSeguro(): Storage {
  const memoria = new Map<string, string>();
  const respaldo: Storage = {
    get length() {
      return memoria.size;
    },
    clear: () => memoria.clear(),
    getItem: (k) => memoria.get(k) ?? null,
    key: (i) => [...memoria.keys()][i] ?? null,
    removeItem: (k) => void memoria.delete(k),
    setItem: (k, v) => void memoria.set(k, v),
  };
  try {
    const real = globalThis.localStorage;
    const sonda = '__rikuy_sonda__';
    real.setItem(sonda, '1');
    real.removeItem(sonda);
    return {
      get length() {
        return real.length;
      },
      clear: () => real.clear(),
      getItem: (k) => real.getItem(k),
      key: (i) => real.key(i),
      removeItem: (k) => real.removeItem(k),
      setItem: (k, v) => {
        try {
          real.setItem(k, v);
        } catch {
          memoria.set(k, v);
        }
      },
    };
  } catch {
    return respaldo;
  }
}
