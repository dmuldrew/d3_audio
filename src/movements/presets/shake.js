/**
 * Shake movement preset: Fast jitter / tremor for loud transients and percussive hits.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Amplitude multiplier (default: 1.0)
 * @param {number} options.distance Max displacement in px (default: 8)
 * @param {number} options.frequency Number of shakes (default: 6)
 * @param {string} options.axis "x" | "y" | "random"
 * @returns {{ transform: string, translateX: number, translateY: number }}
 */
export function shake(t, {
  intensity = 1.0,
  distance = 8,
  frequency = 6,
  axis = "x"
} = {}) {
  const decay = 1 - t; // Linear decay
  const wave = Math.sin(t * Math.PI * 2 * frequency) * decay * intensity * distance;

  let transX = 0;
  let transY = 0;

  if (axis === "x") {
    transX = wave;
  } else if (axis === "y") {
    transY = wave;
  } else {
    // 2D jitter
    transX = wave * Math.cos(t * 13.7);
    transY = wave * Math.sin(t * 17.3);
  }

  return {
    transform: `translate(${transX.toFixed(2)}px, ${transY.toFixed(2)}px)`,
    translateX: transX,
    translateY: transY
  };
}
