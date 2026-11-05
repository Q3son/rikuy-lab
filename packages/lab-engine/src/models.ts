/**
 * Physical models of the practices (2.2). Pure and deterministic; their limits are stated in
 * `Practica.limitaciones` (small oscillations, massless string, no friction).
 */

/** Standard gravity (m/s²). Lima and the highlands differ by less than 0.3 %. */
export const STANDARD_GRAVITY = 9.80665;

/** Period of a simple pendulum for small oscillations: T = 2π·√(L/g), in seconds. */
export function pendulumPeriod(lengthM: number, gravity = STANDARD_GRAVITY): number {
  if (!(lengthM > 0)) throw new RangeError(`length must be positive, got ${lengthM}`);
  if (!(gravity > 0)) throw new RangeError(`gravity must be positive, got ${gravity}`);
  return 2 * Math.PI * Math.sqrt(lengthM / gravity);
}
