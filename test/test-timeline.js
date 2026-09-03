import { assert, assertEqual } from './run-tests.js';
import { Timeline, timeline, Track } from '../src/timeline/index.js';

export function testTimeline() {
  // 1. Create Timeline instance
  const tl = timeline({ bpm: 130, loop: true, loopEnd: "2m" });
  assertEqual(tl.bpm(), 130, "Timeline initialized with 130 BPM");
  assertEqual(tl.loop(), true, "Timeline loop is true");
  assertEqual(tl.loopEnd(), "2m", "Timeline loopEnd is 2m");

  // 2. Data binding on default track
  const sampleData = [
    { time: 0.0, pitch: "C4", val: 10 },
    { time: 0.5, pitch: "E4", val: 20 },
    { time: 1.0, pitch: "G4", val: 30 }
  ];

  tl.data(sampleData)
    .time(d => d.time)
    .pitch(d => d.pitch)
    .gain(d => d.val / 30);

  assertEqual(tl.data().length, 3, "Timeline default track holds 3 data points");

  const builtEvents = tl.defaultTrack.buildEvents(130);
  assertEqual(builtEvents.length, 3, "Built 3 scheduled events");
  assertEqual(builtEvents[0].pitch, "C4", "First event pitch is C4");
  assertEqual(builtEvents[1].pitch, "E4", "Second event pitch is E4");
  assertEqual(builtEvents[2].pitch, "G4", "Third event pitch is G4");
  assertEqual(builtEvents[2].gain, 1.0, "Third event gain is 1.0");

  // 3. Multi-track creation
  const drumTrack = tl.track("drums", { type: "sample" });
  drumTrack.data([
    { time: 0, sample: "kick" },
    { time: 0.5, sample: "snare" },
    { time: 1.0, sample: "kick" }
  ]).time(d => d.time).sample(d => d.sample);

  assert(tl.tracks.has("drums"), "Timeline created 'drums' track");
  assertEqual(drumTrack.data().length, 3, "Drums track holds 3 events");
}
