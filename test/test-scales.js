import { assert, assertEqual, assertClose } from './run-tests.js';
import {
  scalePitch,
  scaleGain,
  scaleDuration,
  scalePan,
  scaleFilter,
  scaleSample,
  scaleTempo
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
}
