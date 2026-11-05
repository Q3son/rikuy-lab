/**
 * Oscillation stopwatch: start when the pendulum is released, tap once per full oscillation
 * ("va y vuelve"); it stops by itself on the last one. Time comes from the `Clock` port
 * (`performance.now()` on the web), never from `Date`, so it is monotonic.
 */
import type { Clock } from './ports.ts';

export class Stopwatch {
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private laps = 0;

  constructor(
    private readonly clock: Clock,
    readonly target = 10,
  ) {}

  get running(): boolean {
    return this.startedAt !== null && this.stoppedAt === null;
  }

  get count(): number {
    return this.laps;
  }

  get completed(): boolean {
    return this.laps >= this.target;
  }

  start(): void {
    this.startedAt = this.clock.now();
    this.stoppedAt = null;
    this.laps = 0;
  }

  countOscillation(): void {
    if (!this.running || this.completed) return;
    this.laps += 1;
    if (this.completed) this.stoppedAt = this.clock.now();
  }

  stop(): void {
    if (this.running) this.stoppedAt = this.clock.now();
  }

  reset(): void {
    this.startedAt = null;
    this.stoppedAt = null;
    this.laps = 0;
  }

  elapsedMs(): number {
    if (this.startedAt === null) return 0;
    return (this.stoppedAt ?? this.clock.now()) - this.startedAt;
  }

  /** Mean period in seconds, only once every oscillation was counted. */
  periodS(): number | null {
    return this.completed ? this.elapsedMs() / 1000 / this.target : null;
  }
}
