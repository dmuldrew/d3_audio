import { defaultEngine } from './soundEngine.js';

/**
 * Creates and wraps Tone.js synth instruments with unified trigger, panning, and modulation controls.
 */
export class SynthVoice {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);
    this.type = options.type || 'polySynth';
    this.options = options;
    this.instrument = null;
    this.panner = null;
    this.volumeNode = null;
    this.filterNode = null;

    this.init();
  }

  ensureReady() {
    if (!this.Tone && typeof window !== 'undefined' && window.Tone) {
      this.Tone = window.Tone;
    }
    if (!this.instrument && this.Tone) {
      this.init();
    }
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
      const masterIn = this.engine.getMasterInput();

      // Channel routing: Instrument -> Filter -> Panner -> Volume -> Master
      this.volumeNode = new this.Tone.Volume(this.options.volume || 0);
      this.panner = new this.Tone.Panner(this.options.pan || 0);
      this.filterNode = new this.Tone.Filter(this.options.cutoff || 18000, "lowpass");

      this.filterNode.connect(this.panner);
      this.panner.connect(this.volumeNode);
      if (masterIn) {
        this.volumeNode.connect(masterIn);
      } else {
        this.volumeNode.toDestination();
      }

      this.createInstrument();
      this.engine.registerVoice(this);
    } catch (err) {
      console.warn('SynthVoice init fallback:', err);
    }
  }

  createInstrument() {
    const Tone = this.Tone;
    if (!Tone) return;

    try {
      switch (this.type) {
        case 'fmSynth':
          this.instrument = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: this.options.harmonicity || 1.5,
            modulationIndex: this.options.modulationIndex || 3,
            oscillator: { type: this.options.oscillator || "sine" },
            envelope: this.options.envelope || { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
            modulation: { type: "square" }
          });
          break;

        case 'amSynth':
          this.instrument = new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: this.options.harmonicity || 2,
            oscillator: { type: this.options.oscillator || "triangle" },
            envelope: this.options.envelope || { attack: 0.02, decay: 0.3, sustain: 0.5, release: 1.0 }
          });
          break;

        case 'membraneSynth':
          this.instrument = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }
          });
          break;

        case 'noiseSynth':
          this.instrument = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0.0 }
          });
          break;

        case 'pluckSynth':
          this.instrument = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.92
          });
          break;

        case 'polySynth':
        default:
          this.instrument = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: this.options.oscillator || "triangle" },
            envelope: this.options.envelope || {
              attack: 0.02,
              decay: 0.2,
              sustain: 0.4,
              release: 0.8
            }
          });
          break;
      }

      if (this.instrument) {
        if (this.filterNode) {
          this.instrument.connect(this.filterNode);
        } else {
          this.instrument.toDestination();
        }
      }
    } catch (err) {
      console.warn('createInstrument fallback to basic PolySynth:', err);
      if (Tone.PolySynth && Tone.Synth) {
        this.instrument = new Tone.PolySynth(Tone.Synth).toDestination();
      }
    }
  }

  /**
   * Triggers note attack and release.
   */
  triggerAttackRelease(note, duration = "8n", time = undefined, velocity = 0.8, params = {}) {
    this.ensureReady();
    if (!this.instrument) return;

    try {
      if (params.pan !== undefined && this.panner && this.panner.pan) {
        if (typeof this.panner.pan.rampTo === 'function') {
          this.panner.pan.rampTo(Math.max(-1, Math.min(1, params.pan)), 0.02, time);
        } else {
          this.panner.pan.value = Math.max(-1, Math.min(1, params.pan));
        }
      }

      if (params.filter !== undefined && this.filterNode && this.filterNode.frequency) {
        if (typeof this.filterNode.frequency.rampTo === 'function') {
          this.filterNode.frequency.rampTo(params.filter, 0.02, time);
        } else {
          this.filterNode.frequency.value = params.filter;
        }
      }

      const t = time !== undefined ? time : (this.Tone ? this.Tone.now() : undefined);
      const vel = Math.max(0.01, Math.min(1.0, velocity));

      if (this.type === 'noiseSynth') {
        this.instrument.triggerAttackRelease(duration, t, vel);
      } else {
        this.instrument.triggerAttackRelease(note, duration, t, vel);
      }
    } catch (e) {
      // Fallback native Web Audio Oscillator if Tone context failed
      this.playNativeFallback(note, duration, velocity);
    }
  }

  playNativeFallback(note, duration = "8n", velocity = 0.8) {
    try {
      const ctx = this.engine.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Simple frequency estimation
      let freq = 440;
      if (typeof note === 'number') freq = note;
      else if (typeof note === 'string') {
        const midi = 60; // approximate
        freq = 440 * Math.pow(2, (midi - 69) / 12);
      }

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const durSec = typeof duration === 'number' ? duration : 0.3;
      gain.gain.setValueAtTime(velocity * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durSec);
    } catch (err) {
      // Ignore
    }
  }

  triggerAttack(note, time = undefined, velocity = 0.8) {
    this.ensureReady();
    if (!this.instrument) return;
    const t = time !== undefined ? time : (this.Tone ? this.Tone.now() : undefined);
    this.instrument.triggerAttack(note, t, velocity);
  }

  triggerRelease(note = undefined, time = undefined) {
    if (!this.instrument) return;
    const t = time !== undefined ? time : (this.Tone ? this.Tone.now() : undefined);
    if (this.instrument.releaseAll) {
      this.instrument.releaseAll(t);
    } else if (this.instrument.triggerRelease) {
      if (note) this.instrument.triggerRelease(note, t);
      else this.instrument.triggerRelease(t);
    }
  }

  setPan(pan) {
    if (this.panner && this.panner.pan) {
      this.panner.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  setVolume(volDb) {
    if (this.volumeNode && this.volumeNode.volume) {
      this.volumeNode.volume.value = volDb;
    }
  }

  dispose() {
    this.engine.unregisterVoice(this);
    if (this.instrument && this.instrument.dispose) this.instrument.dispose();
    if (this.filterNode && this.filterNode.dispose) this.filterNode.dispose();
    if (this.panner && this.panner.dispose) this.panner.dispose();
    if (this.volumeNode && this.volumeNode.dispose) this.volumeNode.dispose();
  }
}

export function createSynth(options = {}, engine = defaultEngine) {
  return new SynthVoice(options, engine);
}
