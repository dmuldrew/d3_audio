import { scalePitch } from './scalePitch.js';
import { scaleFilter } from './scaleFilter.js';
import { scaleGain } from './scaleGain.js';

/**
 * scaleTension: Maps continuous anomaly, risk, volatility, or pressure metrics
 * to multi-dimensional musical tension, harmonic consonance/dissonance,
 * tempo warping, detuning, and acoustic energy.
 *
 * Inspired by the Tension/Release & Musical Energy principles in data sonification:
 * Tension = Windup of a spring, anticipatory pent-up energy (dissonance, rising pitch, detune)
 * Release = Return to harmonic equilibrium (consonance, stability)
 * Energy = Loudness x Speed
 */
export function scaleTension() {
  let domain = [0, 100];
  let rootNote = "C3";
  let mode = "pentatonic";
  let detuneRange = [0, 60]; // cents of microtonal tension
  let filterRange = [400, 8000]; // Hz
  let tempoRange = [1.0, 1.8]; // speed multiplier
  let gainRange = [0.4, 1.0];

  // Harmonic chord progressions from pure consonance -> moderate tension -> maximum dissonance
  const chordTiers = {
    consonant: ["C3", "G3", "C4", "E4"], // Root, 5th, Octave, Major 3rd
    moderate:  ["C3", "E3", "A3", "D4"], // Add 6th / 9th sus
    tense:     ["C3", "Eb3", "Ab3", "Bb3"], // Minor / Suspended dark
    dissonant: ["C3", "F#3", "Bb3", "Db4"] // Tritone, Diminished 7th, Minor 2nd
  };

  const pitchEngine = scalePitch().domain([0, 1]).range(["C3", "F#4"]).scale("blues");
  const filterEngine = scaleFilter().domain([0, 1]).range(filterRange);
  const gainEngine = scaleGain().domain([0, 1]).range(gainRange);

  function tension(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    return {
      normalized: norm,
      energy: norm,
      detuneCents: detuneRange[0] + norm * (detuneRange[1] - detuneRange[0]),
      filterCutoff: filterEngine(norm),
      cutoff: filterEngine(norm),
      gain: gainEngine(norm),
      tempoMultiplier: +(tempoRange[0] + norm * (tempoRange[1] - tempoRange[0])).toFixed(2),
      chord: tension.chord(val),
      isDissonant: norm > 0.65,
      tier: norm < 0.3 ? 'consonant' : (norm < 0.6 ? 'moderate' : (norm < 0.85 ? 'tense' : 'dissonant'))
    };
  }

  tension.chord = function(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    if (norm < 0.3) return chordTiers.consonant;
    if (norm < 0.6) return chordTiers.moderate;
    if (norm < 0.85) return chordTiers.tense;
    return chordTiers.dissonant;
  };

  tension.pitch = function(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    return pitchEngine(norm);
  };

  tension.filter = function(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    return filterEngine(norm);
  };

  tension.gain = function(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    return gainEngine(norm);
  };

  tension.detune = function(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    return detuneRange[0] + norm * (detuneRange[1] - detuneRange[0]);
  };

  tension.tempo = function(val) {
    const norm = Math.max(0, Math.min(1, (val - domain[0]) / (domain[1] - domain[0])));
    return +(tempoRange[0] + norm * (tempoRange[1] - tempoRange[0])).toFixed(2);
  };

  tension.domain = function(_) {
    if (!arguments.length) return domain;
    domain = [_[0], _[1]];
    return tension;
  };

  tension.root = function(_) {
    if (!arguments.length) return rootNote;
    rootNote = _;
    return tension;
  };

  tension.detuneRange = function(_) {
    if (!arguments.length) return detuneRange;
    detuneRange = [_[0], _[1]];
    return tension;
  };

  tension.filterRange = function(_) {
    if (!arguments.length) return filterRange;
    filterRange = [_[0], _[1]];
    filterEngine.range(filterRange);
    return tension;
  };

  tension.tempoRange = function(_) {
    if (!arguments.length) return tempoRange;
    tempoRange = [_[0], _[1]];
    return tension;
  };

  tension.gainRange = function(_) {
    if (!arguments.length) return gainRange;
    gainRange = [_[0], _[1]];
    gainEngine.range(gainRange);
    return tension;
  };

  tension.copy = function() {
    return scaleTension()
      .domain(domain)
      .root(rootNote)
      .detuneRange(detuneRange)
      .filterRange(filterRange)
      .tempoRange(tempoRange)
      .gainRange(gainRange);
  };

  return tension;
}
