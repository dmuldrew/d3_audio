import { parseNote, midiToNote, midiToFrequency, frequencyToMidi } from '../musical/notes.js';
import { generateScaleNotes, quantizeToScale, SCALE_INTERVALS } from '../musical/scales.js';
import { equalLoudnessCompensation } from '../musical/equalLoudness.js';

/**
 * Creates a D3-like pitch scale that maps a continuous or discrete domain to musical pitches.
 * 
 * @example
 * const pitch = scalePitch()
 *   .domain([0, 100])
 *   .range(["C3", "C6"])
 *   .scale("pentatonic")
 *   .root("C");
 * 
 * pitch(50); // -> "G4"
 * pitch.frequency(50); // -> 392.00
 * pitch.midi(50); // -> 67
 */
export function scalePitch() {
  let domain = [0, 1];
  let rangeNotes = ["C3", "C6"];
  let scaleType = "pentatonic";
  let rootNote = "C";
  let isQuantized = true;
  let isClamped = true;
  let isCategorical = false;
  let isEqualLoudness = false;

  // Cached scale degrees
  let cachedScaleNotes = null;

  function updateCache() {
    if (Array.isArray(rangeNotes) && rangeNotes.length >= 2 && typeof rangeNotes[0] === 'string' && typeof rangeNotes[rangeNotes.length - 1] === 'string') {
      const minNote = rangeNotes[0];
      const maxNote = rangeNotes[rangeNotes.length - 1];
      cachedScaleNotes = generateScaleNotes(minNote, maxNote, scaleType, rootNote);
    } else {
      cachedScaleNotes = null;
    }
  }

  function interpolate(t) {
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    if (!cachedScaleNotes || cachedScaleNotes.length === 0) {
      updateCache();
    }

    if (cachedScaleNotes && cachedScaleNotes.length > 0) {
      if (isQuantized) {
        const index = Math.round(t * (cachedScaleNotes.length - 1));
        const clampedIndex = Math.max(0, Math.min(cachedScaleNotes.length - 1, index));
        return cachedScaleNotes[clampedIndex];
      } else {
        // Continuous microtonal MIDI interpolation
        const minMidi = cachedScaleNotes[0].midi;
        const maxMidi = cachedScaleNotes[cachedScaleNotes.length - 1].midi;
        const continuousMidi = minMidi + t * (maxMidi - minMidi);
        return midiToNote(continuousMidi);
      }
    }

    // Fallback between range notes
    const p1 = parseNote(rangeNotes[0]);
    const p2 = parseNote(rangeNotes[rangeNotes.length - 1]);
    const midi = p1.midi + t * (p2.midi - p1.midi);
    return midiToNote(midi);
  }

  function scale(x) {
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return null;
      const t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
      return interpolate(t).note;
    }

    const d0 = domain[0];
    const d1 = domain[domain.length - 1];
    let t = (x - d0) / (d1 - d0);
    return interpolate(t).note;
  }

  scale.frequency = function(x) {
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return 0;
      const t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
      return interpolate(t).frequency;
    }

    const d0 = domain[0];
    const d1 = domain[domain.length - 1];
    let t = (x - d0) / (d1 - d0);
    return interpolate(t).frequency;
  };

  scale.midi = function(x) {
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return 0;
      const t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
      return interpolate(t).midi;
    }

    const d0 = domain[0];
    const d1 = domain[domain.length - 1];
    let t = (x - d0) / (d1 - d0);
    return interpolate(t).midi;
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return rangeNotes.slice();
    rangeNotes = _;
    updateCache();
    return scale;
  };

  scale.scale = function(_) {
    if (!arguments.length) return scaleType;
    scaleType = _;
    updateCache();
    return scale;
  };

  scale.root = function(_) {
    if (!arguments.length) return rootNote;
    rootNote = _;
    updateCache();
    return scale;
  };

  scale.quantize = function(_) {
    if (!arguments.length) return isQuantized;
    isQuantized = !!_;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.equalLoudness = function(_) {
    if (!arguments.length) return isEqualLoudness;
    isEqualLoudness = !!_;
    return scale;
  };

  scale.gain = function(x) {
    if (!isEqualLoudness) return 1.0;
    const freq = scale.frequency(x);
    return equalLoudnessCompensation(freq);
  };

  scale.notes = function() {
    if (!cachedScaleNotes) updateCache();
    return (cachedScaleNotes || []).map(n => n.note);
  };

  scale.ticks = function(count = 5) {
    if (isCategorical) return domain.slice();
    const d0 = domain[0];
    const d1 = domain[domain.length - 1];
    const step = (d1 - d0) / (count - 1);
    const result = [];
    for (let i = 0; i < count; i++) {
      const val = d0 + i * step;
      result.push({
        value: val,
        note: scale(val),
        frequency: scale.frequency(val),
        gain: scale.gain(val)
      });
    }
    return result;
  };

  scale.copy = function() {
    return scalePitch()
      .domain(domain.slice())
      .range(rangeNotes.slice())
      .scale(scaleType)
      .root(rootNote)
      .quantize(isQuantized)
      .clamp(isClamped)
      .equalLoudness(isEqualLoudness);
  };

  updateCache();
  return scale;
}
