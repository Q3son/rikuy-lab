/**
 * Turns a stream of hand poses into viewer actions (palm move = rotate, pinch = zoom,
 * fist = pause, thumbs up = release the pendulum). Discrete gestures must be held for a moment
 * and then cool down, so a passing hand does not fire them by accident.
 */
import type { ViewerAction } from '@rikuy/holo';
import { classifyHand, handSize, type HandPose, type Landmark } from './classifier.ts';

export interface InterpreterOptions {
  /** How long a fist or thumbs up must be held, ms. */
  holdMs?: number;
  /** Minimum time between two discrete gestures, ms. */
  cooldownMs?: number;
  /** Rotation gain: radians per image width. */
  rotateGain?: number;
  /** Movements below this (image units) are jitter. */
  deadZone?: number;
}

export class GestureInterpreter {
  pose: HandPose | null = null;
  private readonly opts: Required<InterpreterOptions>;
  private lastWrist: { x: number; y: number } | null = null;
  private lastSize = 0;
  private heldSince = 0;
  private heldPose: HandPose | null = null;
  private fired = false;
  private lastDiscrete = -Infinity;

  constructor(options: InterpreterOptions = {}) {
    this.opts = { holdMs: 300, cooldownMs: 1500, rotateGain: 6, deadZone: 0.004, ...options };
  }

  feed(landmarks: readonly Landmark[] | null, t: number): ViewerAction[] {
    const pose = landmarks ? classifyHand(landmarks) : null;
    this.pose = pose;
    const out: ViewerAction[] = [];

    if (pose === 'palm' && landmarks) {
      const w = landmarks[0];
      if (this.lastWrist) {
        const dx = w.x - this.lastWrist.x;
        const dy = w.y - this.lastWrist.y;
        if (Math.hypot(dx, dy) > this.opts.deadZone) {
          // Front camera: the image is mirrored for the user, so x is inverted.
          out.push({ type: 'rotate', dx: -dx * this.opts.rotateGain, dy: dy * this.opts.rotateGain * 0.66 });
        }
      }
      this.lastWrist = { x: w.x, y: w.y };
    } else {
      this.lastWrist = null;
    }

    if (pose === 'pinch' && landmarks) {
      const size = handSize(landmarks);
      if (this.lastSize > 0) {
        const factor = size / this.lastSize;
        if (Math.abs(factor - 1) > 0.01) out.push({ type: 'zoom', factor: Math.min(1.1, Math.max(0.9, factor)) });
      }
      this.lastSize = size;
    } else {
      this.lastSize = 0;
    }

    if (pose === 'fist' || pose === 'thumbs_up') {
      if (this.heldPose !== pose) {
        this.heldPose = pose;
        this.heldSince = t;
        this.fired = false;
      } else if (!this.fired && t - this.heldSince >= this.opts.holdMs && t - this.lastDiscrete >= this.opts.cooldownMs) {
        out.push(pose === 'fist' ? { type: 'pause' } : { type: 'release' });
        this.fired = true;
        this.lastDiscrete = t;
      }
    } else {
      this.heldPose = null;
      this.fired = false;
    }
    return out;
  }
}
