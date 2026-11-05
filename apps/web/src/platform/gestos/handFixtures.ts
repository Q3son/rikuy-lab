/** Synthetic hand landmarks (MediaPipe's 21 points, normalized image coords) for tests. */
import type { Landmark } from './classifier.ts';

type Finger = 'index' | 'middle' | 'ring' | 'pinky';
const COLUMNS: Record<Finger, number> = { index: 0.45, middle: 0.5, ring: 0.55, pinky: 0.6 };
const BASE: Record<Finger, number> = { index: 5, middle: 9, ring: 13, pinky: 17 };

export interface HandSpec {
  extended?: Finger[];
  thumb?: 'folded' | 'side' | 'up';
  pinch?: boolean;
  /** Shift of the whole hand (to simulate movement). */
  dx?: number;
  dy?: number;
  /** Scale of the whole hand around the wrist (distance to the camera). */
  scale?: number;
}

export function hand({ extended = [], thumb = 'folded', pinch = false, dx = 0, dy = 0, scale = 1 }: HandSpec): Landmark[] {
  const wrist = { x: 0.5, y: 0.8 };
  const pts: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  pts[0] = { ...wrist, z: 0 };
  for (const f of Object.keys(COLUMNS) as Finger[]) {
    const x = COLUMNS[f];
    const b = BASE[f];
    pts[b] = { x, y: 0.6, z: 0 }; // MCP
    if (extended.includes(f)) {
      pts[b + 1] = { x, y: 0.5, z: 0 }; // PIP
      pts[b + 2] = { x, y: 0.45, z: 0 }; // DIP
      pts[b + 3] = { x, y: 0.4, z: 0 }; // TIP
    } else {
      pts[b + 1] = { x, y: 0.52, z: 0 };
      pts[b + 2] = { x, y: 0.58, z: 0 };
      pts[b + 3] = { x, y: 0.64, z: 0 }; // curled back toward the wrist
    }
  }
  if (thumb === 'side') {
    pts[1] = { x: 0.44, y: 0.74, z: 0 };
    pts[2] = { x: 0.4, y: 0.7, z: 0 };
    pts[3] = { x: 0.35, y: 0.66, z: 0 };
    pts[4] = { x: 0.3, y: 0.62, z: 0 };
  } else if (thumb === 'up') {
    pts[1] = { x: 0.44, y: 0.72, z: 0 };
    pts[2] = { x: 0.42, y: 0.62, z: 0 };
    pts[3] = { x: 0.41, y: 0.5, z: 0 };
    pts[4] = { x: 0.4, y: 0.38, z: 0 };
  } else {
    pts[1] = { x: 0.46, y: 0.74, z: 0 };
    pts[2] = { x: 0.45, y: 0.68, z: 0 };
    pts[3] = { x: 0.46, y: 0.64, z: 0 };
    pts[4] = { x: 0.48, y: 0.62, z: 0 };
  }
  if (pinch) {
    pts[8] = { x: 0.4, y: 0.47, z: 0 };
    pts[4] = { x: 0.405, y: 0.475, z: 0 };
  }
  return pts.map((p) => ({ x: wrist.x + (p.x - wrist.x) * scale + dx, y: wrist.y + (p.y - wrist.y) * scale + dy, z: p.z }));
}
