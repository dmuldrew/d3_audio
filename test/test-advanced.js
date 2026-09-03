import { assert, assertEqual, assertClose } from './run-tests.js';
import {
  euclideanRhythm,
  scaleRhythm,
  scaleUncertainty,
  scaleSpatial,
  scaleEcho,
  scaleChord,
  SCALE_INTERVALS,
  generateScaleNotes,
  parseNote,
  midiToNote,
  audioRamp,
  accessibleChart
} from '../src/index.js';

export function testAdvanced() {
  // 1. Euclidean Rhythm Generator & Bjorklund Algorithm
  const tresillo = euclideanRhythm(3, 8);
  assertEqual(tresillo.length, 8, "euclideanRhythm(3, 8) length is 8");
  assertEqual(tresillo.filter(x => x === 1).length, 3, "euclideanRhythm(3, 8) has exactly 3 pulses");
  assertEqual(tresillo[0], 1, "euclideanRhythm starts with active pulse 1");

  const full = euclideanRhythm(8, 8);
  assertEqual(full, [1, 1, 1, 1, 1, 1, 1, 1], "euclideanRhythm(8, 8) is all 1s");

  const zero = euclideanRhythm(0, 8);
  assertEqual(zero, [0, 0, 0, 0, 0, 0, 0, 0], "euclideanRhythm(0, 8) is all 0s");

  const rScaler = scaleRhythm().domain([0, 100]).steps(16).range([1, 16]);
  const rMin = rScaler(0);
  assertEqual(rMin.pulses, 1, "scaleRhythm(0) gives 1 pulse");
  assertEqual(rMin.steps, 16, "scaleRhythm steps is 16");

  const rMax = rScaler(100);
  assertEqual(rMax.pulses, 16, "scaleRhythm(100) gives 16 pulses");
  assertEqual(rMax.density, 1.0, "scaleRhythm(100) density is 1.0");

  const rMid = rScaler(50);
  assert(rMid.pulses >= 8 && rMid.pulses <= 9, "scaleRhythm(50) gives ~8-9 pulses");
  assert(rMid.events.length >= 8, "scaleRhythm creates timeline events array");

  // 2. Statistical Uncertainty Scaler (scaleUncertainty / scaleCrush)
  const uScaler = scaleUncertainty().domain([0, 1]);
  const uMin = uScaler(0);
  assertEqual(uMin.bits, 16, "scaleUncertainty(0) bits is 16 (pristine)");
  assertEqual(uMin.wet, 0, "scaleUncertainty(0) wet is 0");
  assertEqual(uMin.label, "Pristine", "scaleUncertainty(0) label is Pristine");

  const uMax = uScaler(1);
  assertEqual(uMax.bits, 2, "scaleUncertainty(1) bits is 2 (crushed)");
  assertEqual(uMax.wet, 1, "scaleUncertainty(1) wet is 1");
  assertEqual(uMax.grit, 1, "scaleUncertainty(1) grit is 1");

  const uMid = uScaler(0.5);
  assertEqual(uMid.bits, 9, "scaleUncertainty(0.5) bits is 9");

  // 3. Spatial Depth & Reverb Scaler (scaleSpatial)
  const sScaler = scaleSpatial().domain([0, 100]);
  const sNear = sScaler(0);
  assertEqual(sNear.wet, 0.05, "scaleSpatial(0) wet is 0.05 (dry)");
  assertEqual(sNear.decay, 0.4, "scaleSpatial(0) decay is 0.4s");

  const sFar = sScaler(100);
  assertEqual(sFar.wet, 0.95, "scaleSpatial(100) wet is 0.95 (cavernous)");
  assertEqual(sFar.decay, 7.0, "scaleSpatial(100) decay is 7.0s");

  // 4. Latency / Moving Window Scaler (scaleEcho)
  const eScaler = scaleEcho().domain([0, 1000]);
  const eFast = eScaler(0);
  assertEqual(eFast.delayTime, 0.06, "scaleEcho(0) delayTime is 0.06s");
  assertEqual(eFast.feedback, 0.1, "scaleEcho(0) feedback is 0.1");

  const eSlow = eScaler(1000);
  assertEqual(eSlow.delayTime, 0.65, "scaleEcho(1000) delayTime is 0.65s");
  assertEqual(eSlow.feedback, 0.7, "scaleEcho(1000) feedback is 0.7");

  // 5. Multivariate Chord Scaler (scaleChord)
  const cScaler = scaleChord();
  const cMaj = cScaler("C3");
  assertEqual(cMaj.notes, ["C3", "E3", "G3"], "scaleChord('C3') gives C3-E3-G3 major triad");

  const aMin7 = cScaler({ root: "A2", quality: "min7" });
  assertEqual(aMin7.notes, ["A2", "C3", "E3", "G3"], "scaleChord({ root: 'A2', quality: 'min7' }) gives A2-C3-E3-G3");

  const cSus4 = cScaler({ root: "D3", quality: "sus4" });
  assertEqual(cSus4.notes, ["D3", "G3", "A3"], "scaleChord({ root: 'D3', quality: 'sus4' }) gives D3-G3-A3");

  // 6. Non-Western Scales & Microtonality
  assert(Boolean(SCALE_INTERVALS.maqamBayati), "SCALE_INTERVALS.maqamBayati exists");
  assertEqual(SCALE_INTERVALS.maqamBayati[1], 1.5, "Maqam Bayati 2nd degree is quarter-tone (1.5 semitones)");
  assert(Boolean(SCALE_INTERVALS.ragaBhairav), "SCALE_INTERVALS.ragaBhairav exists");
  assertEqual(SCALE_INTERVALS.ragaBhairav[1], 1, "Raga Bhairav Komal Re is 1 semitone");

  const parsedQuarter = parseNote("E~4");
  assertEqual(parsedQuarter.midi, 63.5, "parseNote('E~4') MIDI is 63.5");
  assertClose(parsedQuarter.frequency, 320.24, 0.5, "parseNote('E~4') frequency is ~320.24 Hz");

  const microNote = midiToNote(63.5);
  assertEqual(microNote.cents, -50, "midiToNote(63.5) cents is -50");

  const bayatiNotes = generateScaleNotes("D3", "D4", "maqamBayati", "D");
  assert(bayatiNotes.length >= 7, "generateScaleNotes generated full Maqam Bayati octave");

  // 7. Audio Ramp / Transition Bridge
  const mockParam = { value: 200, rampTo: (val, dur) => { mockParam.value = val; } };
  audioRamp(mockParam, 880, { duration: 0.5 });
  assertEqual(mockParam.value, 880, "audioRamp successfully ramped mock param to 880");

  // 8. Accessible Chart Sonifier
  const a11y = accessibleChart({ data: [10, 20, 30] });
  assert(typeof a11y === 'function', "accessibleChart returns a function");
  assertEqual(a11y.data(), [10, 20, 30], "accessibleChart.data() holds input data");
}
