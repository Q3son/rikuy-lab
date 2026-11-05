/**
 * @rikuy/senales = Rikuy Guardián, Level 1 (non-biometric learning events + voluntary check-in).
 * Level 2 (camera and voice) is NOT built here: only its closed gate exists (consentimiento.ts).
 */
export const packageName = '@rikuy/senales' as const;
export * from './vocabulario.ts';
export * from './consentimiento.ts';
export * from './checkin.ts';
export * from './guardian.ts';
export * from './pulso.ts';
