import { assert, assertEqual, assertClose } from './run-tests.js';
import {
  scalePitch,
  scaleGain,
  scaleDuration,
  scalePan,
  scaleFilter,
  scaleSample,
  scaleTempo,
  scaleTension
} from '../src/scales/index.js';

export function testScales() {
  // 1. scalePitch
  const pitch = scalePitch()
    .domain([0, 100])
    .range(["C4", "C5"])
    .scale("pentatonic")
    .root("C");

  assertEqual(pitch(0), "C4", "scalePitch(0) gives C4");
  assertEqual(pitch(100), "C5", "scalePitch(100) gives C5");
  assertClose(pitch.frequency(0), 261.63, 0.5, "scalePitch.frequency(0) is ~261.63 Hz");
  assertEqual(pitch.midi(100), 72, "scalePitch.midi(100) is 72");

  // Test categorical domain for scalePitch
  const catPitch = scalePitch()
    .domain(["low", "med", "high"])
    .range(["C3", "C5"])
    .scale("major");
  assertEqual(catPitch("low"), "C3", "Categorical pitch 'low' gives C3");
  assertEqual(catPitch("high"), "C5", "Categorical pitch 'high' gives C5");

  // 2. scaleGain
  const gain = scaleGain()
    .domain([0, 100])
    .range([0.2, 1.0])
    .curve("linear");

  assertEqual(gain(0), 0.2, "scaleGain(0) is 0.2");
  assertEqual(gain(100), 1.0, "scaleGain(100) is 1.0");
  assertClose(gain(50), 0.6, 0.001, "scaleGain(50) is 0.6");
  assertClose(gain.db(100), 0.0, 0.01, "scaleGain.db(100) is 0 dB");

  // 3. scaleDuration
  const dur = scaleDuration()
    .domain([0, 10])
    .range(["16n", "1m"])
    .quantize(true);

  assertEqual(dur(0), "16n", "scaleDuration(0) is 16n");
  assertEqual(dur(10), "1m", "scaleDuration(10) is 1m");
  assert(typeof dur.seconds(5) === 'number', "scaleDuration.seconds() returns numeric seconds");

  // 4. scalePan
  const pan = scalePan()
    .domain([0, 800])
    .range([-1, 1]);

  assertEqual(pan(0), -1, "scalePan(0) is -1 (Full Left)");
  assertEqual(pan(400), 0, "scalePan(400) is 0 (Center)");
  assertEqual(pan(800), 1, "scalePan(800) is 1 (Full Right)");

  // 5. scaleFilter
  const filter = scaleFilter()
    .domain([0, 100])
    .range([200, 10000])
    .type("linear");

  assertEqual(filter(0), 200, "scaleFilter(0) is 200 Hz");
  assertEqual(filter(100), 10000, "scaleFilter(100) is 10000 Hz");

  // 6. scaleSample
  const sample = scaleSample()
    .domain(["crit", "warn", "info"])
    .range(["crash", "snare", "hihat"]);

  assertEqual(sample("crit"), "crash", "scaleSample('crit') is 'crash'");
  assertEqual(sample("warn"), "snare", "scaleSample('warn') is 'snare'");
  assertEqual(sample("info"), "hihat", "scaleSample('info') is 'hihat'");

  // 7. scaleTempo
  const tempo = scaleTempo()
    .domain([0, 100])
    .range([60, 160]);

  assertEqual(tempo(0), 60, "scaleTempo(0) is 60 BPM");
  assertEqual(tempo(100), 160, "scaleTempo(100) is 160 BPM");
  assertEqual(tempo(50), 110, "scaleTempo(50) is 110 BPM");

  // 8. scaleTension
  const tension = scaleTension()
    .domain([0, 100])
    .tempoRange([1.0, 2.0])
    .filterRange([500, 5000]);

  const t0 = tension(0);
  assertEqual(t0.normalized, 0, "scaleTension(0) normalized is 0");
  assertEqual(t0.tier, "consonant", "scaleTension(0) tier is consonant");
  assertEqual(t0.tempoMultiplier, 1.0, "scaleTension(0) tempo is 1.0");

  const t100 = tension(100);
  assertEqual(t100.normalized, 1, "scaleTension(100) normalized is 1");
  assertEqual(t100.tier, "dissonant", "scaleTension(100) tier is dissonant");
  assertEqual(t100.isDissonant, true, "scaleTension(100) isDissonant is true");
  assertEqual(t100.tempoMultiplier, 2.0, "scaleTension(100) tempo is 2.0");
  assert(Array.isArray(t100.chord), "scaleTension(100) chord is an array");

  // 9. scalePitch ISO 226 equalLoudness
  const eqPitch = scalePitch()
    .domain([0, 100])
    .range(["C2", "C6"]);

  assertEqual(eqPitch.equalLoudness(), false, "scalePitch equalLoudness defaults to false");
  assertEqual(eqPitch.gain(0), 1.0, "scalePitch.gain() returns 1.0 when equalLoudness is false");
  eqPitch.equalLoudness(true);
  assertEqual(eqPitch.equalLoudness(), true, "scalePitch.equalLoudness(true) enables normalization");
  assert(eqPitch.gain(0) > eqPitch.gain(100), "scalePitch.gain(0) (C2 bass) > scalePitch.gain(100) (C6 treble)");
  const ticks = eqPitch.ticks(3);
  assert(ticks[0].gain !== undefined, "scalePitch.ticks() includes equal-loudness gain property");

  // 10. scaleGain ISO 226 equalLoudness
  const eqGain = scaleGain()
    .domain([0, 100])
    .range([0.1, 0.9]);

  assertEqual(eqGain.equalLoudness(), false, "scaleGain equalLoudness defaults to false");
  assertEqual(eqGain(50, "C2"), eqGain(50), "scaleGain ignores frequency argument when equalLoudness is false");
  eqGain.equalLoudness(true);
  assertEqual(eqGain.equalLoudness(), true, "scaleGain.equalLoudness(true) enables normalization");
  assert(eqGain(50, "C2") > eqGain(50, "C5"), "scaleGain(50, 'C2') boosts bass gain relative to 'C5'");
  assert(eqGain(50, 3500) < eqGain(50, 1000), "scaleGain(50, 3500) attenuates sensitive mid-treble relative to 1000 Hz");
  assert(eqGain.compensate(0.5, "C2") > 0.5, "scaleGain.compensate(0.5, 'C2') returns boosted gain");
}
