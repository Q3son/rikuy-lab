/**
 * Modelos simples y deterministas que mueven las simulaciones.
 * Son didácticos: el agente debe explicar sus límites (ver Practice.limitations).
 */

/**
 * Actividad relativa de la lactasa (0..1) según temperatura y pH.
 * Óptimo cerca de 37 °C y pH 6.5; por encima de ~55 °C la enzima se
 * desnaturaliza de forma irreversible en el modelo.
 */
export function lactaseActivity(tempC: number, ph: number): number {
  const tOpt = 37;
  const phOpt = 6.5;
  const rise = Math.exp(-((tempC - tOpt) ** 2) / (2 * 14 ** 2));
  const denature = tempC > 50 ? Math.max(0, 1 - (tempC - 50) / 15) : 1;
  const phFactor = Math.exp(-((ph - phOpt) ** 2) / (2 * 1.3 ** 2));
  return clamp01(rise * denature * phFactor);
}

/** Grado de desnaturalización (0 = forma nativa, 1 = desplegada). */
export function lactaseUnfolding(tempC: number): number {
  return clamp01((tempC - 50) / 20);
}

/** Periodo del péndulo simple para oscilaciones pequeñas: T = 2π·√(L/g). */
export function pendulumPeriod(lengthM: number, gravity = 9.8): number {
  return 2 * Math.PI * Math.sqrt(lengthM / gravity);
}

/** Ángulo del péndulo en el tiempo t (rad), amplitud inicial theta0. */
export function pendulumAngle(t: number, lengthM: number, gravity = 9.8, theta0 = 0.35): number {
  return theta0 * Math.cos(Math.sqrt(gravity / lengthM) * t);
}

/**
 * Frecuencia respiratoria ilustrativa según altitud (respiraciones/min).
 * Aproxima la caída de presión parcial de O2 con la altura.
 */
export function breathingRate(altitudeM: number): number {
  const pressureRatio = Math.exp(-altitudeM / 8400);
  return Math.round(14 / Math.max(0.55, pressureRatio) ** 0.9);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
