import { assert, assertEqual, assertClose } from './run-tests.js';
import {
  parseNote,
  midiToNote,
  midiToFrequency,
  frequencyToMidi,
  frequencyToNote,
  transpose,
  generateScaleNotes,
  quantizeToScale,
  SCALE_INTERVALS,
  iso226Weight,
  equalLoudnessCompensation
} from '../src/musical/index.js';

export function testMusical() {
  // Test parseNote
  const c4 = parseNote("C4");
  assertEqual(c4.name, "C", "parseNote('C4') name is C");
  assertEqual(c4.octave, 4, "parseNote('C4') octave is 4");
  assertEqual(c4.midi, 60, "parseNote('C4') MIDI is 60");
  assertClose(c4.frequency, 261.63, 0.1, "parseNote('C4') frequency is ~261.63 Hz");

  const a4 = parseNote("A4");
  assertEqual(a4.midi, 69, "parseNote('A4') MIDI is 69");
  assertClose(a4.frequency, 440.0, 0.001, "parseNote('A4') frequency is 440 Hz");

  const fSharp3 = parseNote("F#3");
  assertEqual(fSharp3.midi, 54, "parseNote('F#3') MIDI is 54");

  const bFlat5 = parseNote("Bb5");
  assertEqual(bFlat5.midi, 82, "parseNote('Bb5') MIDI is 82");

  // Test midiToNote
  const note60 = midiToNote(60);
  assertEqual(note60.note, "C4", "midiToNote(60) gives 'C4'");

  // Test frequencyToMidi and frequencyToNote
  assertEqual(frequencyToNote(440), "A4", "frequencyToNote(440) gives 'A4'");
  assertClose(frequencyToMidi(440), 69, 0.001, "frequencyToMidi(440) gives 69");

  // Test transpose
  assertEqual(transpose("C4", 7), "G4", "transpose('C4', 7) is 'G4'");
  assertEqual(transpose("C4", 12), "C5", "transpose('C4', 12) is 'C5'");
  assertEqual(transpose("C4", -12), "C3", "transpose('C4', -12) is 'C3'");

  // Test scale intervals
  assert(SCALE_INTERVALS.major.length === 7, "Major scale has 7 notes");
  assert(SCALE_INTERVALS.pentatonic.length === 5, "Pentatonic scale has 5 notes");
  assert(SCALE_INTERVALS.blues.length === 6, "Blues scale has 6 notes");

  // Test scale notes generator
  const pentatonicNotes = generateScaleNotes("C4", "C5", "pentatonic", "C");
  const noteNames = pentatonicNotes.map(n => n.note);
  assertEqual(noteNames, ["C4", "D4", "E4", "G4", "A4", "C5"], "C Pentatonic notes between C4 and C5 match expected degrees");

  // Test scale quantization
  const closestToFSharp = quantizeToScale(66, pentatonicNotes); // F#4 (66) -> should quantize to G4 (67) or E4 (64)
  assert(["E4", "G4"].includes(closestToFSharp.note), "Quantizing F#4 into C Pentatonic yields nearest scale note (E4 or G4)");

  // Test ISO 226 / Fletcher-Munson Equal-Loudness
  assertClose(iso226Weight(1000), 0.0, 0.5, "iso226Weight(1000) is ~0 dB");
  assert(iso226Weight(100) < -15, "iso226Weight(100) shows lower human sensitivity (< -15 dB)");
  assert(iso226Weight(3500) > 0, "iso226Weight(3500) shows higher ear canal sensitivity (> 0 dB)");
  assertClose(equalLoudnessCompensation(1000), 1.0, 0.05, "equalLoudnessCompensation(1000) is ~1.0");
  assert(equalLoudnessCompensation(100) > 1.5, "equalLoudnessCompensation(100) boosts sub-bass (> 1.5)");
  assert(equalLoudnessCompensation(3500) < 1.0, "equalLoudnessCompensation(3500) attenuates mid-treble (< 1.0)");
  assert(equalLoudnessCompensation("C2") > equalLoudnessCompensation("C5"), "equalLoudnessCompensation('C2') > 'C5'");
}
