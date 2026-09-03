import { parseNote, midiToNote } from './notes.js';

/**
 * Semitone intervals for musical scales and modes.
 */
export const SCALE_INTERVALS = {
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

  // Middle Eastern Maqams (using quarter-tone / 50-cent fractional semitones)
  maqamBayati: [0, 1.5, 3, 5, 7, 8, 10],   // 2nd degree is half-flat (150 cents)
  maqamRast: [0, 2, 3.5, 5, 7, 9, 10.5],  // 3rd and 7th degrees are half-flat
  maqamHijaz: [0, 1, 4, 5, 7, 8, 10],     // Phrygian dominant
  maqamSaba: [0, 1.5, 2.5, 4, 7, 8, 10],  // Expressive double half-flat intervals

  // Indian Classical Ragas
  ragaBhairav: [0, 1, 4, 5, 7, 8, 11],    // Morning raga (Komal Re, Komal Dha)
  ragaTodi: [0, 1, 3, 6, 7, 8, 11],       // Intense meditative morning raga (Tivra Ma)
  ragaYaman: [0, 2, 4, 6, 7, 9, 11],      // Evening raga (Kalyan thaat, Lydian)
  ragaKafi: [0, 2, 3, 5, 7, 9, 10],       // Late night raga (Kafi thaat, Dorian)
  ragaBhairavi: [0, 1, 3, 5, 7, 8, 10],   // Concluding devotional raga (Phrygian)
  ragaBilawal: [0, 2, 4, 5, 7, 9, 11],    // Base shuddha thaat (Major)

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
export function generateScaleNotes(minNote = "C3", maxNote = "C6", scaleType = "pentatonic", rootNote = "C") {
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
export function quantizeToScale(midiValue, scaleNotes) {
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
