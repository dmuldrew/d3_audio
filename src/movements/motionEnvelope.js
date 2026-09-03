/**
 * Motion envelopes and physics utilities for rhythmic movements.
 */

/**
 * Standard easing functions.
 */
export const easings = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t, s = 1.70158) => {
    t = t - 1;
    return t * t * ((s + 1) * t + s) + 1;
  },
  easeOutElastic: (t, p = 0.3) => {
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
};

/**
 * ADSR (Attack, Decay, Sustain, Release) Motion Envelope.
 * Computes an amplitude envelope value between 0.0 and 1.0 at relative time t in [0, 1].
 * 
 * @param {number} t Progress from 0.0 to 1.0
 * @param {object} params { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.7 }
 * @returns {number} Current envelope amplitude
 */
export function adsrEnvelope(t, { attack = 0.1, decay = 0.2, sustain = 0.4, release = 0.3 } = {}) {
  const total = attack + decay + release;
  const a = attack / total;
  const d = decay / total;
  const r = release / total;
  const s = sustain;

  if (t <= 0) return 0;
  if (t >= 1) return 0;

  if (t < a) {
    // Attack phase: 0 -> 1
    return easings.easeOutQuad(t / a);
  } else if (t < a + d) {
    // Decay phase: 1 -> sustain
    const progress = (t - a) / d;
    return 1 - (1 - s) * easings.easeInQuad(progress);
  } else {
    // Release phase: sustain -> 0
    const progress = (t - (a + d)) / r;
    return s * (1 - easings.easeOutQuad(progress));
  }
}

/**
 * Damped harmonic oscillation curve.
 * @param {number} t Normalized time [0, 1]
 * @param {number} frequency Number of cycles
 * @param {number} decay Damping rate
 * @returns {number} Value from -1 to 1
 */
export function dampedOscillation(t, frequency = 3, decay = 3) {
  if (t <= 0) return 0;
  if (t >= 1) return 0;
  return Math.exp(-decay * t) * Math.sin(2 * Math.PI * frequency * t);
}
