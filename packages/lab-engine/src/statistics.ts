/** Measurement statistics (2.2). */

export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Sample standard deviation (n − 1). A single value has no spread. */
export function sampleStdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

/** |measured − model| / model, as a fraction (0.03 = 3 %). */
export function relativeError(measured: number, model: number): number {
  if (model === 0) throw new RangeError('the model value cannot be zero');
  return Math.abs(measured - model) / Math.abs(model);
}
