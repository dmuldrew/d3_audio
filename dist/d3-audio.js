
/**
 * d3-audio v1.0.0
 * D3 module for audio-visual data sonification and rhythmic choreography mapped to Tone.js timelines
 * (c) 2026 MIT License
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.d3Audio = global.d3Audio || {}, global.d3));
})(this, (function (exports, d3) {
  'use strict';

// --- src/musical/notes.js ---
/**
 * Musical note utilities: pitch, frequency, MIDI and interval math.
 */

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_OFFSETS = {
  'C': 0, 'B#': 0,
  'C#': 1, 'DB': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'EB': 3, 'Eb': 3,
  'E': 4, 'FB': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'AB': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'BB': 10, 'Bb': 10,
  'B': 11, 'CB': 11, 'Cb': 11
};

/**
 * Parses note string (e.g. "C4", "F#3", "Bb5", "A-1") into pitch components.
 * @param {string|number} note 
 * @returns {{ name: string, octave: number, midi: number, frequency: number }}
 */
function parseNote(note) {
  if (typeof note === 'number') {
    return midiToNote(note);
  }
  if (typeof note !== 'string') {
    throw new Error(`Invalid note input: ${note}`);
  }

  const match = note.trim().match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Cannot parse note string: "${note}". Expected format like "C4", "F#3", "Bb5".`);
  }

  const [, rawName, rawOctave] = match;
  const name = rawName.charAt(0).toUpperCase() + (rawName.charAt(1) || '');
  const octave = parseInt(rawOctave, 10);
  const semitoneOffset = NOTE_OFFSETS[name];

  if (semitoneOffset === undefined) {
    throw new Error(`Unknown note name: "${name}"`);
  }

  const midi = (octave + 1) * 12 + semitoneOffset;
  const frequency = midiToFrequency(midi);

  return { name, octave, midi, frequency, note: `${name}${octave}` };
}

/**
 * Converts MIDI note number to frequency in Hertz (A4 = 440 Hz, MIDI 69).
 * @param {number} midi 
 * @returns {number} frequency in Hz
 */
function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts frequency in Hertz to MIDI note number (can be fractional).
 * @param {number} freq 
 * @returns {number}
 */
function frequencyToMidi(freq) {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Converts MIDI note number to Note object and scientific pitch string (e.g. 60 -> "C4").
 * @param {number} midi 
 * @param {boolean} preferSharps 
 * @returns {{ name: string, octave: number, midi: number, frequency: number, note: string }}
 */
function midiToNote(midi, preferSharps = true) {
  const roundedMidi = Math.round(midi);
  const semitone = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const nameTable = preferSharps ? NOTE_NAMES_SHARP : NOTE_NAMES_FLAT;
  const name = nameTable[semitone];
  const note = `${name}${octave}`;
  const frequency = midiToFrequency(midi);

  return { name, octave, midi, frequency, note };
}

/**
 * Converts frequency in Hz to closest scientific pitch notation string.
 * @param {number} freq 
 * @returns {string} e.g. "A4", "C#5"
 */
function frequencyToNote(freq, preferSharps = true) {
  const midi = frequencyToMidi(freq);
  return midiToNote(midi, preferSharps).note;
}

/**
 * Transposes a note string or MIDI number by semitones.
 * @param {string|number} note 
 * @param {number} semitones 
 * @returns {string}
 */
function transpose(note, semitones) {
  const parsed = typeof note === 'number' ? midiToNote(note) : parseNote(note);
  const targetMidi = parsed.midi + semitones;
  return midiToNote(targetMidi, !parsed.name.includes('b')).note;
}

/**
 * Calculates cents offset between two frequencies.
 * @param {number} f1 
 * @param {number} f2 
 * @returns {number} cents difference
 */
function frequencyToCents(f1, f2) {
  return 1200 * Math.log2(f2 / f1);
}


// --- src/musical/scales.js ---

/**
 * Semitone intervals for musical scales and modes.
 */
const SCALE_INTERVALS = {
  // Western diatonic & modes
  major: [0, 2, 4, 5, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],

  // Pentatonic & Blues
  pentatonic: [0, 2, 4, 7, 9],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  majorBlues: [0, 2, 3, 4, 7, 9],

  // Symmetrical & Synthetic
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  augmented: [0, 3, 4, 7, 8, 11],

  // World / Cultural Scales
  insen: [0, 1, 5, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  iwato: [0, 1, 5, 6, 10],
  bhairav: [0, 1, 4, 5, 7, 8, 11],
  arabic: [0, 1, 4, 5, 7, 8, 11],
  doubleHarmonic: [0, 1, 4, 5, 7, 8, 11],
  hungarianMinor: [0, 2, 3, 6, 7, 8, 11],
  egyptian: [0, 2, 5, 7, 10],

  // Chords / Arpeggio subsets
  triadMajor: [0, 4, 7],
  triadMinor: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7]
};

/**
 * Generates an array of all notes in a scale between minNote and maxNote.
 * @param {string|number} minNote e.g. "C3" or MIDI 48
 * @param {string|number} maxNote e.g. "C6" or MIDI 84
 * @param {string|number[]} scaleType Name of scale from SCALE_INTERVALS or custom interval array
 * @param {string} rootNote Root note name, e.g. "C", "F#", "Bb"
 * @returns {Array<{ note: string, midi: number, frequency: number }>}
 */
function generateScaleNotes(minNote = "C3", maxNote = "C6", scaleType = "pentatonic", rootNote = "C") {
  const minParsed = typeof minNote === 'number' ? midiToNote(minNote) : parseNote(minNote);
  const maxParsed = typeof maxNote === 'number' ? midiToNote(maxNote) : parseNote(maxNote);

  const startMidi = Math.min(minParsed.midi, maxParsed.midi);
  const endMidi = Math.max(minParsed.midi, maxParsed.midi);

  const rootParsed = parseNote(`${rootNote}0`);
  const rootSemitone = rootParsed.midi % 12;

  let intervals;
  if (Array.isArray(scaleType)) {
    intervals = scaleType;
  } else if (SCALE_INTERVALS[scaleType]) {
    intervals = SCALE_INTERVALS[scaleType];
  } else {
    intervals = SCALE_INTERVALS.pentatonic;
  }

  const startOctave = Math.floor(startMidi / 12) - 1;
  const endOctave = Math.floor(endMidi / 12) - 1 + 1; // inclusive upper bound

  const result = [];
  const preferSharps = !rootNote.includes('b');

  for (let oct = startOctave; oct <= endOctave; oct++) {
    for (const interval of intervals) {
      const midi = (oct + 1) * 12 + rootSemitone + interval;
      if (midi >= startMidi && midi <= endMidi) {
        result.push(midiToNote(midi, preferSharps));
      }
    }
  }

  // Sort ascending by MIDI
  result.sort((a, b) => a.midi - b.midi);
  return result;
}

/**
 * Quantizes an arbitrary continuous MIDI or pitch value to the closest note in a given note set.
 * @param {number} midiValue 
 * @param {Array<{ midi: number, note: string }>} scaleNotes 
 * @returns {{ note: string, midi: number, frequency: number }}
 */
function quantizeToScale(midiValue, scaleNotes) {
  if (!scaleNotes || scaleNotes.length === 0) {
    return midiToNote(midiValue);
  }

  let closest = scaleNotes[0];
  let minDiff = Math.abs(midiValue - closest.midi);

  for (let i = 1; i < scaleNotes.length; i++) {
    const diff = Math.abs(midiValue - scaleNotes[i].midi);
    if (diff < minDiff) {
      minDiff = diff;
      closest = scaleNotes[i];
    }
  }

  return closest;
}


// --- src/scales/scalePitch.js ---

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
function scalePitch() {
  let domain = [0, 1];
  let rangeNotes = ["C3", "C6"];
  let scaleType = "pentatonic";
  let rootNote = "C";
  let isQuantized = true;
  let isClamped = true;
  let isCategorical = false;

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
      result.push({ value: val, note: scale(val), frequency: scale.frequency(val) });
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
      .clamp(isClamped);
  };

  updateCache();
  return scale;
}


// --- src/scales/scaleGain.js ---
/**
 * Creates a D3-like gain/volume scale that maps data to audio amplitude [0, 1] or decibels [-60, 0].
 */
function scaleGain() {
  let domain = [0, 1];
  let range = [0, 1];
  let curveType = "linear"; // "linear", "exponential", "logarithmic", "perceptual"
  let exponentValue = 2;
  let isClamped = true;
  let isCategorical = false;

  function curveTransform(t) {
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    switch (curveType) {
      case "exponential":
        return Math.pow(t, exponentValue);
      case "logarithmic":
        return Math.log10(1 + 9 * t); // maps 0->0, 1->1
      case "perceptual":
        // Fletcher-Munson / Stevens power law approximation for perceived loudness
        return Math.pow(t, 0.6);
      case "linear":
      default:
        return t;
    }
  }

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return range[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    const curvedT = curveTransform(t);
    const r0 = range[0];
    const r1 = range[range.length - 1];
    return r0 + curvedT * (r1 - r0);
  }

  scale.db = function(x) {
    const gain = scale(x);
    if (gain <= 0.0001) return -60;
    return 20 * Math.log10(gain);
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return range.slice();
    range = _;
    return scale;
  };

  scale.curve = function(_) {
    if (!arguments.length) return curveType;
    curveType = _;
    return scale;
  };

  scale.exponent = function(_) {
    if (!arguments.length) return exponentValue;
    exponentValue = +_;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleGain()
      .domain(domain.slice())
      .range(range.slice())
      .curve(curveType)
      .exponent(exponentValue)
      .clamp(isClamped);
  };

  return scale;
}


// --- src/scales/scaleDuration.js ---
/**
 * Musical rhythmic subdivisions and duration conversions.
 */
const SUBDIVISIONS = [
  { name: '32n', beats: 0.125 },
  { name: '16n', beats: 0.25 },
  { name: '16t', beats: 0.166667 },
  { name: '8n',  beats: 0.5 },
  { name: '8t',  beats: 0.333333 },
  { name: '8n.', beats: 0.75 },
  { name: '4n',  beats: 1.0 },
  { name: '4t',  beats: 0.666667 },
  { name: '4n.', beats: 1.5 },
  { name: '2n',  beats: 2.0 },
  { name: '2n.', beats: 3.0 },
  { name: '1m',  beats: 4.0 },
  { name: '2m',  beats: 8.0 }
];

/**
 * Creates a D3-like duration/rhythm scale that maps continuous data to note durations or seconds.
 */
function scaleDuration() {
  let domain = [0, 1];
  let rangeNotation = ["16n", "1m"];
  let isQuantized = true;
  let isClamped = true;
  let bpm = 120;
  let isCategorical = false;

  function notationToBeats(not) {
    if (typeof not === 'number') return not;
    const found = SUBDIVISIONS.find(s => s.name === not);
    if (found) return found.beats;
    if (not.endsWith('n')) {
      const num = parseInt(not, 10);
      return 4 / num;
    }
    if (not.endsWith('m')) {
      const num = parseInt(not, 10);
      return 4 * num;
    }
    return 1.0;
  }

  function beatsToNotation(beats) {
    let closest = SUBDIVISIONS[0];
    let minDiff = Math.abs(beats - closest.beats);

    for (let i = 1; i < SUBDIVISIONS.length; i++) {
      const diff = Math.abs(beats - SUBDIVISIONS[i].beats);
      if (diff < minDiff) {
        minDiff = diff;
        closest = SUBDIVISIONS[i];
      }
    }
    return closest.name;
  }

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return rangeNotation[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    const b0 = notationToBeats(rangeNotation[0]);
    const b1 = notationToBeats(rangeNotation[rangeNotation.length - 1]);
    const beats = b0 + t * (b1 - b0);

    if (isQuantized) {
      return beatsToNotation(beats);
    } else {
      // In seconds
      const secondsPerBeat = 60 / bpm;
      return beats * secondsPerBeat;
    }
  }

  scale.seconds = function(x) {
    const val = scale(x);
    if (typeof val === 'number') return val;
    const beats = notationToBeats(val);
    return beats * (60 / bpm);
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return rangeNotation.slice();
    rangeNotation = _;
    return scale;
  };

  scale.quantize = function(_) {
    if (!arguments.length) return isQuantized;
    isQuantized = !!_;
    return scale;
  };

  scale.bpm = function(_) {
    if (!arguments.length) return bpm;
    bpm = +_;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleDuration()
      .domain(domain.slice())
      .range(rangeNotation.slice())
      .quantize(isQuantized)
      .bpm(bpm)
      .clamp(isClamped);
  };

  return scale;
}


// --- src/scales/scalePan.js ---
/**
 * Creates a D3-like spatial / stereo panning scale that maps data to stereo pan values [-1.0 (L), +1.0 (R)].
 */
function scalePan() {
  let domain = [0, 1];
  let range = [-1, 1]; // -1 = Left, 0 = Center, +1 = Right
  let isClamped = true;
  let isCategorical = false;

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return 0;
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    const r0 = range[0];
    const r1 = range[range.length - 1];
    return r0 + t * (r1 - r0);
  }

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return range.slice();
    range = _;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scalePan()
      .domain(domain.slice())
      .range(range.slice())
      .clamp(isClamped);
  };

  return scale;
}


// --- src/scales/scaleFilter.js ---
/**
 * Creates a D3-like audio filter scale that maps data to cutoff frequencies (Hz), Q resonance, and synth timbre parameters.
 */
function scaleFilter() {
  let domain = [0, 1];
  let frequencyRange = [200, 12000]; // Hz
  let qRange = [1, 10];
  let scaleType = "logarithmic"; // "logarithmic", "exponential", "linear"
  let isClamped = true;
  let isCategorical = false;

  function transformT(t) {
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }
    switch (scaleType) {
      case "exponential":
        return Math.pow(t, 2);
      case "logarithmic":
        return (Math.pow(10, t) - 1) / 9;
      case "linear":
      default:
        return t;
    }
  }

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return frequencyRange[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    if (scaleType === "logarithmic") {
      if (isClamped) t = Math.max(0, Math.min(1, t));
      const minLog = Math.log10(Math.max(20, frequencyRange[0]));
      const maxLog = Math.log10(Math.max(20, frequencyRange[frequencyRange.length - 1]));
      return Math.pow(10, minLog + t * (maxLog - minLog));
    } else {
      const curvedT = transformT(t);
      const f0 = frequencyRange[0];
      const f1 = frequencyRange[frequencyRange.length - 1];
      return f0 + curvedT * (f1 - f0);
    }
  }

  scale.q = function(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return qRange[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }
    if (isClamped) t = Math.max(0, Math.min(1, t));
    return qRange[0] + t * (qRange[qRange.length - 1] - qRange[0]);
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return frequencyRange.slice();
    frequencyRange = _;
    return scale;
  };

  scale.qRange = function(_) {
    if (!arguments.length) return qRange.slice();
    qRange = _;
    return scale;
  };

  scale.type = function(_) {
    if (!arguments.length) return scaleType;
    scaleType = _;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleFilter()
      .domain(domain.slice())
      .range(frequencyRange.slice())
      .qRange(qRange.slice())
      .type(scaleType)
      .clamp(isClamped);
  };

  return scale;
}


// --- src/scales/scaleSample.js ---
/**
 * Creates a D3-like sample scale that maps categorical or discrete data to sample sound identifiers or audio URLs.
 */
function scaleSample() {
  let domain = [];
  let range = ["kick", "snare", "hihat", "clap"];
  let unknownFallback = undefined;

  function scale(x) {
    if (domain.length === 0) {
      if (typeof x === 'number') {
        const idx = Math.floor(x) % range.length;
        return range[((idx % range.length) + range.length) % range.length];
      }
      return range[0];
    }

    const idx = domain.indexOf(x);
    if (idx !== -1) {
      return range[idx % range.length];
    }

    // If continuous number and domain is numeric range
    if (typeof x === 'number' && domain.length >= 2 && typeof domain[0] === 'number') {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      const t = Math.max(0, Math.min(1, (x - d0) / (d1 - d0)));
      const index = Math.min(range.length - 1, Math.floor(t * range.length));
      return range[index];
    }

    return unknownFallback !== undefined ? unknownFallback : range[0];
  }

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return range.slice();
    range = _;
    return scale;
  };

  scale.unknown = function(_) {
    if (!arguments.length) return unknownFallback;
    unknownFallback = _;
    return scale;
  };

  scale.copy = function() {
    return scaleSample()
      .domain(domain.slice())
      .range(range.slice())
      .unknown(unknownFallback);
  };

  return scale;
}


// --- src/scales/scaleTempo.js ---
/**
 * Creates a D3-like tempo scale that maps continuous data to playback tempo in BPM.
 */
function scaleTempo() {
  let domain = [0, 1];
  let range = [60, 180]; // BPM
  let isClamped = true;

  function scale(x) {
    const d0 = domain[0];
    const d1 = domain[domain.length - 1];
    let t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    if (isClamped) t = Math.max(0, Math.min(1, t));
    const r0 = range[0];
    const r1 = range[range.length - 1];
    return Math.round(r0 + t * (r1 - r0));
  }

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return range.slice();
    range = _;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleTempo()
      .domain(domain.slice())
      .range(range.slice())
      .clamp(isClamped);
  };

  return scale;
}


// --- src/scales/scaleTension.js ---

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
function scaleTension() {
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


// --- src/ui/audioLegend.js ---

/**
 * audioLegend: Interactive D3 Visual-Auditory Legend Widget.
 *
 * Implements the core principle from "Transforming Data Into Music":
 * "Data + Known Mapping = Meaning. Communicate your data mapping to the user
 *  just like you would label a graph!"
 */
function audioLegend() {
  const items = [];
  let title = "Audio-Visual Data Mapping Key";
  let synth = null;
  let samplePlayer = null;

  function ensureAudio() {
    if (!synth) synth = createSynth({ type: "polySynth", volume: -4 });
    if (!samplePlayer) samplePlayer = createSamplePlayer();
  }

  function legend(selection) {
    selection.each(function() {
      const container = this;
      container.innerHTML = '';
      container.classList.add('d3-audio-legend');

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 10px;
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f8fafc;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        padding-bottom: 0.6rem;
        margin-bottom: 0.8rem;
      `;
      header.innerHTML = `
        <div style="font-weight: 700; font-size: 0.95rem; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem;">
          <span>🎧</span>
          <span>${title}</span>
        </div>
        <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Click 🔊 to Audition</span>
      `;
      wrapper.appendChild(header);

      // List of mappings
      const list = document.createElement('div');
      list.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.75rem;
      `;

      items.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = `
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 0.65rem 0.8rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: border-color 0.2s, background 0.2s;
        `;
        card.onmouseenter = () => {
          card.style.borderColor = "rgba(56,189,248,0.5)";
          card.style.background = "rgba(56,189,248,0.05)";
        };
        card.onmouseleave = () => {
          card.style.borderColor = "rgba(255,255,255,0.06)";
          card.style.background = "rgba(255,255,255,0.03)";
        };

        const textPart = document.createElement('div');
        textPart.innerHTML = `
          <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">
            ${item.type} ⬄ ${item.dimension}
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-top: 0.15rem;">
            ${item.dataLabel}
          </div>
          <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 0.15rem;">
            ${item.rangeDesc}
          </div>
        `;

        const playBtn = document.createElement('button');
        playBtn.innerHTML = "🔊";
        playBtn.title = `Audition ${item.dataLabel} sonification`;
        playBtn.style.cssText = `
          background: #1e293b;
          color: #f8fafc;
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 6px;
          padding: 0.35rem 0.6rem;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        `;
        playBtn.onclick = async (e) => {
          e.stopPropagation();
          await defaultEngine.start();
          ensureAudio();
          playBtn.style.transform = "scale(0.92)";
          setTimeout(() => playBtn.style.transform = "scale(1)", 150);
          item.audition(synth, samplePlayer);
        };

        card.appendChild(textPart);
        card.appendChild(playBtn);
        list.appendChild(card);
      });

      wrapper.appendChild(list);
      container.appendChild(wrapper);
    });
  }

  legend.title = function(_) {
    if (!arguments.length) return title;
    title = _;
    return legend;
  };

  legend.pitch = function(scaler, dataLabel = "Metric") {
    items.push({
      type: "Pitch / Frequency",
      dimension: "Musical Notes",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ ${scaler.range ? scaler.range().join(' → ') : ''}`,
      audition: async (s) => {
        const d = scaler.domain ? scaler.domain() : [0, 100];
        const n1 = scaler(d[0]);
        const n2 = scaler((d[0] + d[1]) / 2);
        const n3 = scaler(d[1]);
        s.triggerAttackRelease(n1, "16n");
        await new Promise(r => setTimeout(r, 160));
        s.triggerAttackRelease(n2, "16n");
        await new Promise(r => setTimeout(r, 160));
        s.triggerAttackRelease(n3, "8n");
      }
    });
    return legend;
  };

  legend.gain = function(scaler, dataLabel = "Volume") {
    items.push({
      type: "Gain / Amplitude",
      dimension: "Loudness",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ Soft to Loud`,
      audition: async (s) => {
        s.triggerAttackRelease("C4", "16n", undefined, 0.2);
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("C4", "16n", undefined, 0.5);
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("C4", "8n", undefined, 0.95);
      }
    });
    return legend;
  };

  legend.pan = function(scaler, dataLabel = "Spatial Position") {
    items.push({
      type: "Stereo Panning",
      dimension: "Left ↔ Right Position",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ L ↔ R`,
      audition: async (s) => {
        s.triggerAttackRelease("E4", "16n", undefined, 0.7, { pan: -0.85 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("G4", "16n", undefined, 0.7, { pan: 0.0 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("C5", "8n", undefined, 0.7, { pan: 0.85 });
      }
    });
    return legend;
  };

  legend.filter = function(scaler, dataLabel = "Filter Cutoff") {
    items.push({
      type: "Timbral Filter",
      dimension: "Cutoff Frequency (Hz)",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ Dark to Bright`,
      audition: async (s) => {
        s.triggerAttackRelease("A3", "16n", undefined, 0.8, { filter: 400 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("A3", "16n", undefined, 0.8, { filter: 2000 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("A3", "8n", undefined, 0.8, { filter: 7000 });
      }
    });
    return legend;
  };

  legend.sample = function(scaler, dataLabel = "Category / Event Type") {
    items.push({
      type: "Categorical Timbre",
      dimension: "Percussion / Soundbank",
      dataLabel,
      rangeDesc: "Discrete categories mapped to distinct acoustic hits",
      audition: async (s, drums) => {
        drums.trigger("kick", "8n", undefined, 0.85);
        await new Promise(r => setTimeout(r, 200));
        drums.trigger("snare", "8n", undefined, 0.8);
        await new Promise(r => setTimeout(r, 200));
        drums.trigger("bell", "8n", undefined, 0.85);
      }
    });
    return legend;
  };

  legend.tension = function(scaler, dataLabel = "Harmonic Tension") {
    items.push({
      type: "Harmonic Tension",
      dimension: "Consonance ➔ Dissonance",
      dataLabel,
      rangeDesc: "Baseline Equilibrium ➔ Alert / Anomaly Spike",
      audition: async (s) => {
        // Consonant chord
        s.triggerAttackRelease(["C3", "G3", "C4", "E4"], "8n", undefined, 0.7);
        await new Promise(r => setTimeout(r, 380));
        // Dissonant tension chord
        s.triggerAttackRelease(["C3", "F#3", "Bb3", "Db4"], "8n", undefined, 0.85);
      }
    });
    return legend;
  };

  legend.clear = function() {
    items.length = 0;
    return legend;
  };

  return legend;
}


// --- src/movements/motionEnvelope.js ---
/**
 * Motion envelopes and physics utilities for rhythmic movements.
 */

/**
 * Standard easing functions.
 */
const easings = {
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
function adsrEnvelope(t, { attack = 0.1, decay = 0.2, sustain = 0.4, release = 0.3 } = {}) {
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
function dampedOscillation(t, frequency = 3, decay = 3) {
  if (t <= 0) return 0;
  if (t >= 1) return 0;
  return Math.exp(-decay * t) * Math.sin(2 * Math.PI * frequency * t);
}


// --- src/movements/presets/wiggle.js ---

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
function wiggle(t, {
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


// --- src/movements/presets/flip.js ---

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
function flip(t, {
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


// --- src/movements/presets/pulse.js ---

/**
 * Pulse movement preset: Dynamic scale pop with punchy attack and smooth decay.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Scale boost multiplier (default: 1.0)
 * @param {number} options.maxScale Max scale multiplier (default: 1.35)
 * @returns {{ transform: string, scale: number }}
 */
function pulse(t, {
  intensity = 1.0,
  maxScale = 1.35
} = {}) {
  let scaleFactor = 1.0;
  const boost = (maxScale - 1.0) * intensity;

  if (t < 0.2) {
    // Punchy rise
    const progress = t / 0.2;
    scaleFactor = 1.0 + boost * easings.easeOutQuad(progress);
  } else {
    // Smooth elastic or exponential decay back to 1.0
    const progress = (t - 0.2) / 0.8;
    scaleFactor = 1.0 + boost * (1 - easings.easeOutCubic(progress));
  }

  return {
    transform: `scale(${scaleFactor.toFixed(3)})`,
    scale: scaleFactor
  };
}


// --- src/movements/presets/bounce.js ---

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
function bounce(t, {
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


// --- src/movements/presets/shake.js ---
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
function shake(t, {
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


// --- src/movements/presets/ripple.js ---

/**
 * Ripple movement preset: Expanding halo / shockwave ring emitting from element.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Scale multiplier (default: 1.0)
 * @param {number} options.maxRadius Max expansion scale (default: 2.5)
 * @returns {{ scale: number, opacity: number, strokeWidth: number, transform: string }}
 */
function ripple(t, {
  intensity = 1.0,
  maxRadius = 2.2
} = {}) {
  const eased = easings.easeOutQuad(t);
  const scale = 1.0 + (maxRadius - 1.0) * eased * intensity;
  const opacity = (1.0 - t) * Math.min(1.0, intensity);
  const strokeWidth = Math.max(0.5, (1.0 - t) * 3 * intensity);

  return {
    scale,
    opacity,
    strokeWidth,
    transform: `scale(${scale.toFixed(3)})`
  };
}


// --- src/movements/presets/glow.js ---

/**
 * Glow movement preset: Dynamic brightness burst and drop-shadow bloom.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Glow multiplier (default: 1.0)
 * @param {string} options.color Glow color (default: "#38bdf8")
 * @returns {{ filter: string, opacity: number, brightness: number }}
 */
function glow(t, {
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


// --- src/movements/presets/squash.js ---

/**
 * Squash and Stretch preset: Classic rhythmic impact animation.
 * 
 * @param {number} t Normalized progress [0, 1]
 * @param {object} options
 * @param {number} options.intensity Factor multiplier (default: 1.0)
 * @param {string} options.direction "vertical" | "horizontal"
 * @returns {{ transform: string, scaleX: number, scaleY: number }}
 */
function squash(t, {
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


// --- src/movements/choreography.js ---

const PRESETS = {
  wiggle,
  flip,
  pulse,
  bounce,
  shake,
  ripple,
  glow,
  squash
};

/**
 * Creates a D3 choreography animator that applies rhythmic physical movements to DOM/SVG elements.
 * 
 * @example
 * const choreo = choreography()
 *   .movement("wiggle")
 *   .duration(0.4)
 *   .intensity(d => d.value / 10);
 * 
 * d3.selectAll(".bubble").call(choreo);
 */
function choreography() {
  let movementType = "wiggle"; // string or custom function (t, options) => { transform, ... }
  let durationVal = 0.35; // seconds
  let intensityAccessor = 1.0;
  let optionsAccessor = {};
  let onStartCallback = null;
  let onProgressCallback = null;
  let onEndCallback = null;

  function resolveMovementFn() {
    if (typeof movementType === 'function') {
      return movementType;
    }
    return PRESETS[movementType] || PRESETS.wiggle;
  }

  function resolveValue(accessor, datum, index, nodes) {
    if (typeof accessor === 'function') {
      return accessor(datum, index, nodes);
    }
    return accessor;
  }

  function animateElement(element, datum, index, nodes) {
    if (!element) return;

    const el = element.node ? element.node() : element;
    if (!el) return;

    const durationSec = resolveValue(durationVal, datum, index, nodes) || 0.35;
    const durationMs = durationSec * 1000;
    const intensity = resolveValue(intensityAccessor, datum, index, nodes) ?? 1.0;
    const extraOpts = resolveValue(optionsAccessor, datum, index, nodes) || {};
    const moveFn = typeof extraOpts.movement === 'function' ? extraOpts.movement :
      (extraOpts.movement ? PRESETS[extraOpts.movement] : resolveMovementFn());

    const options = {
      intensity,
      ...extraOpts
    };

    // Ensure transform origin is set for SVG/DOM elements
    const isSvg = el instanceof SVGElement;
    if (isSvg) {
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = extraOpts.origin || 'center';
    } else {
      el.style.transformOrigin = extraOpts.origin || 'center';
    }

    const initialTransform = el.style.transform || '';
    const initialFilter = el.style.filter || '';

    let startTime = null;
    let animId = null;

    if (onStartCallback) {
      onStartCallback(el, datum, index);
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1.0, elapsed / durationMs);

      const frameResult = moveFn(t, options);

      // Apply transform & styling
      if (frameResult.transform !== undefined) {
        if (frameResult.transform === 'none' || frameResult.transform === '') {
          el.style.transform = '';
        } else {
          el.style.transform = frameResult.transform;
        }
      }

      if (frameResult.filter !== undefined) {
        el.style.filter = frameResult.filter;
      }

      if (frameResult.opacity !== undefined && movementType === 'ripple') {
        el.style.opacity = frameResult.opacity;
      }

      if (onProgressCallback) {
        onProgressCallback(t, frameResult, el, datum);
      }

      if (t < 1.0) {
        animId = requestAnimationFrame(step);
      } else {
        // Reset to rest state
        el.style.transform = '';
        if (frameResult.filter !== undefined) el.style.filter = '';
        if (movementType === 'ripple') el.style.opacity = '';

        if (onEndCallback) {
          onEndCallback(el, datum, index);
        }
      }
    }

    animId = requestAnimationFrame(step);

    return {
      cancel: () => {
        if (animId) cancelAnimationFrame(animId);
        el.style.transform = '';
        el.style.filter = '';
      }
    };
  }

  function choreo(selection) {
    if (!selection) return;

    if (selection.each) {
      selection.each(function(d, i, nodes) {
        animateElement(this, d, i, nodes);
      });
    } else {
      animateElement(selection, selection.__data__, 0, [selection]);
    }
  }

  choreo.trigger = function(element, options = {}) {
    return animateElement(element, element.__data__ || null, 0, [element]);
  };

  choreo.movement = function(_) {
    if (!arguments.length) return movementType;
    movementType = _;
    return choreo;
  };

  choreo.duration = function(_) {
    if (!arguments.length) return durationVal;
    durationVal = _;
    return choreo;
  };

  choreo.intensity = function(_) {
    if (!arguments.length) return intensityAccessor;
    intensityAccessor = _;
    return choreo;
  };

  choreo.options = function(_) {
    if (!arguments.length) return optionsAccessor;
    optionsAccessor = _;
    return choreo;
  };

  choreo.onStart = function(cb) {
    if (!arguments.length) return onStartCallback;
    onStartCallback = cb;
    return choreo;
  };

  choreo.onProgress = function(cb) {
    if (!arguments.length) return onProgressCallback;
    onProgressCallback = cb;
    return choreo;
  };

  choreo.onEnd = function(cb) {
    if (!arguments.length) return onEndCallback;
    onEndCallback = cb;
    return choreo;
  };

  return choreo;
}


// --- src/audio/soundEngine.js ---
/**
 * SoundEngine: Audio context lifecycle manager, master effects chain, and routing bus.
 */
class SoundEngine {
  constructor(toneInstance = null) {
    this.Tone = toneInstance || (typeof window !== 'undefined' ? window.Tone : null);
    this.isReady = false;
    this.masterGain = null;
    this.masterFilter = null;
    this.reverb = null;
    this.delay = null;
    this.limiter = null;
    this.voices = new Set();
    this.rawAudioCtx = null;
  }

  /**
   * Sets Tone.js instance if imported or injected dynamically.
   */
  setTone(tone) {
    this.Tone = tone;
  }

  getAudioContext() {
    if (this.Tone && this.Tone.context && this.Tone.context.rawContext) {
      return this.Tone.context.rawContext;
    }
    if (typeof window !== 'undefined') {
      if (!this.rawAudioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          this.rawAudioCtx = new AudioCtxClass();
        }
      }
      return this.rawAudioCtx;
    }
    return null;
  }

  /**
   * Initializes Web Audio context on user gesture.
   */
  async start() {
    if (!this.Tone && typeof window !== 'undefined' && window.Tone) {
      this.Tone = window.Tone;
    }

    try {
      if (this.Tone && typeof this.Tone.start === 'function') {
        await this.Tone.start();
        if (this.Tone.context && typeof this.Tone.context.resume === 'function') {
          await this.Tone.context.resume();
        }
      }

      const rawCtx = this.getAudioContext();
      if (rawCtx && rawCtx.state === 'suspended') {
        await rawCtx.resume();
      }

      if (!this.isReady && this.Tone) {
        this.initMasterChain();
        this.isReady = true;
      }
      return true;
    } catch (e) {
      console.warn('AudioContext start notice:', e);
      return false;
    }
  }

  initMasterChain() {
    if (!this.Tone) return;

    try {
      // 1. Master Volume connected to Destination
      this.masterGain = new this.Tone.Gain(0.9).toDestination();

      // 2. Master Filter connected to Master Gain
      this.masterFilter = new this.Tone.Filter({
        frequency: 20000,
        type: "lowpass",
        rolloff: -12
      }).connect(this.masterGain);

      // 3. Reverb (Send/Return) using Freeverb / JCReverb (100% synchronous, immediate)
      if (this.Tone.Freeverb) {
        this.reverb = new this.Tone.Freeverb({
          roomSize: 0.65,
          dampening: 3500,
          wet: 0.12
        }).connect(this.masterGain);
      } else if (this.Tone.JCReverb) {
        this.reverb = new this.Tone.JCReverb({
          roomSize: 0.5,
          wet: 0.12
        }).connect(this.masterGain);
      }

      // 4. Delay (Send/Return)
      if (this.Tone.FeedbackDelay) {
        this.delay = new this.Tone.FeedbackDelay({
          delayTime: "8n.",
          feedback: 0.2,
          wet: 0.1
        }).connect(this.masterGain);
      }
    } catch (err) {
      console.warn('Master chain initialized with fallback to Destination:', err);
      if (this.Tone.getDestination) {
        this.masterGain = this.Tone.getDestination();
        this.masterFilter = this.masterGain;
      }
    }
  }

  /**
   * Returns master input node for voices to connect to.
   */
  getMasterInput() {
    if (!this.masterGain || !this.masterFilter) {
      this.initMasterChain();
    }
    return this.masterFilter || this.masterGain || (this.Tone ? this.Tone.getDestination() : null);
  }

  /**
   * Adjusts master volume in dB or linear gain.
   */
  setVolume(val, isDb = false) {
    if (!this.masterGain) return;
    if (this.masterGain.gain && typeof this.masterGain.gain.rampTo === 'function') {
      const gainVal = isDb && this.Tone ? this.Tone.dbToGain(val) : Math.max(0, Math.min(1, val));
      this.masterGain.gain.rampTo(gainVal, 0.05);
    }
  }

  /**
   * Adjusts master filter frequency (Hz).
   */
  setFilter(freq, q = 1) {
    if (!this.masterFilter) return;
    if (this.masterFilter.frequency && typeof this.masterFilter.frequency.rampTo === 'function') {
      this.masterFilter.frequency.rampTo(freq, 0.05);
      if (this.masterFilter.Q) this.masterFilter.Q.value = q;
    }
  }

  /**
   * Adjusts reverb wet/dry mix [0, 1].
   */
  setReverb(wet) {
    if (!this.reverb) return;
    if (this.reverb.wet && typeof this.reverb.wet.rampTo === 'function') {
      this.reverb.wet.rampTo(Math.max(0, Math.min(1, wet)), 0.05);
    }
  }

  /**
   * Registers a synth voice for lifecycle management.
   */
  registerVoice(voice) {
    this.voices.add(voice);
  }

  unregisterVoice(voice) {
    this.voices.delete(voice);
  }

  /**
   * Mutes or stops all currently sounding voices.
   */
  stopAll() {
    this.voices.forEach(voice => {
      if (voice && typeof voice.releaseAll === 'function') {
        voice.releaseAll();
      } else if (voice && typeof voice.triggerRelease === 'function') {
        voice.triggerRelease();
      }
    });
  }

  dispose() {
    this.stopAll();
    if (this.masterGain && this.masterGain.dispose) this.masterGain.dispose();
    if (this.masterFilter && this.masterFilter.dispose) this.masterFilter.dispose();
    if (this.reverb && this.reverb.dispose) this.reverb.dispose();
    if (this.delay && this.delay.dispose) this.delay.dispose();
    if (this.limiter && this.limiter.dispose) this.limiter.dispose();
    this.isReady = false;
  }
}

const defaultEngine = new SoundEngine();


// --- src/audio/synthVoice.js ---

/**
 * Creates and wraps Tone.js synth instruments with unified trigger, panning, and modulation controls.
 */
class SynthVoice {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);
    this.type = options.type || 'polySynth';
    this.options = options;
    this.instrument = null;
    this.panner = null;
    this.volumeNode = null;
    this.filterNode = null;

    this.init();
  }

  ensureReady() {
    if (!this.Tone && typeof window !== 'undefined' && window.Tone) {
      this.Tone = window.Tone;
    }
    if (!this.instrument && this.Tone) {
      this.init();
    }
  }

  init() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        return;
      }
    }

    try {
      const masterIn = this.engine.getMasterInput();

      // Channel routing: Instrument -> Filter -> Panner -> Volume -> Master
      this.volumeNode = new this.Tone.Volume(this.options.volume || 0);
      this.panner = new this.Tone.Panner(this.options.pan || 0);
      this.filterNode = new this.Tone.Filter(this.options.cutoff || 18000, "lowpass");

      this.filterNode.connect(this.panner);
      this.panner.connect(this.volumeNode);
      if (masterIn) {
        this.volumeNode.connect(masterIn);
      } else {
        this.volumeNode.toDestination();
      }

      this.createInstrument();
      this.engine.registerVoice(this);
    } catch (err) {
      console.warn('SynthVoice init fallback:', err);
    }
  }

  createInstrument() {
    const Tone = this.Tone;
    if (!Tone) return;

    try {
      switch (this.type) {
        case 'fmSynth':
          this.instrument = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: this.options.harmonicity || 1.5,
            modulationIndex: this.options.modulationIndex || 3,
            oscillator: { type: this.options.oscillator || "sine" },
            envelope: this.options.envelope || { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
            modulation: { type: "square" }
          });
          break;

        case 'amSynth':
          this.instrument = new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: this.options.harmonicity || 2,
            oscillator: { type: this.options.oscillator || "triangle" },
            envelope: this.options.envelope || { attack: 0.02, decay: 0.3, sustain: 0.5, release: 1.0 }
          });
          break;

        case 'membraneSynth':
          this.instrument = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }
          });
          break;

        case 'noiseSynth':
          this.instrument = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0.0 }
          });
          break;

        case 'pluckSynth':
          this.instrument = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.92
          });
          break;

        case 'polySynth':
        default:
          this.instrument = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: this.options.oscillator || "triangle" },
            envelope: this.options.envelope || {
              attack: 0.02,
              decay: 0.2,
              sustain: 0.4,
              release: 0.8
            }
          });
          break;
      }

      if (this.instrument) {
        if (this.filterNode) {
          this.instrument.connect(this.filterNode);
        } else {
          this.instrument.toDestination();
        }
      }
    } catch (err) {
      console.warn('createInstrument fallback to basic PolySynth:', err);
      if (Tone.PolySynth && Tone.Synth) {
        this.instrument = new Tone.PolySynth(Tone.Synth).toDestination();
      }
    }
  }

  /**
   * Triggers note attack and release.
   */
  triggerAttackRelease(note, duration = "8n", time = undefined, velocity = 0.8, params = {}) {
    this.ensureReady();
    if (!this.instrument) return;

    try {
      if (params.pan !== undefined && this.panner && this.panner.pan) {
        if (typeof this.panner.pan.rampTo === 'function') {
          this.panner.pan.rampTo(Math.max(-1, Math.min(1, params.pan)), 0.02, time);
        } else {
          this.panner.pan.value = Math.max(-1, Math.min(1, params.pan));
        }
      }

      if (params.filter !== undefined && this.filterNode && this.filterNode.frequency) {
        if (typeof this.filterNode.frequency.rampTo === 'function') {
          this.filterNode.frequency.rampTo(params.filter, 0.02, time);
        } else {
          this.filterNode.frequency.value = params.filter;
        }
      }

      const t = time !== undefined ? time : (this.Tone ? this.Tone.now() : undefined);
      const vel = Math.max(0.01, Math.min(1.0, velocity));

      if (this.type === 'noiseSynth') {
        this.instrument.triggerAttackRelease(duration, t, vel);
      } else {
        this.instrument.triggerAttackRelease(note, duration, t, vel);
      }
    } catch (e) {
      // Fallback native Web Audio Oscillator if Tone context failed
      this.playNativeFallback(note, duration, velocity);
    }
  }

  playNativeFallback(note, duration = "8n", velocity = 0.8) {
    try {
      const ctx = this.engine.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Simple frequency estimation
      let freq = 440;
      if (typeof note === 'number') freq = note;
      else if (typeof note === 'string') {
        const midi = 60; // approximate
        freq = 440 * Math.pow(2, (midi - 69) / 12);
      }

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const durSec = typeof duration === 'number' ? duration : 0.3;
      gain.gain.setValueAtTime(velocity * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durSec);
    } catch (err) {
      // Ignore
    }
  }

  triggerAttack(note, time = undefined, velocity = 0.8) {
    this.ensureReady();
    if (!this.instrument) return;
    const t = time !== undefined ? time : (this.Tone ? this.Tone.now() : undefined);
    this.instrument.triggerAttack(note, t, velocity);
  }

  triggerRelease(note = undefined, time = undefined) {
    if (!this.instrument) return;
    const t = time !== undefined ? time : (this.Tone ? this.Tone.now() : undefined);
    if (this.instrument.releaseAll) {
      this.instrument.releaseAll(t);
    } else if (this.instrument.triggerRelease) {
      if (note) this.instrument.triggerRelease(note, t);
      else this.instrument.triggerRelease(t);
    }
  }

  setPan(pan) {
    if (this.panner && this.panner.pan) {
      this.panner.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  setVolume(volDb) {
    if (this.volumeNode && this.volumeNode.volume) {
      this.volumeNode.volume.value = volDb;
    }
  }

  dispose() {
    this.engine.unregisterVoice(this);
    if (this.instrument && this.instrument.dispose) this.instrument.dispose();
    if (this.filterNode && this.filterNode.dispose) this.filterNode.dispose();
    if (this.panner && this.panner.dispose) this.panner.dispose();
    if (this.volumeNode && this.volumeNode.dispose) this.volumeNode.dispose();
  }
}

function createSynth(options = {}, engine = defaultEngine) {
  return new SynthVoice(options, engine);
}


// --- src/audio/samplePlayer.js ---

/**
 * SamplePlayer: Handles playback of sampled instruments, audio clips, and synthesized percussion soundbanks.
 */
class SamplePlayer {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);
    this.options = options;
    this.samples = new Map();
    this.panner = null;
    this.volumeNode = null;
    this.synthInstruments = {};

    this.init();
  }

  ensureReady() {
    if (!this.Tone && typeof window !== 'undefined' && window.Tone) {
      this.Tone = window.Tone;
    }
    if (!this.volumeNode && this.Tone) {
      this.init();
    }
  }

  init() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        return;
      }
    }

    try {
      const masterIn = this.engine.getMasterInput();

      this.volumeNode = new this.Tone.Volume(this.options.volume || 0);
      this.panner = new this.Tone.Panner(this.options.pan || 0);

      this.panner.connect(this.volumeNode);
      if (masterIn) {
        this.volumeNode.connect(masterIn);
      } else {
        this.volumeNode.toDestination();
      }

      this.initBuiltinSounds();

      if (this.options.urls) {
        this.loadUrls(this.options.urls);
      }
    } catch (err) {
      console.warn('SamplePlayer init fallback:', err);
    }
  }

  initBuiltinSounds() {
    const Tone = this.Tone;
    if (!Tone) return;

    try {
      // 1. Kick (808 Membrane)
      this.synthInstruments.kick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.0, release: 0.2 }
      });
      if (this.panner) this.synthInstruments.kick.connect(this.panner);
      else this.synthInstruments.kick.toDestination();

      // 2. Snare
      const snareNoise = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0 }
      });
      const snareTone = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
      });
      const snareFilter = new Tone.Filter(2200, "highpass");
      snareNoise.connect(snareFilter);
      snareTone.connect(snareFilter);
      if (this.panner) snareFilter.connect(this.panner);
      else snareFilter.toDestination();

      this.synthInstruments.snare = {
        triggerAttackRelease: (dur, time, vel = 0.8) => {
          snareNoise.triggerAttackRelease(dur, time, vel);
          snareTone.triggerAttackRelease("G2", "16n", time, vel * 0.7);
        },
        dispose: () => {
          snareNoise.dispose();
          snareTone.dispose();
          snareFilter.dispose();
        }
      };

      // 3. Hi-Hat Closed
      const hatClosed = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0 }
      });
      const hatFilter = new Tone.Filter(7000, "highpass");
      if (this.panner) hatFilter.connect(this.panner);
      else hatFilter.toDestination();
      hatClosed.connect(hatFilter);

      this.synthInstruments.hihat = {
        triggerAttackRelease: (dur, time, vel = 0.7) => {
          hatClosed.triggerAttackRelease("32n", time, vel);
        },
        dispose: () => {
          hatClosed.dispose();
          hatFilter.dispose();
        }
      };

      // 4. Hi-Hat Open
      const hatOpen = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0 }
      });
      hatOpen.connect(hatFilter);
      this.synthInstruments.openhat = {
        triggerAttackRelease: (dur, time, vel = 0.7) => {
          hatOpen.triggerAttackRelease("8n", time, vel);
        },
        dispose: () => {
          hatOpen.dispose();
        }
      };

      // 5. Clap
      const clapNoise = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.005, decay: 0.14, sustain: 0 }
      });
      const clapFilter = new Tone.Filter(1400, "bandpass");
      if (this.panner) clapFilter.connect(this.panner);
      else clapFilter.toDestination();
      clapNoise.connect(clapFilter);

      this.synthInstruments.clap = {
        triggerAttackRelease: (dur, time, vel = 0.8) => {
          clapNoise.triggerAttackRelease("16n", time, vel);
        },
        dispose: () => {
          clapNoise.dispose();
          clapFilter.dispose();
        }
      };

      // 6. Tom
      this.synthInstruments.tom = new Tone.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0 }
      });
      if (this.panner) this.synthInstruments.tom.connect(this.panner);
      else this.synthInstruments.tom.toDestination();

      // 7. Bell
      this.synthInstruments.bell = new Tone.FMSynth({
        harmonicity: 3.5,
        modulationIndex: 12,
        envelope: { attack: 0.001, decay: 0.8, sustain: 0.05, release: 0.8 },
        modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0 }
      });
      if (this.panner) this.synthInstruments.bell.connect(this.panner);
      else this.synthInstruments.bell.toDestination();

      // 8. Blip
      this.synthInstruments.blip = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0 }
      });
      if (this.panner) this.synthInstruments.blip.connect(this.panner);
      else this.synthInstruments.blip.toDestination();
    } catch (err) {
      console.warn('initBuiltinSounds error:', err);
    }
  }

  async loadUrls(urlsMap) {
    if (!this.Tone) return;

    for (const [name, url] of Object.entries(urlsMap)) {
      const player = new this.Tone.Player({
        url,
        autostart: false
      });
      if (this.panner) player.connect(this.panner);
      else player.toDestination();
      this.samples.set(name, player);
    }
  }

  trigger(sampleName = "kick", duration = "8n", time = undefined, velocity = 0.8, params = {}) {
    this.ensureReady();
    if (!this.Tone) return;

    try {
      const t = time !== undefined ? time : this.Tone.now();
      const name = (sampleName || 'kick').toLowerCase();
      const vel = Math.max(0.01, Math.min(1.0, velocity));

      if (params.pan !== undefined && this.panner && this.panner.pan) {
        if (typeof this.panner.pan.rampTo === 'function') {
          this.panner.pan.rampTo(Math.max(-1, Math.min(1, params.pan)), 0.02, time);
        } else {
          this.panner.pan.value = Math.max(-1, Math.min(1, params.pan));
        }
      }

      if (this.samples.has(name)) {
        const player = this.samples.get(name);
        if (player && player.loaded) {
          player.start(t);
          return;
        }
      }

      switch (name) {
        case 'kick':
        case 'bassdrum':
        case 'bd':
          if (this.synthInstruments.kick) {
            this.synthInstruments.kick.triggerAttackRelease(params.pitch || "C1", duration, t, vel);
          }
          break;

        case 'snare':
        case 'sd':
          if (this.synthInstruments.snare) {
            this.synthInstruments.snare.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'hihat':
        case 'hat':
        case 'hh':
        case 'closedhat':
          if (this.synthInstruments.hihat) {
            this.synthInstruments.hihat.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'openhat':
        case 'oh':
        case 'cymbal':
          if (this.synthInstruments.openhat) {
            this.synthInstruments.openhat.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'clap':
        case 'handclap':
        case 'cp':
          if (this.synthInstruments.clap) {
            this.synthInstruments.clap.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'tom':
        case 'hitom':
        case 'lotom':
          if (this.synthInstruments.tom) {
            this.synthInstruments.tom.triggerAttackRelease(params.pitch || "G2", duration, t, vel);
          }
          break;

        case 'bell':
        case 'chime':
        case 'cowbell':
          if (this.synthInstruments.bell) {
            this.synthInstruments.bell.triggerAttackRelease(params.pitch || "E5", duration, t, vel);
          }
          break;

        case 'blip':
        case 'beep':
        case 'click':
        case 'tick':
        default:
          if (this.synthInstruments.blip) {
            this.synthInstruments.blip.triggerAttackRelease(params.pitch || "A5", "32n", t, vel);
          }
          break;
      }
    } catch (err) {
      console.warn('SamplePlayer trigger error:', err);
    }
  }

  setPan(pan) {
    if (this.panner && this.panner.pan) {
      this.panner.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  dispose() {
    for (const player of this.samples.values()) {
      if (player && player.dispose) player.dispose();
    }
    for (const inst of Object.values(this.synthInstruments)) {
      if (inst && inst.dispose) inst.dispose();
    }
    if (this.panner && this.panner.dispose) this.panner.dispose();
    if (this.volumeNode && this.volumeNode.dispose) this.volumeNode.dispose();
  }
}

function createSamplePlayer(options = {}, engine = defaultEngine) {
  return new SamplePlayer(options, engine);
}


// --- src/timeline/track.js ---

/**
 * Track: Manages an audio-visual data stream with its own instrument, data bindings, and visual choreography.
 */
class Track {
  constructor(name = "default", options = {}, engine = defaultEngine) {
    this.name = name;
    this.engine = engine;
    this.options = options;

    this.dataset = [];
    this.isMuted = false;
    this.isSolo = false;

    // Accessors
    this.timeAccessor = (d, i) => i * 0.25; // default 16th or quarter notes
    this.pitchAccessor = d => d.pitch || d.note || "C4";
    this.gainAccessor = d => d.gain || d.velocity || d.volume || 0.8;
    this.durationAccessor = d => d.duration || "8n";
    this.panAccessor = d => d.pan !== undefined ? d.pan : 0;
    this.filterAccessor = d => d.filter !== undefined ? d.filter : undefined;
    this.sampleAccessor = d => d.sample || d.sound || undefined;
    this.movementAccessor = d => d.movement || null;
    this.elementAccessor = (d, i) => d.element || null;

    // Instrument setup
    this.instrumentType = options.type || 'synth'; // 'synth', 'sample', or custom
    if (this.instrumentType === 'sample') {
      this.instrument = options.instrument || createSamplePlayer(options, engine);
    } else {
      this.instrument = options.instrument || createSynth(options, engine);
    }

    // Default choreography
    this.choreographer = choreography();
  }

  data(_) {
    if (!arguments.length) return this.dataset;
    this.dataset = Array.isArray(_) ? _ : [];
    return this;
  }

  time(_) {
    if (!arguments.length) return this.timeAccessor;
    this.timeAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  pitch(_) {
    if (!arguments.length) return this.pitchAccessor;
    this.pitchAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  gain(_) {
    if (!arguments.length) return this.gainAccessor;
    this.gainAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  duration(_) {
    if (!arguments.length) return this.durationAccessor;
    this.durationAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  pan(_) {
    if (!arguments.length) return this.panAccessor;
    this.panAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  filter(_) {
    if (!arguments.length) return this.filterAccessor;
    this.filterAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  sample(_) {
    if (!arguments.length) return this.sampleAccessor;
    this.sampleAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  movement(_) {
    if (!arguments.length) return this.movementAccessor;
    this.movementAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  element(_) {
    if (!arguments.length) return this.elementAccessor;
    this.elementAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  mute(_) {
    if (!arguments.length) return this.isMuted;
    this.isMuted = !!_;
    return this;
  }

  solo(_) {
    if (!arguments.length) return this.isSolo;
    this.isSolo = !!_;
    return this;
  }

  /**
   * Evaluates and builds scheduled timeline events from the dataset.
   * @param {number} globalBpm
   * @returns {Array<object>}
   */
  buildEvents(globalBpm = 120) {
    const events = [];

    this.dataset.forEach((datum, index) => {
      const rawTime = this.timeAccessor(datum, index);
      const pitch = this.pitchAccessor(datum, index);
      const gain = this.gainAccessor(datum, index);
      const duration = this.durationAccessor(datum, index);
      const pan = this.panAccessor(datum, index);
      const filter = this.filterAccessor(datum, index);
      const sample = this.sampleAccessor(datum, index);
      const moveOpt = this.movementAccessor(datum, index);
      let targetElement = this.elementAccessor(datum, index);
      if (!targetElement && moveOpt && typeof moveOpt === 'object' && moveOpt.element) {
        targetElement = moveOpt.element;
      }

      events.push({
        track: this,
        index,
        datum,
        time: rawTime,
        pitch,
        gain,
        duration,
        pan,
        filter,
        sample,
        movement: moveOpt,
        element: targetElement
      });
    });

    return events;
  }

  /**
   * Executes a single event: triggers audio on hardware time and visuals on Tone.Draw frame.
   * @param {object} event Built event object
   * @param {number} scheduledTime AudioContext timestamp
   * @param {object} Tone Tone.js instance
   */
  triggerEvent(event, scheduledTime, Tone) {
    if (this.isMuted) return;

    // 1. Audio synthesis trigger
    const duration = event.duration || "8n";
    const velocity = event.gain !== undefined ? event.gain : 0.8;
    const params = { pan: event.pan, filter: event.filter };

    if (event.sample || this.instrumentType === 'sample') {
      const sampleName = event.sample || 'kick';
      if (this.instrument && this.instrument.trigger) {
        this.instrument.trigger(sampleName, duration, scheduledTime, velocity, { ...params, pitch: event.pitch });
      }
    } else if (this.instrument && this.instrument.triggerAttackRelease) {
      this.instrument.triggerAttackRelease(event.pitch, duration, scheduledTime, velocity, params);
    }

    // 2. High-precision visual synchronization with Tone.Draw
    if (Tone && Tone.Draw) {
      Tone.Draw.schedule(() => {
        this.triggerVisuals(event);
      }, scheduledTime);
    } else {
      this.triggerVisuals(event);
    }
  }

  triggerVisuals(event) {
    let targetEl = event.element;
    let moveConfig = event.movement;

    if (!targetEl && moveConfig && typeof moveConfig === 'object' && moveConfig.element) {
      targetEl = moveConfig.element;
    }

    if (typeof targetEl === 'function') targetEl = targetEl(event.datum, event.index);
    if (!targetEl) return;

    if (typeof moveConfig === 'string') {
      moveConfig = { movement: moveConfig };
    } else if (typeof moveConfig === 'function') {
      moveConfig = { movement: moveConfig };
    }

    const durationSec = typeof event.duration === 'number' ? event.duration : 0.35;
    const intensity = (moveConfig && moveConfig.intensity !== undefined)
      ? moveConfig.intensity
      : (event.gain !== undefined ? event.gain : 1.0);

    const opts = {
      intensity,
      duration: durationSec,
      ...(typeof moveConfig === 'object' ? moveConfig : {})
    };

    const choreo = choreography()
      .movement(opts.movement || "wiggle")
      .duration(opts.duration || durationSec)
      .intensity(opts.intensity || intensity)
      .options(opts);

    choreo(targetEl);
  }

  dispose() {
    if (this.instrument && this.instrument.dispose) {
      this.instrument.dispose();
    }
  }
}


// --- src/timeline/timeline.js ---

/**
 * Timeline: Master conductor connecting data sequences to Tone.Transport with synchronized visual callbacks.
 */
class Timeline {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);

    this.tracks = new Map();
    this.defaultTrack = new Track("default", options, engine);
    this.tracks.set("default", this.defaultTrack);

    this._bpm = options.bpm || 120;
    this._loop = options.loop || false;
    this._loopStart = options.loopStart || 0;
    this._loopEnd = options.loopEnd || "4m";
    this._timeSignature = options.timeSignature || [4, 4];

    this.isPlaying = false;
    this.isPaused = false;
    this.scheduledParts = [];
    this.eventListeners = {
      start: [],
      pause: [],
      stop: [],
      step: [],
      progress: [],
      loop: [],
      end: []
    };

    this.progressInterval = null;
  }

  setTone(tone) {
    this.Tone = tone;
    this.engine.setTone(tone);
  }

  /**
   * Defines or retrieves a track.
   * @param {string} name 
   * @param {object} options 
   * @returns {Track}
   */
  track(name = "default", options = {}) {
    if (!this.tracks.has(name)) {
      const newTrack = new Track(name, options, this.engine);
      this.tracks.set(name, newTrack);
    }
    return this.tracks.get(name);
  }

  // Delegate data accessors to default track for quick single-track syntax
  data(_) {
    if (!arguments.length) return this.defaultTrack.data();
    this.defaultTrack.data(_);
    return this;
  }

  time(_) {
    if (!arguments.length) return this.defaultTrack.time();
    this.defaultTrack.time(_);
    return this;
  }

  pitch(_) {
    if (!arguments.length) return this.defaultTrack.pitch();
    this.defaultTrack.pitch(_);
    return this;
  }

  gain(_) {
    if (!arguments.length) return this.defaultTrack.gain();
    this.defaultTrack.gain(_);
    return this;
  }

  duration(_) {
    if (!arguments.length) return this.defaultTrack.duration();
    this.defaultTrack.duration(_);
    return this;
  }

  pan(_) {
    if (!arguments.length) return this.defaultTrack.pan();
    this.defaultTrack.pan(_);
    return this;
  }

  filter(_) {
    if (!arguments.length) return this.defaultTrack.filter();
    this.defaultTrack.filter(_);
    return this;
  }

  sample(_) {
    if (!arguments.length) return this.defaultTrack.sample();
    this.defaultTrack.sample(_);
    return this;
  }

  movement(_) {
    if (!arguments.length) return this.defaultTrack.movement();
    this.defaultTrack.movement(_);
    return this;
  }

  element(_) {
    if (!arguments.length) return this.defaultTrack.element();
    this.defaultTrack.element(_);
    return this;
  }

  bpm(_) {
    if (!arguments.length) return this._bpm;
    this._bpm = +_;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().bpm.value = this._bpm;
    }
    return this;
  }

  loop(_) {
    if (!arguments.length) return this._loop;
    this._loop = !!_;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().loop = this._loop;
    }
    return this;
  }

  loopStart(_) {
    if (!arguments.length) return this._loopStart;
    this._loopStart = _;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().loopStart = this._loopStart;
    }
    return this;
  }

  loopEnd(_) {
    if (!arguments.length) return this._loopEnd;
    this._loopEnd = _;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().loopEnd = this._loopEnd;
    }
    return this;
  }

  timeSignature(_) {
    if (!arguments.length) return this._timeSignature;
    this._timeSignature = _;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().timeSignature = this._timeSignature;
    }
    return this;
  }

  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
    return this;
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Compiles and schedules all tracks onto Tone.Transport.
   */
  schedule() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        return;
      }
    }

    const Transport = this.Tone.getTransport();

    // Clear previous scheduled parts
    this.clearScheduled();

    Transport.bpm.value = this._bpm;
    Transport.loop = this._loop;
    Transport.loopStart = this._loopStart;
    Transport.loopEnd = this._loopEnd;
    Transport.timeSignature = this._timeSignature;

    const hasSolo = Array.from(this.tracks.values()).some(t => t.isSolo);

    for (const track of this.tracks.values()) {
      if (track.isMuted) continue;
      if (hasSolo && !track.isSolo) continue;

      const events = track.buildEvents(this._bpm);

      // Create Tone.Part for this track's events
      const part = new this.Tone.Part((time, event) => {
        track.triggerEvent(event, time, this.Tone);
        if (this.Tone && this.Tone.Draw) {
          this.Tone.Draw.schedule(() => {
            this.emit('step', { event, time, track });
          }, time);
        } else {
          this.emit('step', { event, time, track });
        }
      }, events.map(e => [e.time, e]));

      part.start(0);
      this.scheduledParts.push(part);
    }
  }

  clearScheduled() {
    this.scheduledParts.forEach(p => {
      if (p && p.dispose) p.dispose();
    });
    this.scheduledParts = [];
  }

  /**
   * Starts playback on Tone.Transport.
   */
  async play() {
    await this.engine.start();

    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        console.warn('Tone.js not found.');
        return;
      }
    }

    const Transport = this.Tone.getTransport();

    if (!this.isPlaying || this.isPaused) {
      this.schedule();
      Transport.start();
      this.isPlaying = true;
      this.isPaused = false;
      this.emit('start', { bpm: this._bpm, time: Transport.seconds });

      this.startProgressTracker();
    }
  }

  pause() {
    if (!this.Tone) return;
    const Transport = this.Tone.getTransport();
    Transport.pause();
    this.isPlaying = false;
    this.isPaused = true;
    this.stopProgressTracker();
    this.emit('pause', { time: Transport.seconds });
  }

  stop() {
    if (!this.Tone) return;
    const Transport = this.Tone.getTransport();
    Transport.stop();
    Transport.seconds = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.clearScheduled();
    this.engine.stopAll();
    this.stopProgressTracker();
    this.emit('stop', { time: 0 });
  }

  seek(timeInSeconds) {
    if (!this.Tone) return;
    const Transport = this.Tone.getTransport();
    Transport.seconds = Math.max(0, timeInSeconds);
    this.emit('progress', { seconds: Transport.seconds, position: Transport.position });
  }

  startProgressTracker() {
    this.stopProgressTracker();
    this.progressInterval = setInterval(() => {
      if (!this.Tone || !this.isPlaying) return;
      const Transport = this.Tone.getTransport();
      this.emit('progress', {
        seconds: Transport.seconds,
        position: Transport.position,
        progress: Transport.progress
      });
    }, 30);
  }

  stopProgressTracker() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  dispose() {
    this.stop();
    for (const track of this.tracks.values()) {
      track.dispose();
    }
    this.tracks.clear();
  }
}

function timeline(options = {}, engine = defaultEngine) {
  return new Timeline(options, engine);
}


  // Export functions onto exports object
  exports.scalePitch = scalePitch;
  exports.scaleGain = scaleGain;
  exports.scaleDuration = scaleDuration;
  exports.scalePan = scalePan;
  exports.scaleFilter = scaleFilter;
  exports.scaleSample = scaleSample;
  exports.scaleTempo = scaleTempo;
  exports.scaleTension = scaleTension;
  exports.audioLegend = audioLegend;
  exports.SUBDIVISIONS = SUBDIVISIONS;

  exports.Timeline = Timeline;
  exports.timeline = timeline;
  exports.Track = Track;

  exports.choreography = choreography;
  exports.PRESETS = PRESETS;
  exports.adsrEnvelope = adsrEnvelope;
  exports.dampedOscillation = dampedOscillation;
  exports.easings = easings;
  exports.wiggle = wiggle;
  exports.flip = flip;
  exports.pulse = pulse;
  exports.bounce = bounce;
  exports.shake = shake;
  exports.ripple = ripple;
  exports.glow = glow;
  exports.squash = squash;

  exports.SoundEngine = SoundEngine;
  exports.defaultEngine = defaultEngine;
  exports.SynthVoice = SynthVoice;
  exports.createSynth = createSynth;
  exports.SamplePlayer = SamplePlayer;
  exports.createSamplePlayer = createSamplePlayer;

  exports.parseNote = parseNote;
  exports.midiToNote = midiToNote;
  exports.midiToFrequency = midiToFrequency;
  exports.frequencyToMidi = frequencyToMidi;
  exports.frequencyToNote = frequencyToNote;
  exports.transpose = transpose;
  exports.frequencyToCents = frequencyToCents;
  exports.generateScaleNotes = generateScaleNotes;
  exports.quantizeToScale = quantizeToScale;
  exports.SCALE_INTERVALS = SCALE_INTERVALS;

  // Integrate with d3 if present
  if (typeof window !== 'undefined') {
    if (window.d3) {
      window.d3.audio = exports;
      window.d3.scalePitch = scalePitch;
      window.d3.scaleGain = scaleGain;
      window.d3.scaleDuration = scaleDuration;
      window.d3.scalePan = scalePan;
      window.d3.scaleFilter = scaleFilter;
      window.d3.scaleSample = scaleSample;
      window.d3.scaleTempo = scaleTempo;
      window.d3.scaleTension = scaleTension;
      window.d3.audioLegend = audioLegend;
      window.d3.choreography = choreography;
      window.d3.timeline = timeline;
    }
  }

  Object.defineProperty(exports, '__esModule', { value: true });
}));
