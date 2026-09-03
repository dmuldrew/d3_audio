import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Concrete source files only (omit index.js re-export files)
const sourceFiles = [
  'src/musical/notes.js',
  'src/musical/scales.js',
  'src/scales/scalePitch.js',
  'src/scales/scaleGain.js',
  'src/scales/scaleDuration.js',
  'src/scales/scalePan.js',
  'src/scales/scaleFilter.js',
  'src/scales/scaleSample.js',
  'src/scales/scaleTempo.js',
  'src/scales/scaleTension.js',
  'src/ui/audioLegend.js',
  'src/movements/motionEnvelope.js',
  'src/movements/presets/wiggle.js',
  'src/movements/presets/flip.js',
  'src/movements/presets/pulse.js',
  'src/movements/presets/bounce.js',
  'src/movements/presets/shake.js',
  'src/movements/presets/ripple.js',
  'src/movements/presets/glow.js',
  'src/movements/presets/squash.js',
  'src/movements/choreography.js',
  'src/audio/soundEngine.js',
  'src/audio/synthVoice.js',
  'src/audio/samplePlayer.js',
  'src/timeline/track.js',
  'src/timeline/timeline.js'
];

console.log('Building d3-audio bundle...');

function cleanFileContent(code) {
  return code
    // Remove multi-line and single-line import statements
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/import\s+['"][^'"]+['"];?\n?/g, '')
    // Replace export keywords
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+class\s+/g, 'class ')
    .replace(/export\s+default\s+[^;]+;\n?/g, '')
    .replace(/export\s+\{[\s\S]*?\};?\n?/g, '')
    .replace(/export\s+\*\s+from\s+['"][^'"]+['"];?\n?/g, '');
}

const concatenatedCode = sourceFiles.map(f => {
  const code = fs.readFileSync(path.join(rootDir, f), 'utf-8');
  return `// --- ${f} ---\n` + cleanFileContent(code);
}).join('\n\n');

// Create standalone UMD / Browser bundle
const bundleContent = `
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

${concatenatedCode}

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
`;

// Validate JS syntax before writing
try {
  new Function(bundleContent);
  console.log('✓ Bundle syntax verified successfully!');
} catch (err) {
  console.error('Bundle syntax validation error:', err);
  process.exit(1);
}

fs.writeFileSync(path.join(distDir, 'd3-audio.js'), bundleContent);
console.log('✓ Created dist/d3-audio.js');

// Simple minified version
const minified = bundleContent
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/\n\s*\n/g, '\n');

fs.writeFileSync(path.join(distDir, 'd3-audio.min.js'), minified);
console.log('✓ Created dist/d3-audio.min.js');
