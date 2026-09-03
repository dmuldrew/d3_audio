/**
 * SoundEngine: Audio context lifecycle manager, master effects chain, and routing bus.
 */
export class SoundEngine {
  constructor(toneInstance = null) {
    this.Tone = toneInstance || (typeof window !== 'undefined' ? window.Tone : null);
    this.isReady = false;
    this.masterGain = null;
    this.masterFilter = null;
    this.reverb = null;
    this.delay = null;
    this.limiter = null;
    this.voices = new Set();
  }

  /**
   * Sets Tone.js instance if imported or injected dynamically.
   */
  setTone(tone) {
    this.Tone = tone;
  }

  /**
   * Initializes Web Audio context on user gesture.
   */
  async start() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        console.warn('Tone.js not found. Please load Tone.js before starting SoundEngine.');
        return false;
      }
    }

    try {
      await this.Tone.start();
      if (!this.isReady) {
        this.initMasterChain();
        this.isReady = true;
      }
      return true;
    } catch (e) {
      console.error('Failed to start Tone.js audio context:', e);
      return false;
    }
  }

  initMasterChain() {
    if (!this.Tone) return;

    // Master Limiter to prevent clipping
    this.limiter = new this.Tone.Limiter(-0.5).toDestination();

    // Master Volume / Gain
    this.masterGain = new this.Tone.Gain(0.85).connect(this.limiter);

    // Master Filter (dynamic lowpass / highpass)
    this.masterFilter = new this.Tone.Filter({
      frequency: 20000,
      type: "lowpass",
      rolloff: -12
    }).connect(this.masterGain);

    // Master Reverb (Send/Return)
    this.reverb = new this.Tone.Reverb({
      decay: 2.2,
      preDelay: 0.01,
      wet: 0.15
    }).connect(this.masterGain);

    // Master Delay (Send/Return)
    this.delay = new this.Tone.FeedbackDelay({
      delayTime: "8n.",
      feedback: 0.25,
      wet: 0.1
    }).connect(this.masterGain);
  }

  /**
   * Returns master input node for voices to connect to.
   */
  getMasterInput() {
    if (!this.isReady) this.initMasterChain();
    return this.masterFilter || this.Tone.getDestination();
  }

  /**
   * Adjusts master volume in dB or linear gain.
   */
  setVolume(val, isDb = false) {
    if (!this.masterGain) return;
    if (isDb) {
      this.masterGain.gain.rampTo(this.Tone.dbToGain(val), 0.05);
    } else {
      this.masterGain.gain.rampTo(Math.max(0, Math.min(1, val)), 0.05);
    }
  }

  /**
   * Adjusts master filter frequency (Hz).
   */
  setFilter(freq, q = 1) {
    if (!this.masterFilter) return;
    this.masterFilter.frequency.rampTo(freq, 0.05);
    this.masterFilter.Q.value = q;
  }

  /**
   * Adjusts reverb wet/dry mix [0, 1].
   */
  setReverb(wet) {
    if (!this.reverb) return;
    this.reverb.wet.rampTo(Math.max(0, Math.min(1, wet)), 0.05);
  }

  /**
   * Registers a synth voice for lifecycle management.
   */
  registerVoice(voice) {
    this.voices.add(voice);
  }

  unregisterVoice(voice) {
    this.voices.delete(voice);
  }

  /**
   * Mutes or stops all currently sounding voices.
   */
  stopAll() {
    this.voices.forEach(voice => {
      if (voice && typeof voice.releaseAll === 'function') {
        voice.releaseAll();
      } else if (voice && typeof voice.triggerRelease === 'function') {
        voice.triggerRelease();
      }
    });
  }

  dispose() {
    this.stopAll();
    if (this.masterGain) this.masterGain.dispose();
    if (this.masterFilter) this.masterFilter.dispose();
    if (this.reverb) this.reverb.dispose();
    if (this.delay) this.delay.dispose();
    if (this.limiter) this.limiter.dispose();
    this.isReady = false;
  }
}

export const defaultEngine = new SoundEngine();
