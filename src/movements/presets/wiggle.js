import { dampedOscillation } from '../motionEnvelope.js';

/**
 * Wiggle movement preset: Rotational or translation wobble with decay.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Amplitude multiplier (default: 1.0)
 * @param {number} options.angle Max rotation angle in degrees (default: 15)
 * @param {number} options.frequency Number of wiggle cycles (default: 3)
 * @param {number} options.decay Damping factor (default: 3.5)
 * @param {string} options.mode "rotate" | "translate" | "both"
 * @returns {{ transform: string, rotation: number, translateX: number, translateY: number }}
 */
export function wiggle(t, {
  intensity = 1.0,
  angle = 15,
  frequency = 3.5,
  decay = 3.5,
  mode = "rotate"
} = {}) {
  const osc = dampedOscillation(t, frequency, decay) * intensity;
  const rot = mode !== "translate" ? osc * angle : 0;
  const transX = mode !== "rotate" ? osc * 8 : 0;
  const transY = mode === "both" ? Math.abs(osc) * -4 : 0;

  let transform = '';
  if (transX !== 0 || transY !== 0) transform += `translate(${transX.toFixed(2)}px, ${transY.toFixed(2)}px) `;
  if (rot !== 0) transform += `rotate(${rot.toFixed(2)}deg)`;

  return {
    transform: transform.trim() || 'none',
    rotation: rot,
    translateX: transX,
    translateY: transY,
    scale: 1.0
  };
}
