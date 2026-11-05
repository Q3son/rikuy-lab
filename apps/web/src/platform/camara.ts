/**
 * Camera adapter (F2) for reading QR frames. Video only, never audio; frames stay in memory and
 * are only handed to the QR decoder. Adapted from Yaku by agentards (agentards__yaku/src/scanner.ts).
 */
export interface Camera {
  stream: MediaStream;
  stop(): void;
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

/** 1280x720 is enough for a QR v13 at 20-30 cm and keeps each jsQR attempt under ~40 ms. */
export async function startCamera(video: HTMLVideoElement, deviceId?: string): Promise<Camera> {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } };
  const stream = await navigator.mediaDevices.getUserMedia({
    video: deviceId ? { deviceId: { exact: deviceId }, ...size } : { facingMode: { ideal: 'environment' }, ...size },
    audio: false,
  });
  const track = stream.getVideoTracks()[0];
  try {
    await track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
  } catch {
    // no configurable autofocus
  }
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();
  return {
    stream,
    stop() {
      for (const t of stream.getTracks()) t.stop();
      video.srcObject = null;
    },
  };
}
