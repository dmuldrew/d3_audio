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
    this.rawAudioCtx = null;
  }

  /**
   * Sets Tone.js instance if imported or injected dynamically.
   */
  setTone(tone) {
    this.Tone = tone;
  }

  getAudioContext() {
    if (this.Tone && this.Tone.context && this.Tone.context.rawContext) {
      return this.Tone.context.rawContext;
    }
    if (typeof window !== 'undefined') {
      if (!this.rawAudioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          this.rawAudioCtx = new AudioCtxClass();
        }
      }
      return this.rawAudioCtx;
    }
    return null;
  }

  /**
   * Unlocks iOS Web Audio hardware pipelines by playing a silent 1-sample buffer synchronously.
   */
  unlockIOS(rawCtx) {
    if (!rawCtx) return;
    try {
      if (rawCtx.state === 'suspended' && typeof rawCtx.resume === 'function') {
        rawCtx.resume();
      }
      if (typeof rawCtx.createBuffer === 'function') {
        const buffer = rawCtx.createBuffer(1, 1, 22050);
        const source = rawCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(rawCtx.destination);
        source.start(0);
      }
    } catch (e) {
      // Non-fatal fallback
    }
  }

  /**
   * Unlocks iPhone hardware Silent/Mute switch by elevating audio session to Playback via HTML5 Audio.
   */
  unlockIOSAudioSession() {
    if (typeof document === 'undefined') return;
    try {
      const isIOS = typeof navigator !== 'undefined' && 
        (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      if (isIOS) {
        const audio = document.createElement('audio');
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        audio.volume = 0.01;
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            setTimeout(() => {
              audio.pause();
              audio.remove();
            }, 60);
          }).catch(() => {});
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }

  /**
   * Initializes Web Audio context on user gesture with iOS resilience.
   */
  async start() {
    if (!this.Tone && typeof window !== 'undefined' && window.Tone) {
      this.Tone = window.Tone;
    }

    // 1. Immediately trigger iOS synchronous unlocking
    const rawCtx = this.getAudioContext();
    this.unlockIOS(rawCtx);
    this.unlockIOSAudioSession();

    try {
      if (this.Tone && typeof this.Tone.start === 'function') {
        await this.Tone.start();
        if (this.Tone.context && typeof this.Tone.context.resume === 'function') {
          await this.Tone.context.resume();
        }
      }

      if (rawCtx && rawCtx.state === 'suspended') {
        await rawCtx.resume();
      }

      // 2. Prevent mobile WebKit audio buffer underruns
      if (this.Tone && this.Tone.context) {
        const isIOS = typeof navigator !== 'undefined' && 
          (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
        if (isIOS && this.Tone.context.lookAhead < 0.06) {
          this.Tone.context.lookAhead = 0.08;
        }
      }

      if (!this.isReady && this.Tone) {
        this.initMasterChain();
        this.isReady = true;
      }
      return true;
    } catch (e) {
      console.warn('AudioContext start notice:', e);
      return false;
    }
  }

  initMasterChain() {
    if (!this.Tone) return;

    try {
      // 1. Master Volume connected to Destination
      this.masterGain = new this.Tone.Gain(0.9).toDestination();

      // 2. Master Filter connected to Master Gain
      this.masterFilter = new this.Tone.Filter({
        frequency: 20000,
        type: "lowpass",
        rolloff: -12
      }).connect(this.masterGain);

      // 3. Reverb (Send/Return) using Freeverb / JCReverb (100% synchronous, immediate)
      if (this.Tone.Freeverb) {
        this.reverb = new this.Tone.Freeverb({
          roomSize: 0.65,
          dampening: 3500,
          wet: 0.12
        }).connect(this.masterGain);
      } else if (this.Tone.JCReverb) {
        this.reverb = new this.Tone.JCReverb({
          roomSize: 0.5,
          wet: 0.12
        }).connect(this.masterGain);
      }

      // 4. Delay (Send/Return)
      if (this.Tone.FeedbackDelay) {
        this.delay = new this.Tone.FeedbackDelay({
          delayTime: "8n.",
          feedback: 0.2,
          wet: 0.1
        }).connect(this.masterGain);
      }
    } catch (err) {
      console.warn('Master chain initialized with fallback to Destination:', err);
      if (this.Tone.getDestination) {
        this.masterGain = this.Tone.getDestination();
        this.masterFilter = this.masterGain;
      }
    }
  }

  /**
   * Returns master input node for voices to connect to.
   */
  getMasterInput() {
    if (!this.masterGain || !this.masterFilter) {
      this.initMasterChain();
    }
    return this.masterFilter || this.masterGain || (this.Tone ? this.Tone.getDestination() : null);
  }

  /**
   * Adjusts master volume in dB or linear gain.
   */
  setVolume(val, isDb = false) {
    if (!this.masterGain) return;
    if (this.masterGain.gain && typeof this.masterGain.gain.rampTo === 'function') {
      const gainVal = isDb && this.Tone ? this.Tone.dbToGain(val) : Math.max(0, Math.min(1, val));
      this.masterGain.gain.rampTo(gainVal, 0.05);
    }
  }

  /**
   * Adjusts master filter frequency (Hz).
   */
  setFilter(freq, q = 1) {
    if (!this.masterFilter) return;
    if (this.masterFilter.frequency && typeof this.masterFilter.frequency.rampTo === 'function') {
      this.masterFilter.frequency.rampTo(freq, 0.05);
      if (this.masterFilter.Q) this.masterFilter.Q.value = q;
    }
  }

  /**
   * Adjusts reverb wet/dry mix [0, 1].
   */
  setReverb(wet) {
    if (!this.reverb) return;
    if (this.reverb.wet && typeof this.reverb.wet.rampTo === 'function') {
      this.reverb.wet.rampTo(Math.max(0, Math.min(1, wet)), 0.05);
    }
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
    if (this.masterGain && this.masterGain.dispose) this.masterGain.dispose();
    if (this.masterFilter && this.masterFilter.dispose) this.masterFilter.dispose();
    if (this.reverb && this.reverb.dispose) this.reverb.dispose();
    if (this.delay && this.delay.dispose) this.delay.dispose();
    if (this.limiter && this.limiter.dispose) this.limiter.dispose();
    this.isReady = false;
  }
}

export const defaultEngine = new SoundEngine();
