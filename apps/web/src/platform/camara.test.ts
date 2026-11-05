import { afterEach, describe, expect, it, vi } from 'vitest';
import { listCameras, startCamera } from './camara.ts';

afterEach(() => vi.unstubAllGlobals());

function fakeMedia() {
  const stop = vi.fn();
  const track = { stop, applyConstraints: vi.fn().mockRejectedValue(new Error('no focus')) };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const enumerateDevices = vi.fn().mockResolvedValue([
    { kind: 'videoinput', deviceId: 'back' },
    { kind: 'audioinput', deviceId: 'mic' },
  ]);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, enumerateDevices } });
  return { getUserMedia, stop };
}

describe('camera adapter', () => {
  it('asks for the back camera only, never the microphone, and stops every track', async () => {
    const { getUserMedia, stop } = fakeMedia();
    const video = document.createElement('video');
    video.play = vi.fn().mockResolvedValue(undefined);
    const cam = await startCamera(video);
    const constraints = getUserMedia.mock.calls[0][0];
    expect(constraints.audio).toBe(false);
    expect(constraints.video.facingMode).toEqual({ ideal: 'environment' });
    expect(video.muted).toBe(true);
    cam.stop();
    expect(stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });

  it('uses an explicit device when given', async () => {
    const { getUserMedia } = fakeMedia();
    const video = document.createElement('video');
    video.play = vi.fn().mockResolvedValue(undefined);
    await startCamera(video, 'back');
    expect(getUserMedia.mock.calls[0][0].video.deviceId).toEqual({ exact: 'back' });
  });

  it('lists only video inputs', async () => {
    fakeMedia();
    expect((await listCameras()).map((d) => d.deviceId)).toEqual(['back']);
  });
});
