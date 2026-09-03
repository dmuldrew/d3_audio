import { easings } from '../motionEnvelope.js';

/**
 * Ripple movement preset: Expanding halo / shockwave ring emitting from element.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Scale multiplier (default: 1.0)
 * @param {number} options.maxRadius Max expansion scale (default: 2.5)
 * @returns {{ scale: number, opacity: number, strokeWidth: number, transform: string }}
 */
export function ripple(t, {
  intensity = 1.0,
  maxRadius = 2.2
} = {}) {
  const eased = easings.easeOutQuad(t);
  const scale = 1.0 + (maxRadius - 1.0) * eased * intensity;
  const opacity = (1.0 - t) * Math.min(1.0, intensity);
  const strokeWidth = Math.max(0.5, (1.0 - t) * 3 * intensity);

  return {
    scale,
    opacity,
    strokeWidth,
    transform: `scale(${scale.toFixed(3)})`
  };
}
