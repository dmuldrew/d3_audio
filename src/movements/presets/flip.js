import { easings } from '../motionEnvelope.js';

/**
 * Flip movement preset: 3D perspective flip or 2D mirror flip.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Amplitude multiplier (default: 1.0)
 * @param {string} options.axis "y" | "x" | "both" | "scaleX" | "scaleY"
 * @param {number} options.degrees Total flip angle (default: 360 or 180)
 * @returns {{ transform: string, rotateX: number, rotateY: number, scaleX: number, scaleY: number }}
 */
export function flip(t, {
  intensity = 1.0,
  axis = "y",
  degrees = 360
} = {}) {
  // Use elastic or smooth in-out easing
  const eased = easings.easeInOutCubic(t);
  const totalDeg = degrees * intensity;
  const currentDeg = eased * totalDeg;

  let rotateX = 0;
  let rotateY = 0;
  let scaleX = 1;
  let scaleY = 1;

  if (axis === "y") {
    rotateY = currentDeg;
    // Scale compression for 2D/SVG fallback
    scaleX = Math.cos((currentDeg * Math.PI) / 180);
  } else if (axis === "x") {
    rotateX = currentDeg;
    scaleY = Math.cos((currentDeg * Math.PI) / 180);
  } else if (axis === "scaleX") {
    // 2D SVG safe flip
    scaleX = Math.cos(eased * Math.PI * 2 * intensity);
  } else if (axis === "scaleY") {
    scaleY = Math.cos(eased * Math.PI * 2 * intensity);
  } else {
    rotateX = currentDeg * 0.7;
    rotateY = currentDeg;
  }

  // Lift element slightly towards camera during flip
  const lift = Math.sin(t * Math.PI) * 20 * intensity;
  let transform = `perspective(600px) translateZ(${lift.toFixed(1)}px) `;
  if (rotateX !== 0) transform += `rotateX(${rotateX.toFixed(2)}deg) `;
  if (rotateY !== 0) transform += `rotateY(${rotateY.toFixed(2)}deg) `;

  return {
    transform: transform.trim(),
    rotateX,
    rotateY,
    scaleX,
    scaleY,
    lift
  };
}
