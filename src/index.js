// Scales
export { scalePitch } from './scales/scalePitch.js';
export { scaleGain } from './scales/scaleGain.js';
export { scaleDuration, SUBDIVISIONS } from './scales/scaleDuration.js';
export { scalePan } from './scales/scalePan.js';
export { scaleFilter } from './scales/scaleFilter.js';
export { scaleSample } from './scales/scaleSample.js';
export { scaleTempo } from './scales/scaleTempo.js';
export { scaleTension } from './scales/scaleTension.js';
export { scaleUncertainty, scaleCrush } from './scales/scaleUncertainty.js';
export { scaleSpatial, scaleReverb } from './scales/scaleSpatial.js';
export { scaleEcho, scaleDelay } from './scales/scaleEcho.js';
export { scaleChord, scaleHarmony } from './scales/scaleChord.js';
export { scaleRhythm, euclideanRhythm } from './scales/scaleRhythm.js';

// UI & Presentation
export { audioLegend } from './ui/audioLegend.js';
export { accessibleChart } from './ui/accessibleChart.js';

// Timeline & Tracks
export { Timeline, timeline } from './timeline/timeline.js';
export { Track } from './timeline/track.js';

// Movements & Choreography
export {
  choreography,
  PRESETS,
  adsrEnvelope,
  dampedOscillation,
  easings,
  wiggle,
  flip,
  pulse,
  bounce,
  shake,
  ripple,
  glow,
  squash,
  audioTransition,
  audioRamp
} from './movements/index.js';

// Audio & Synthesis
export {
  SoundEngine,
  defaultEngine,
  SynthVoice,
  createSynth,
  SamplePlayer,
  createSamplePlayer,
  GranularScrubber,
  createGranularScrubber
} from './audio/index.js';

// Musical Theory
export {
  parseNote,
  midiToNote,
  midiToFrequency,
  frequencyToMidi,
  frequencyToNote,
  transpose,
  frequencyToCents,
  generateScaleNotes,
  quantizeToScale,
  SCALE_INTERVALS,
  equalLoudnessCompensation,
  iso226Weight
} from './musical/index.js';

// Import all to build a bundled namespace object
import * as d3AudioNamespace from './index.js';

// Attach to window and d3 if present in browser environment
if (typeof window !== 'undefined') {
  window.d3Audio = d3AudioNamespace;

  if (window.d3) {
    window.d3.audio = d3AudioNamespace;
    window.d3.scalePitch = d3AudioNamespace.scalePitch;
    window.d3.scaleGain = d3AudioNamespace.scaleGain;
    window.d3.scaleDuration = d3AudioNamespace.scaleDuration;
    window.d3.scalePan = d3AudioNamespace.scalePan;
    window.d3.scaleFilter = d3AudioNamespace.scaleFilter;
    window.d3.scaleSample = d3AudioNamespace.scaleSample;
    window.d3.scaleTempo = d3AudioNamespace.scaleTempo;
    window.d3.scaleTension = d3AudioNamespace.scaleTension;
    window.d3.scaleUncertainty = d3AudioNamespace.scaleUncertainty;
    window.d3.scaleSpatial = d3AudioNamespace.scaleSpatial;
    window.d3.scaleEcho = d3AudioNamespace.scaleEcho;
    window.d3.scaleChord = d3AudioNamespace.scaleChord;
    window.d3.scaleRhythm = d3AudioNamespace.scaleRhythm;
    window.d3.accessibleChart = d3AudioNamespace.accessibleChart;
    window.d3.audioLegend = d3AudioNamespace.audioLegend;
    window.d3.choreography = d3AudioNamespace.choreography;
    window.d3.timeline = d3AudioNamespace.timeline;
  }
}

export default d3AudioNamespace;

