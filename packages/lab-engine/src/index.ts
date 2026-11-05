/**
 * @rikuy/lab-engine: practice state machine, physical models, measurement statistics, sensor port.
 * Owned by F3 (docs/ecosistema/ARQUITECTURA_ECOSISTEMA.md, 5.4). Pure: no React, Three.js or network.
 */
export const packageName = '@rikuy/lab-engine' as const;

export * from './accelerometer.ts';
export * from './models.ts';
export * from './ports.ts';
export * from './practice.ts';
export * from './statistics.ts';
export * from './stopwatch.ts';
