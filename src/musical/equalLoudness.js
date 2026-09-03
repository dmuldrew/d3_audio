import { parseNote } from './notes.js';

/**
 * ISO 226 / Fletcher-Munson Equal-Loudness Contours & A-weighting approximation.
 * 
 * Humans do not perceive acoustic loudness linearly across the frequency spectrum.
 * Mid-treble frequencies (2 kHz to 4 kHz) sound significantly louder than sub-bass (40 Hz - 150 Hz)
 * or high air frequencies (> 10 kHz) at identical physical sound pressure levels.
 * 
 * Equal-loudness normalization calculates the inverse compensation factor required to ensure
 * that notes across all octave registers are perceived as having uniform phon/sone loudness.
 */

/**
 * Resolves a note name (e.g. "C2", "A4", "F#5") or numeric Hz to a valid frequency in Hertz.
 * @param {string|number} noteOrFreq
 * @returns {number} Frequency in Hertz
 */
export function frequencyFromNoteOrHz(noteOrFreq) {
  if (typeof noteOrFreq === 'number') {
    return noteOrFreq;
  }
  if (typeof noteOrFreq === 'string') {
    try {
      const parsed = parseNote(noteOrFreq);
      return parsed.frequency;
    } catch {
      return 1000; // Fallback to 1 kHz reference
    }
  }
  return 1000;
}

/**
 * Calculates the relative sensitivity weight in decibels (dB) according to the
 * standardized equal-loudness contour (A-weighting approximation of ISO 226).
 * Reference: 1000 Hz = 0.0 dB.
 * 
 * @param {number} freq - Frequency in Hertz
 * @returns {number} Relative sensitivity in dB
 */
export function iso226Weight(freq) {
  if (typeof freq !== 'number' || isNaN(freq) || freq <= 0) return 0;
  const f = Math.max(10, Math.min(24000, freq));
  const f2 = f * f;
  const num = 12194 * 12194 * f2 * f2;
  const den = (f2 + 20.6 * 20.6) *
              Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) *
              (f2 + 12194 * 12194);
  const ra = num / den;
  return 20 * Math.log10(ra) + 2.0;
}

/**
 * Calculates the inverse gain multiplier required to achieve equal perceived loudness.
 * At 1000 Hz, the multiplier is approximately 1.0.
 * At lower frequencies (sub-bass), the multiplier is > 1.0 to boost inaudible bass.
 * At 2 kHz - 4 kHz, the multiplier is < 1.0 to attenuate piercing ear-canal resonance.
 * 
 * The multiplier is safely clamped to [-6 dB, +14 dB] (gain factor ~0.5 to ~5.0)
 * to prevent digital clipping in Web Audio output.
 * 
 * @param {string|number} noteOrFreq - Frequency in Hz or note string
 * @returns {number} Linear gain multiplier
 */
export function equalLoudnessCompensation(noteOrFreq) {
  const freq = frequencyFromNoteOrHz(noteOrFreq);
  const relativeDb = iso226Weight(freq);
  // Invert sensitivity: less sensitive frequencies get positive dB boost, more sensitive get attenuation
  const compDb = -relativeDb;
  // Safe clamping to prevent clipping in Web Audio
  const clampedDb = Math.max(-6, Math.min(14, compDb));
  return +(Math.pow(10, clampedDb / 20).toFixed(4));
}
