/**
 * Teacher kill-switch for hand gestures (1.4). Fed by the signed `gestos.interruptor` event
 * (per class or per group) and by the teacher toggle; when it goes off, every running camera
 * stops at once. Mirrored to other tabs of the same device with a BroadcastChannel.
 */
const KEY = 'rikuy.gestos.interruptor';
const CHANNEL = 'rikuy-gestos-interruptor';

export class GestureSwitch {
  private value: boolean;
  private readonly listeners = new Set<(enabled: boolean) => void>();
  private readonly channel: BroadcastChannel | null;

  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage(),
    channel: BroadcastChannel | null = null,
  ) {
    this.value = readStored(storage);
    this.channel = channel;
    if (this.channel) this.channel.onmessage = (e) => this.update(Boolean(e.data), false);
  }

  get enabled(): boolean {
    return this.value;
  }

  set(enabled: boolean): void {
    this.update(enabled, true);
  }

  /** Applies a `gestos.interruptor` event (`DatosInterruptor`); a group-targeted event only affects that group. */
  applyEvent(datos: { activo: boolean; grupoId?: string }, myGroupId?: string): void {
    if (datos.grupoId && datos.grupoId !== myGroupId) return;
    this.set(datos.activo);
  }

  subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private update(enabled: boolean, broadcast: boolean) {
    if (enabled === this.value) return;
    this.value = enabled;
    try {
      this.storage?.setItem(KEY, enabled ? '1' : '0');
    } catch {
      /* storage blocked: the switch still works in memory */
    }
    if (broadcast) this.channel?.postMessage(enabled);
    for (const l of this.listeners) l(enabled);
  }
}

function readStored(storage: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

let shared: GestureSwitch | null = null;

/** The device-wide switch (one per page). */
export function gestureSwitch(): GestureSwitch {
  shared ??= new GestureSwitch(safeStorage(), typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null);
  return shared;
}
