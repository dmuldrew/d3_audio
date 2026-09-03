/**
 * Musical note utilities: pitch, frequency, MIDI and interval math.
 */

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_OFFSETS = {
  'C': 0, 'B#': 0,
  'C+': 0.5, 'C~': 0.5,
  'C#': 1, 'DB': 1, 'Db': 1,
  'D~': 1.5, 'Dd': 1.5, 'Ed': 3.5, 'E~': 3.5,
  'D': 2,
  'D+': 2.5,
  'D#': 3, 'EB': 3, 'Eb': 3,
  'E': 4, 'FB': 4, 'Fb': 4,
  'E+': 4.5,
  'F': 5, 'E#': 5,
  'F+': 5.5,
  'F#': 6, 'GB': 6, 'Gb': 6,
  'G~': 6.5, 'Gd': 6.5,
  'G': 7,
  'G+': 7.5,
  'G#': 8, 'AB': 8, 'Ab': 8,
  'A~': 8.5, 'Ad': 8.5, 'Bd': 10.5, 'B~': 10.5,
  'A': 9,
  'A+': 9.5,
  'A#': 10, 'BB': 10, 'Bb': 10,
  'B': 11, 'CB': 11, 'Cb': 11
};

/**
 * Parses note string (e.g. "C4", "F#3", "Bb5", "E~4", "Ed4") into pitch components.
 * Supports quarter-tone microtonal symbols: ~ or d (half-flat, -50 cents) and + (half-sharp, +50 cents).
 * @param {string|number} note 
 * @returns {{ name: string, octave: number, midi: number, frequency: number, note: string, cents?: number }}
 */
export function parseNote(note) {
  if (typeof note === 'number') {
    return midiToNote(note);
  }
  if (typeof note !== 'string') {
    throw new Error(`Invalid note input: ${note}`);
  }

  const match = note.trim().match(/^([A-Ga-g][#bd~+]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Cannot parse note string: "${note}". Expected format like "C4", "F#3", "Bb5", "E~4".`);
  }

  const [, rawName, rawOctave] = match;
  const name = rawName.charAt(0).toUpperCase() + (rawName.slice(1));
  const octave = parseInt(rawOctave, 10);
  const semitoneOffset = NOTE_OFFSETS[name] !== undefined ? NOTE_OFFSETS[name] : NOTE_OFFSETS[name.toUpperCase()];

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
export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts frequency in Hertz to MIDI note number (can be fractional).
 * @param {number} freq 
 * @returns {number}
 */
export function frequencyToMidi(freq) {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Converts MIDI note number to Note object and scientific pitch string (e.g. 60 -> "C4").
 * @param {number} midi 
 * @param {boolean} preferSharps 
 * @returns {{ name: string, octave: number, midi: number, frequency: number, note: string }}
 */
export function midiToNote(midi, preferSharps = true) {
  const isMicrotone = Math.abs(midi - Math.round(midi)) > 0.15;
  const roundedMidi = Math.round(midi);
  const semitone = ((Math.floor(midi) % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const nameTable = preferSharps ? NOTE_NAMES_SHARP : NOTE_NAMES_FLAT;
  let name = nameTable[semitone];
  let note = `${name}${octave}`;

  if (isMicrotone) {
    const fraction = midi - Math.floor(midi);
    if (Math.abs(fraction - 0.5) < 0.15) {
      name = `${name}~`;
      note = `${nameTable[semitone]}~${octave}`;
    }
  } else {
    name = nameTable[((roundedMidi % 12) + 12) % 12];
    note = `${name}${Math.floor(roundedMidi / 12) - 1}`;
  }

  const cents = Math.round((midi - roundedMidi) * 100);
  const frequency = midiToFrequency(midi);

  return { name, octave, midi, frequency, cents, note };
}

/**
 * Converts frequency in Hz to closest scientific pitch notation string.
 * @param {number} freq 
 * @returns {string} e.g. "A4", "C#5"
 */
export function frequencyToNote(freq, preferSharps = true) {
  const midi = frequencyToMidi(freq);
  return midiToNote(midi, preferSharps).note;
}

/**
 * Transposes a note string or MIDI number by semitones.
 * @param {string|number} note 
 * @param {number} semitones 
 * @returns {string}
 */
export function transpose(note, semitones) {
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
export function frequencyToCents(f1, f2) {
  return 1200 * Math.log2(f2 / f1);
}
