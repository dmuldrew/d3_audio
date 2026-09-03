import { parseNote, midiToNote, transpose } from '../musical/notes.js';

const CHORD_FORMULAS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  halfDim7: [0, 3, 6, 10],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  ninth: [0, 4, 7, 10, 14]
};

/**
 * scaleChord: Multi-variate harmonic scaler mapping multidimensional data records
 * into musically voiced chords (triads, 7ths, 9ths, suspended, altered).
 */
export function scaleChord() {
  let rootNote = "C3";
  let defaultQuality = "major";
  let voicing = "close"; // "close", "open", "drop2"
  let inversion = 0; // 0 = root position, 1 = 1st inversion, 2 = 2nd inversion

  function scaler(input) {
    let currentRoot = rootNote;
    let quality = defaultQuality;

    if (Array.isArray(input)) {
      if (typeof input[0] === 'string') currentRoot = input[0];
      if (input[1] && CHORD_FORMULAS[input[1]]) quality = input[1];
    } else if (typeof input === 'object' && input !== null) {
      if (input.root) currentRoot = input.root;
      if (input.quality && CHORD_FORMULAS[input.quality]) quality = input.quality;
      if (input.inversion !== undefined) inversion = input.inversion;
      if (input.voicing) voicing = input.voicing;
    } else if (typeof input === 'string') {
      if (CHORD_FORMULAS[input]) quality = input;
      else currentRoot = input;
    }

    const intervals = (CHORD_FORMULAS[quality] || CHORD_FORMULAS.major).slice();
    const rootParsed = parseNote(currentRoot);
    const rootMidi = rootParsed.midi;

    let chordMidis = intervals.map(semitones => rootMidi + semitones);

    // Apply inversion
    if (inversion > 0 && chordMidis.length > 1) {
      for (let i = 0; i < (inversion % chordMidis.length); i++) {
        chordMidis[i] += 12;
      }
      chordMidis.sort((a, b) => a - b);
    }

    // Apply open voicing / drop 2
    if (voicing === "open" && chordMidis.length >= 3) {
      // drop 2nd note down an octave or raise 3rd note up an octave
      chordMidis[1] += 12;
      chordMidis.sort((a, b) => a - b);
    } else if (voicing === "drop2" && chordMidis.length >= 4) {
      // drop 2nd highest note down an octave
      const idx = chordMidis.length - 2;
      chordMidis[idx] -= 12;
      chordMidis.sort((a, b) => a - b);
    }

    const notes = chordMidis.map(m => midiToNote(m).note);
    const frequencies = chordMidis.map(m => midiToNote(m).frequency);

    return {
      root: currentRoot,
      quality,
      notes,
      midis: chordMidis,
      frequencies,
      toString: () => notes.join('-')
    };
  }

  scaler.root = function(r) {
    return arguments.length ? ((rootNote = r), scaler) : rootNote;
  };

  scaler.quality = function(q) {
    return arguments.length ? ((defaultQuality = q), scaler) : defaultQuality;
  };

  scaler.voicing = function(v) {
    return arguments.length ? ((voicing = v), scaler) : voicing;
  };

  scaler.inversion = function(inv) {
    return arguments.length ? ((inversion = inv), scaler) : inversion;
  };

  scaler.formulas = () => Object.keys(CHORD_FORMULAS);

  return scaler;
}

export const scaleHarmony = scaleChord;
