import { easings } from '../motionEnvelope.js';

/**
 * Squash and Stretch preset: Classic rhythmic impact animation.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Factor multiplier (default: 1.0)
 * @param {string} options.direction "vertical" | "horizontal"
 * @returns {{ transform: string, scaleX: number, scaleY: number }}
 */
export function squash(t, {
  intensity = 1.0,
  direction = "vertical"
} = {}) {
  let scaleMain = 1.0;
  let scaleCross = 1.0;

  if (t < 0.15) {
    // Initial squash on impact: wide & flat
    const p = easings.easeOutQuad(t / 0.15);
    scaleMain = 1.0 - 0.35 * intensity * p;
    scaleCross = 1.0 + 0.35 * intensity * p;
  } else if (t < 0.45) {
    // Elastic rebound: tall & thin
    const p = easings.easeInOutQuad((t - 0.15) / 0.3);
    scaleMain = 0.65 + (1.35 - 0.65) * p;
    scaleCross = 1.35 + (0.75 - 1.35) * p;
  } else {
    // Settle back to 1.0 with subtle damping
    const p = (t - 0.45) / 0.55;
    const damped = Math.exp(-3 * p) * Math.cos(p * Math.PI * 3);
    scaleMain = 1.0 + 0.25 * intensity * damped;
    scaleCross = 1.0 - 0.25 * intensity * damped;
  }

  let scaleX, scaleY;
  if (direction === "vertical") {
    scaleX = scaleCross;
    scaleY = scaleMain;
  } else {
    scaleX = scaleMain;
    scaleY = scaleCross;
  }

  return {
    transform: `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
    scaleX,
    scaleY
  };
}
