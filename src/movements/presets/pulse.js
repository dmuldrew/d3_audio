import { easings } from '../motionEnvelope.js';

/**
 * Pulse movement preset: Dynamic scale pop with punchy attack and smooth decay.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Scale boost multiplier (default: 1.0)
 * @param {number} options.maxScale Max scale multiplier (default: 1.35)
 * @returns {{ transform: string, scale: number }}
 */
export function pulse(t, {
  intensity = 1.0,
  maxScale = 1.35
} = {}) {
  let scaleFactor = 1.0;
  const boost = (maxScale - 1.0) * intensity;

  if (t < 0.2) {
    // Punchy rise
    const progress = t / 0.2;
    scaleFactor = 1.0 + boost * easings.easeOutQuad(progress);
  } else {
    // Smooth elastic or exponential decay back to 1.0
    const progress = (t - 0.2) / 0.8;
    scaleFactor = 1.0 + boost * (1 - easings.easeOutCubic(progress));
  }

  return {
    transform: `scale(${scaleFactor.toFixed(3)})`,
    scale: scaleFactor
  };
}
