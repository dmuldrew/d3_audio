import { easings } from '../motionEnvelope.js';

/**
 * Glow movement preset: Dynamic brightness burst and drop-shadow bloom.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Glow multiplier (default: 1.0)
 * @param {string} options.color Glow color (default: "#38bdf8")
 * @returns {{ filter: string, opacity: number, brightness: number }}
 */
export function glow(t, {
  intensity = 1.0,
  color = "#38bdf8"
} = {}) {
  let envelope;
  if (t < 0.15) {
    envelope = easings.easeOutQuad(t / 0.15);
  } else {
    envelope = 1.0 - easings.easeOutCubic((t - 0.15) / 0.85);
  }

  const blur = (envelope * 16 * intensity).toFixed(1);
  const brightness = (1.0 + envelope * 0.6 * intensity).toFixed(2);

  return {
    filter: `drop-shadow(0 0 ${blur}px ${color}) brightness(${brightness})`,
    envelope,
    brightness: +brightness
  };
}
