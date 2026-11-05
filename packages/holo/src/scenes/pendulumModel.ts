/**
 * Simulated pendulum of the hologram: integrates θ'' = -(g/L)·sin θ - 2β·θ' (no small-angle
 * shortcut), so the period it measures is the real one of the swing. The length morphs smoothly
 * toward the chosen value and the period is measured from the swing itself (zero crossings), not
 * computed from the formula: the class can compare both. Pure: no Three.js, no allocations per step.
 */

export const MIN_LENGTH = 0.1;
export const MAX_LENGTH = 2.5;
/** Damping rate β (1/s): with air friction the swing visibly fades in ~20 s. */
const DAMPING = 0.08;
/** Length morph rate (1/s): ~1 s to reach the new length. */
const MORPH_RATE = 4;
const MAX_SUBSTEP = 1 / 240;

export interface PendulumModelOptions {
  length?: number;
  gravity?: number;
  /** Starting angle when released, rad. */
  theta0?: number;
}

export class PendulumModel {
  theta: number;
  omega = 0;
  length: number;
  targetLength: number;
  gravity: number;
  damping = false;
  /** Last period measured from two upward zero crossings, s; null until measured. */
  measuredPeriod: number | null = null;

  private readonly theta0: number;
  private time = 0;
  private lastCrossing: number | null = null;

  constructor(options: PendulumModelOptions = {}) {
    this.length = clampLength(options.length ?? 0.5);
    this.targetLength = this.length;
    this.gravity = options.gravity ?? 9.8;
    this.theta0 = options.theta0 ?? 0.35;
    this.theta = this.theta0;
  }

  /** Angular amplitude of the current swing (from its energy), rad. */
  get amplitude(): number {
    const c = Math.cos(this.theta) - (this.length * this.omega * this.omega) / (2 * this.gravity);
    return Math.acos(Math.max(-1, Math.min(1, c)));
  }

  setTargetLength(value: number): void {
    const next = clampLength(value);
    if (next === this.targetLength) return;
    this.targetLength = next;
    this.measuredPeriod = null;
    this.lastCrossing = null;
  }

  /** Lift the bob to the starting angle and let it go from rest. */
  release(): void {
    this.theta = this.theta0;
    this.omega = 0;
    this.lastCrossing = null;
  }

  step(dt: number): void {
    if (!(dt > 0)) return;
    const n = Math.ceil(dt / MAX_SUBSTEP);
    const h = dt / n;
    for (let i = 0; i < n; i++) this.substep(h);
  }

  private substep(h: number): void {
    // Length morph (exponential approach, snapped at the end so it settles exactly).
    const gap = this.targetLength - this.length;
    this.length = Math.abs(gap) < 1e-4 ? this.targetLength : this.length + gap * (1 - Math.exp(-MORPH_RATE * h));
    const morphing = this.length !== this.targetLength;

    // RK4 on (θ, ω).
    const k = this.gravity / this.length;
    const b = this.damping ? 2 * DAMPING : 0;
    const acc = (th: number, om: number) => -k * Math.sin(th) - b * om;
    const th = this.theta;
    const om = this.omega;
    const a1 = acc(th, om);
    const a2 = acc(th + (h / 2) * om, om + (h / 2) * a1);
    const a3 = acc(th + (h / 2) * (om + (h / 2) * a1), om + (h / 2) * a2);
    const a4 = acc(th + h * (om + (h / 2) * a2), om + h * a3);
    const nextTheta = th + (h / 6) * (om + 2 * (om + (h / 2) * a1) + 2 * (om + (h / 2) * a2) + (om + h * a3));
    const nextOmega = om + (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);

    // Upward zero crossing, interpolated inside the substep.
    if (th < 0 && nextTheta >= 0) {
      const t = this.time + h * (-th / (nextTheta - th));
      if (morphing) this.lastCrossing = null;
      else {
        if (this.lastCrossing !== null) this.measuredPeriod = t - this.lastCrossing;
        this.lastCrossing = t;
      }
    }
    this.theta = nextTheta;
    this.omega = nextOmega;
    this.time += h;
  }
}

function clampLength(v: number): number {
  if (!Number.isFinite(v)) return MIN_LENGTH;
  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, v));
}
