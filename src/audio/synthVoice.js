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

  init() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        return;
      }
    }

    const masterIn = this.engine.getMasterInput();

    // Channel routing: Instrument -> Filter -> Panner -> Volume -> Master
    this.volumeNode = new this.Tone.Volume(this.options.volume || 0);
    this.panner = new this.Tone.Panner(this.options.pan || 0);
    this.filterNode = new this.Tone.Filter(this.options.cutoff || 18000, "lowpass");

    this.filterNode.connect(this.panner);
    this.panner.connect(this.volumeNode);
    this.volumeNode.connect(masterIn);

    // Optional Reverb Send
    if (this.engine.reverb && this.options.reverbSend) {
      const send = new this.Tone.Gain(this.options.reverbSend);
      this.panner.connect(send);
      send.connect(this.engine.reverb);
    }

    this.createInstrument();
    this.engine.registerVoice(this);
  }

  createInstrument() {
    const Tone = this.Tone;
    if (!Tone) return;

    switch (this.type) {
      case 'fmSynth':
        this.instrument = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: this.options.harmonicity || 1.5,
          modulationIndex: this.options.modulationIndex || 3,
          oscillator: { type: this.options.oscillator || "sine" },
          envelope: this.options.envelope || { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.8 },
          modulation: { type: "square" }
        }).connect(this.filterNode);
        break;

      case 'amSynth':
        this.instrument = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: this.options.harmonicity || 2,
          oscillator: { type: this.options.oscillator || "triangle" },
          envelope: this.options.envelope || { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.0 }
        }).connect(this.filterNode);
        break;

      case 'membraneSynth':
        this.instrument = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 4,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }
        }).connect(this.filterNode);
        break;

      case 'noiseSynth':
        this.instrument = new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.005, decay: 0.15, sustain: 0.0 }
        }).connect(this.filterNode);
        break;

      case 'pluckSynth':
        this.instrument = new Tone.PluckSynth({
          attackNoise: 1,
          dampening: 4000,
          resonance: 0.92
        }).connect(this.filterNode);
        break;

      case 'duoSynth':
        this.instrument = new Tone.PolySynth(Tone.DuoSynth, {
          vibratoAmount: 0.2,
          vibratoRate: 5,
          harmonicity: 1.5
        }).connect(this.filterNode);
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
        }).connect(this.filterNode);
        break;
    }
  }

  /**
   * Triggers note attack and release.
   * @param {string|number} note Musical pitch string (e.g. "C4") or frequency in Hz
   * @param {string|number} duration Duration e.g. "8n" or seconds
   * @param {number} time Exact audio context timestamp (scheduled by Tone.Transport)
   * @param {number} velocity Velocity/gain [0, 1]
   * @param {object} params Optional per-note overrides { pan, filter }
   */
  triggerAttackRelease(note, duration = "8n", time = undefined, velocity = 0.8, params = {}) {
    if (!this.instrument) this.init();
    if (!this.instrument) return;

    // Apply per-event pan or filter if provided
    if (params.pan !== undefined && this.panner) {
      if (time !== undefined) {
        this.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), time);
      } else {
        this.panner.pan.value = Math.max(-1, Math.min(1, params.pan));
      }
    }

    if (params.filter !== undefined && this.filterNode) {
      if (time !== undefined) {
        this.filterNode.frequency.setValueAtTime(params.filter, time);
      } else {
        this.filterNode.frequency.value = params.filter;
      }
    }

    const t = time !== undefined ? time : this.Tone.now();
    const vel = Math.max(0.01, Math.min(1.0, velocity));

    if (this.type === 'noiseSynth') {
      this.instrument.triggerAttackRelease(duration, t, vel);
    } else {
      this.instrument.triggerAttackRelease(note, duration, t, vel);
    }
  }

  triggerAttack(note, time = undefined, velocity = 0.8) {
    if (!this.instrument) this.init();
    if (!this.instrument) return;
    const t = time !== undefined ? time : this.Tone.now();
    this.instrument.triggerAttack(note, t, velocity);
  }

  triggerRelease(note = undefined, time = undefined) {
    if (!this.instrument) return;
    const t = time !== undefined ? time : this.Tone.now();
    if (this.instrument.releaseAll) {
      this.instrument.releaseAll(t);
    } else if (this.instrument.triggerRelease) {
      if (note) this.instrument.triggerRelease(note, t);
      else this.instrument.triggerRelease(t);
    }
  }

  setPan(pan) {
    if (this.panner) {
      this.panner.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  setVolume(volDb) {
    if (this.volumeNode) {
      this.volumeNode.volume.value = volDb;
    }
  }

  dispose() {
    this.engine.unregisterVoice(this);
    if (this.instrument) this.instrument.dispose();
    if (this.filterNode) this.filterNode.dispose();
    if (this.panner) this.panner.dispose();
    if (this.volumeNode) this.volumeNode.dispose();
  }
}

/**
 * Factory function for synth voices.
 */
export function createSynth(options = {}, engine = defaultEngine) {
  return new SynthVoice(options, engine);
}
