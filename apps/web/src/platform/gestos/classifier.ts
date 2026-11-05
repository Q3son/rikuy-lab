/**
 * Hand pose from the 21 MediaPipe hand landmarks (1.4). Pure geometry, scale and position
 * invariant: distances are measured in "hand units" (wrist to middle-finger knuckle).
 * Only these poses leave the worker; the landmarks themselves never do.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandPose = 'palm' | 'fist' | 'pinch' | 'thumbs_up';

const WRIST = 0;
const THUMB = { cmc: 1, mcp: 2, ip: 3, tip: 4 };
const FINGERS = [
  { pip: 6, tip: 8 },
  { pip: 10, tip: 12 },
  { pip: 14, tip: 16 },
  { pip: 18, tip: 20 },
];
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

export function classifyHand(lm: readonly Landmark[]): HandPose | null {
  if (lm.length !== 21) return null;
  const unit = dist(lm[WRIST], lm[MIDDLE_MCP]);
  if (unit < 1e-4) return null;

  // A finger is extended when its tip is clearly farther from the wrist than its middle joint.
  const extended = FINGERS.filter((f) => dist(lm[f.tip], lm[WRIST]) > dist(lm[f.pip], lm[WRIST]) * 1.1).length;
  const thumbOut = dist(lm[THUMB.tip], lm[INDEX_MCP]) / unit > 0.6;
  const thumbUp =
    thumbOut &&
    lm[THUMB.tip].y < lm[THUMB.ip].y &&
    lm[THUMB.ip].y < lm[THUMB.mcp].y &&
    FINGERS.every((f) => lm[THUMB.tip].y < lm[f.tip].y);
  // In a fist the thumb also touches the index, but there the index tip is curled behind its knuckle.
  const indexCurled = dist(lm[FINGERS[0].tip], lm[WRIST]) < dist(lm[INDEX_MCP], lm[WRIST]);
  const pinch = !indexCurled && dist(lm[THUMB.tip], lm[FINGERS[0].tip]) / unit < 0.25;

  if (thumbUp && extended === 0) return 'thumbs_up';
  if (pinch) return 'pinch';
  if (extended >= 4) return 'palm';
  if (extended === 0 && !thumbOut) return 'fist';
  return null;
}

/** Size of the hand in image units (used for the pinch zoom). */
export function handSize(lm: readonly Landmark[]): number {
  return lm.length === 21 ? dist(lm[WRIST], lm[MIDDLE_MCP]) : 0;
}
