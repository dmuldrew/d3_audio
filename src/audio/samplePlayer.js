import { defaultEngine } from './soundEngine.js';

/**
 * SamplePlayer: Handles playback of sampled instruments, audio clips, and synthesized percussion soundbanks.
 */
export class SamplePlayer {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);
    this.options = options;
    this.samples = new Map();
    this.panner = null;
    this.volumeNode = null;
    this.synthInstruments = {};

    this.init();
  }

  ensureReady() {
    if (!this.Tone && typeof window !== 'undefined' && window.Tone) {
      this.Tone = window.Tone;
    }
    if (!this.volumeNode && this.Tone) {
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

      this.volumeNode = new this.Tone.Volume(this.options.volume || 0);
      this.panner = new this.Tone.Panner(this.options.pan || 0);

      this.panner.connect(this.volumeNode);
      if (masterIn) {
        this.volumeNode.connect(masterIn);
      } else {
        this.volumeNode.toDestination();
      }

      this.initBuiltinSounds();

      if (this.options.urls) {
        this.loadUrls(this.options.urls);
      }
    } catch (err) {
      console.warn('SamplePlayer init fallback:', err);
    }
  }

  initBuiltinSounds() {
    const Tone = this.Tone;
    if (!Tone) return;

    try {
      // 1. Kick (808 Membrane)
      this.synthInstruments.kick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.0, release: 0.2 }
      });
      if (this.panner) this.synthInstruments.kick.connect(this.panner);
      else this.synthInstruments.kick.toDestination();

      // 2. Snare
      const snareNoise = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0 }
      });
      const snareTone = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
      });
      const snareFilter = new Tone.Filter(2200, "highpass");
      snareNoise.connect(snareFilter);
      snareTone.connect(snareFilter);
      if (this.panner) snareFilter.connect(this.panner);
      else snareFilter.toDestination();

      this.synthInstruments.snare = {
        triggerAttackRelease: (dur, time, vel = 0.8) => {
          snareNoise.triggerAttackRelease(dur, time, vel);
          snareTone.triggerAttackRelease("G2", "16n", time, vel * 0.7);
        },
        dispose: () => {
          snareNoise.dispose();
          snareTone.dispose();
          snareFilter.dispose();
        }
      };

      // 3. Hi-Hat Closed
      const hatClosed = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0 }
      });
      const hatFilter = new Tone.Filter(7000, "highpass");
      if (this.panner) hatFilter.connect(this.panner);
      else hatFilter.toDestination();
      hatClosed.connect(hatFilter);

      this.synthInstruments.hihat = {
        triggerAttackRelease: (dur, time, vel = 0.7) => {
          hatClosed.triggerAttackRelease("32n", time, vel);
        },
        dispose: () => {
          hatClosed.dispose();
          hatFilter.dispose();
        }
      };

      // 4. Hi-Hat Open
      const hatOpen = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0 }
      });
      hatOpen.connect(hatFilter);
      this.synthInstruments.openhat = {
        triggerAttackRelease: (dur, time, vel = 0.7) => {
          hatOpen.triggerAttackRelease("8n", time, vel);
        },
        dispose: () => {
          hatOpen.dispose();
        }
      };

      // 5. Clap
      const clapNoise = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.005, decay: 0.14, sustain: 0 }
      });
      const clapFilter = new Tone.Filter(1400, "bandpass");
      if (this.panner) clapFilter.connect(this.panner);
      else clapFilter.toDestination();
      clapNoise.connect(clapFilter);

      this.synthInstruments.clap = {
        triggerAttackRelease: (dur, time, vel = 0.8) => {
          clapNoise.triggerAttackRelease("16n", time, vel);
        },
        dispose: () => {
          clapNoise.dispose();
          clapFilter.dispose();
        }
      };

      // 6. Tom
      this.synthInstruments.tom = new Tone.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0 }
      });
      if (this.panner) this.synthInstruments.tom.connect(this.panner);
      else this.synthInstruments.tom.toDestination();

      // 7. Bell
      this.synthInstruments.bell = new Tone.FMSynth({
        harmonicity: 3.5,
        modulationIndex: 12,
        envelope: { attack: 0.001, decay: 0.8, sustain: 0.05, release: 0.8 },
        modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0 }
      });
      if (this.panner) this.synthInstruments.bell.connect(this.panner);
      else this.synthInstruments.bell.toDestination();

      // 8. Blip
      this.synthInstruments.blip = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0 }
      });
      if (this.panner) this.synthInstruments.blip.connect(this.panner);
      else this.synthInstruments.blip.toDestination();
    } catch (err) {
      console.warn('initBuiltinSounds error:', err);
    }
  }

  async loadUrls(urlsMap) {
    if (!this.Tone) return;

    for (const [name, url] of Object.entries(urlsMap)) {
      const player = new this.Tone.Player({
        url,
        autostart: false
      });
      if (this.panner) player.connect(this.panner);
      else player.toDestination();
      this.samples.set(name, player);
    }
  }

  trigger(sampleName = "kick", duration = "8n", time = undefined, velocity = 0.8, params = {}) {
    this.ensureReady();
    if (!this.Tone) return;

    try {
      const t = time !== undefined ? time : this.Tone.now();
      const name = (sampleName || 'kick').toLowerCase();
      const vel = Math.max(0.01, Math.min(1.0, velocity));

      if (params.pan !== undefined && this.panner && this.panner.pan) {
        if (typeof this.panner.pan.rampTo === 'function') {
          this.panner.pan.rampTo(Math.max(-1, Math.min(1, params.pan)), 0.02, time);
        } else {
          this.panner.pan.value = Math.max(-1, Math.min(1, params.pan));
        }
      }

      if (this.samples.has(name)) {
        const player = this.samples.get(name);
        if (player && player.loaded) {
          player.start(t);
          return;
        }
      }

      switch (name) {
        case 'kick':
        case 'bassdrum':
        case 'bd':
          if (this.synthInstruments.kick) {
            this.synthInstruments.kick.triggerAttackRelease(params.pitch || "C1", duration, t, vel);
          }
          break;

        case 'snare':
        case 'sd':
          if (this.synthInstruments.snare) {
            this.synthInstruments.snare.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'hihat':
        case 'hat':
        case 'hh':
        case 'closedhat':
          if (this.synthInstruments.hihat) {
            this.synthInstruments.hihat.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'openhat':
        case 'oh':
        case 'cymbal':
          if (this.synthInstruments.openhat) {
            this.synthInstruments.openhat.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'clap':
        case 'handclap':
        case 'cp':
          if (this.synthInstruments.clap) {
            this.synthInstruments.clap.triggerAttackRelease(duration, t, vel);
          }
          break;

        case 'tom':
        case 'hitom':
        case 'lotom':
          if (this.synthInstruments.tom) {
            this.synthInstruments.tom.triggerAttackRelease(params.pitch || "G2", duration, t, vel);
          }
          break;

        case 'bell':
        case 'chime':
        case 'cowbell':
          if (this.synthInstruments.bell) {
            this.synthInstruments.bell.triggerAttackRelease(params.pitch || "E5", duration, t, vel);
          }
          break;

        case 'blip':
        case 'beep':
        case 'click':
        case 'tick':
        default:
          if (this.synthInstruments.blip) {
            this.synthInstruments.blip.triggerAttackRelease(params.pitch || "A5", "32n", t, vel);
          }
          break;
      }
    } catch (err) {
      console.warn('SamplePlayer trigger error:', err);
    }
  }

  setPan(pan) {
    if (this.panner && this.panner.pan) {
      this.panner.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  dispose() {
    for (const player of this.samples.values()) {
      if (player && player.dispose) player.dispose();
    }
    for (const inst of Object.values(this.synthInstruments)) {
      if (inst && inst.dispose) inst.dispose();
    }
    if (this.panner && this.panner.dispose) this.panner.dispose();
    if (this.volumeNode && this.volumeNode.dispose) this.volumeNode.dispose();
  }
}

export function createSamplePlayer(options = {}, engine = defaultEngine) {
  return new SamplePlayer(options, engine);
}
