/**
 * React hook over the hand-gesture controller. MediaPipe and the worker are imported only when
 * the group presses "Activar cámara de manos" (load on demand, 5.4).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerAction } from '@rikuy/holo';
import type { GestureStatus, HandGestureController, HandPose } from '../../platform/gestos/index.ts';

export interface GestosMano {
  status: GestureStatus;
  pose: HandPose | null;
  detail: string | undefined;
  start: () => Promise<boolean>;
  stop: () => void;
}

export function useGestosMano(onAction: (a: ViewerAction) => void): GestosMano {
  const [status, setStatus] = useState<GestureStatus>('off');
  const [detail, setDetail] = useState<string>();
  const [pose, setPose] = useState<HandPose | null>(null);
  const ctl = useRef<HandGestureController | null>(null);
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => () => ctl.current?.dispose(), []);

  const start = useCallback(async () => {
    if (!ctl.current) {
      const { createHandGestures } = await import('../../platform/gestos/index.ts');
      const c = createHandGestures();
      c.onStatus = (s, d) => {
        setStatus(s);
        setDetail(d);
      };
      c.onPose = setPose;
      c.onAction = (a) => onActionRef.current(a);
      ctl.current = c;
    }
    return ctl.current.start();
  }, []);

  const stop = useCallback(() => {
    ctl.current?.stop();
    setPose(null);
  }, []);

  return { status, pose, detail, start, stop };
}
