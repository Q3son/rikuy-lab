/**
 * Ports of the lab engine (2.2). Adapters live in apps/web: `performance.now()` for the clock,
 * DeviceMotion for acceleration, the event log for the records.
 */

/** Monotonic clock in milliseconds (the web adapter is `performance.now()`). */
export interface Clock {
  now(): number;
}

/** One acceleration reading in m/s², timestamped with the same monotonic clock. */
export interface AccelReading {
  t: number;
  x: number;
  y: number;
  z: number;
}

/** Acceleration sensor (DeviceMotion on the web). Returns the unsubscribe function. */
export interface AccelerationSensor {
  readonly available: boolean;
  subscribe(onReading: (r: AccelReading) => void): () => void;
}

/** Produces a new ULID for every record. */
export type IdGenerator = () => string;
