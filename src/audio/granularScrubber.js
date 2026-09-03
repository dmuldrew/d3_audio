import { defaultEngine } from './soundEngine.js';

/**
 * GranularScrubber: High-performance audio scrubber utilizing Tone.GrainPlayer.
 * Allows click-free, pitch-stable micro-grain scrubbing across time series,
 * audio files, or synthesized telemetry waveforms.
 */
export class GranularScrubber {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);
    this.options = options;
    this.grainPlayer = null;
    this.buffer = null;
    this.isPlaying = false;
    this.currentPosition = 0; // 0 to 1

    this.init();
  }

  init() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        return;
      }
    }

    try {
      const Tone = this.Tone;
      // If a URL was provided, load it; otherwise create synthetic continuous harmonic buffer
      if (this.options.url) {
        this.grainPlayer = new Tone.GrainPlayer({
          url: this.options.url,
          grainSize: this.options.grainSize || 0.05,
          overlap: this.options.overlap || 0.02,
          loop: true,
          playbackRate: this.options.playbackRate || 1.0
        }).toDestination();
      } else {
        // Generate a 4-second synthetic multi-harmonic rich soundscape buffer
        const rawCtx = Tone.context.rawContext;
        if (rawCtx) {
          const sampleRate = rawCtx.sampleRate || 44100;
          const length = sampleRate * 4;
          const audioBuffer = rawCtx.createBuffer(2, length, sampleRate);

          for (let ch = 0; ch < 2; ch++) {
            const data = audioBuffer.getChannelData(ch);
            for (let i = 0; i < length; i++) {
              const t = i / sampleRate;
              // Evolving harmonic frequency sweep from 130 Hz (C3) to 523 Hz (C5)
              const f = 130 + (i / length) * 393;
              const s1 = Math.sin(2 * Math.PI * f * t);
              const s2 = 0.5 * Math.sin(2 * Math.PI * (f * 1.5) * t + (ch * 0.2));
              const s3 = 0.25 * Math.sin(2 * Math.PI * (f * 2.0) * t);
              data[i] = (s1 + s2 + s3) * 0.25;
            }
          }

          this.buffer = new Tone.ToneAudioBuffer(audioBuffer);
          this.grainPlayer = new Tone.GrainPlayer({
            buffer: this.buffer,
            grainSize: this.options.grainSize || 0.05,
            overlap: this.options.overlap || 0.02,
            loop: true,
            playbackRate: this.options.playbackRate || 1.0
          }).toDestination();
        }
      }
    } catch (err) {
      console.warn('GranularScrubber init fallback:', err);
    }
  }

  /**
   * Scrub to a normalized position between 0.0 and 1.0.
   * @param {number} position 0 to 1
   */
  scrub(position) {
    this.currentPosition = Math.max(0, Math.min(1, position));
    if (this.grainPlayer && this.grainPlayer.buffer) {
      const dur = this.grainPlayer.buffer.duration;
      if (dur > 0) {
        const offset = this.currentPosition * dur;
        try {
          // Modulate scrub playback offset without pitch shifts
          this.grainPlayer.scrubOffset = offset;
        } catch (_) {}
      }
    }
    return this;
  }

  start() {
    if (this.grainPlayer && !this.isPlaying) {
      try {
        this.grainPlayer.start();
        this.isPlaying = true;
      } catch (_) {}
    }
    return this;
  }

  stop() {
    if (this.grainPlayer && this.isPlaying) {
      try {
        this.grainPlayer.stop();
        this.isPlaying = false;
      } catch (_) {}
    }
    return this;
  }
}

export function createGranularScrubber(options, engine) {
  return new GranularScrubber(options, engine);
}
