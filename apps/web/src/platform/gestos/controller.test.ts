import { describe, expect, it, vi } from 'vitest';
import { HandGestureController, type GestureStatus, type WorkerLike } from './controller.ts';
import { GestureSwitch } from './teacherSwitch.ts';

class FakeWorker implements WorkerLike {
  onmessage: ((e: MessageEvent) => void) | null = null;
  posted: Array<{ type: string }> = [];
  terminated = false;
  postMessage(msg: { type: string }) {
    this.posted.push(msg);
    if (msg.type === 'init') queueMicrotask(() => this.reply({ type: 'ready' }));
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

function setup(enabled = true) {
  const sw = new GestureSwitch(null);
  sw.set(enabled);
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const getUserMedia = vi.fn(async () => stream);
  const worker = new FakeWorker();
  const video = { srcObject: null as unknown, play: vi.fn(async () => {}), readyState: 4 } as unknown as HTMLVideoElement;
  const statuses: GestureStatus[] = [];
  const actions: unknown[] = [];
  const ctl = new HandGestureController({
    gestureSwitch: sw,
    getUserMedia,
    createWorker: () => worker,
    video,
    grabFrame: async () => ({ close() {} }) as unknown as ImageBitmap,
    schedule: () => {}, // the test drives frames by hand
    assets: { wasmBase: 'https://x/mediapipe/wasm', modelUrl: 'https://x/mediapipe/hand_landmarker.task' },
  });
  ctl.onStatus = (s) => statuses.push(s);
  ctl.onAction = (a) => actions.push(a);
  return { sw, ctl, getUserMedia, worker, track, video, statuses, actions };
}

describe('HandGestureController', () => {
  it('GATE: with the teacher switch off, getUserMedia is never called', async () => {
    const { ctl, getUserMedia, statuses } = setup(false);
    expect(await ctl.start()).toBe(false);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe('blocked');
  });

  it('asks only for video at low resolution and processes frames in the worker', async () => {
    const { ctl, getUserMedia, worker, statuses } = setup();
    expect(await ctl.start()).toBe(true);
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false });
    expect(statuses).toEqual(['loading', 'active']);
    expect(worker.posted[0]).toMatchObject({ type: 'init', wasmBase: 'https://x/mediapipe/wasm' });
    await ctl.pump();
    expect(worker.posted.at(-1)?.type).toBe('frame');
  });

  it('sends one frame at a time (no queue, low latency)', async () => {
    const { ctl, worker } = setup();
    await ctl.start();
    await ctl.pump();
    await ctl.pump();
    expect(worker.posted.filter((m) => m.type === 'frame')).toHaveLength(1);
    worker.reply({ type: 'result', actions: [], pose: null });
    await ctl.pump();
    expect(worker.posted.filter((m) => m.type === 'frame')).toHaveLength(2);
  });

  it('forwards only actions and pose from the worker', async () => {
    const { ctl, worker, actions } = setup();
    const poses: unknown[] = [];
    ctl.onPose = (p) => poses.push(p);
    await ctl.start();
    await ctl.pump();
    worker.reply({ type: 'result', actions: [{ type: 'pause' }], pose: 'fist' });
    expect(actions).toEqual([{ type: 'pause' }]);
    expect(poses).toEqual(['fist']);
  });

  it('GATE: the teacher kill-switch stops the camera at once', async () => {
    const { sw, ctl, track, worker, video, statuses } = setup();
    await ctl.start();
    sw.set(false);
    expect(track.stop).toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
    expect(video.srcObject).toBeNull();
    expect(statuses.at(-1)).toBe('blocked');
  });

  it('reports an error and releases the worker when the camera is refused', async () => {
    const { ctl, getUserMedia, worker, statuses } = setup();
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    expect(await ctl.start()).toBe(false);
    expect(statuses.at(-1)).toBe('error');
    expect(worker.terminated).toBe(true);
  });
});

describe('GestureSwitch', () => {
  it('applies the signed class event, also when it targets this group only', () => {
    const sw = new GestureSwitch(null);
    sw.applyEvent({ activo: false, grupoId: 'OTHER' }, 'MINE');
    expect(sw.enabled).toBe(true);
    sw.applyEvent({ activo: false, grupoId: 'MINE' }, 'MINE');
    expect(sw.enabled).toBe(false);
    sw.applyEvent({ activo: true }, 'MINE');
    expect(sw.enabled).toBe(true);
  });

  it('persists the state', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as Storage;
    new GestureSwitch(storage).set(false);
    expect(new GestureSwitch(storage).enabled).toBe(false);
  });
});
