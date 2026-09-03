import { easings } from '../motionEnvelope.js';

/**
 * Bounce movement preset: Spring rebound with gravity damping.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Height multiplier (default: 1.0)
 * @param {number} options.height Max bounce height in px (default: 25)
 * @param {string} options.direction "up" | "down" | "left" | "right"
 * @returns {{ transform: string, translateX: number, translateY: number }}
 */
export function bounce(t, {
  intensity = 1.0,
  height = 25,
  direction = "up"
} = {}) {
  // Parabolic bounce envelope
  const bounceFactor = (1 - easings.easeOutBounce(t)) * intensity;
  const maxH = height * intensity;

  let transX = 0;
  let transY = 0;

  switch (direction) {
    case "up":
      transY = -bounceFactor * maxH;
      break;
    case "down":
      transY = bounceFactor * maxH;
      break;
    case "left":
      transX = -bounceFactor * maxH;
      break;
    case "right":
      transX = bounceFactor * maxH;
      break;
  }

  return {
    transform: `translate(${transX.toFixed(2)}px, ${transY.toFixed(2)}px)`,
    translateX: transX,
    translateY: transY
  };
}
