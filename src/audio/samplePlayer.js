import { defaultEngine } from './soundEngine.js';

/**
 * SamplePlayer: Handles playback of sampled instruments, audio clips, and synthesized percussion soundbanks.
 */
export class SamplePlayer {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);
    this.options = options;
    this.samples = new Map(); // name -> Tone.Player or custom trigger
    this.sampler = null; // Tone.Sampler for pitch-mapped multisamples
    this.panner = null;
    this.volumeNode = null;
    this.synthInstruments = {}; // Built-in acoustic/electronic sound generators

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

    this.volumeNode = new this.Tone.Volume(this.options.volume || 0);
    this.panner = new this.Tone.Panner(this.options.pan || 0);

    this.panner.connect(this.volumeNode);
    this.volumeNode.connect(masterIn);

    this.initBuiltinSounds();

    // Load external samples map if provided
    if (this.options.urls) {
      this.loadUrls(this.options.urls);
    }
  }

  /**
   * Generates built-in synthesized drum & foley sound models.
   */
  initBuiltinSounds() {
    const Tone = this.Tone;
    if (!Tone) return;

    // 1. Kick (Punchy 808 Membrane)
    this.synthInstruments.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0.0, release: 0.2 }
    }).connect(this.panner);

    // 2. Snare (Noise + Tone combination)
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
    snareFilter.connect(this.panner);
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
    const hatFilter = new Tone.Filter(7000, "highpass").connect(this.panner);
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
    const clapFilter = new Tone.Filter(1400, "bandpass").connect(this.panner);
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

    // 6. Tom / Percussion
    this.synthInstruments.tom = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0 }
    }).connect(this.panner);

    // 7. Bell / Metallic Chime
    this.synthInstruments.bell = new Tone.FMSynth({
      harmonicity: 3.5,
      modulationIndex: 12,
      envelope: { attack: 0.001, decay: 0.8, sustain: 0.05, release: 0.8 },
      modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0 }
    }).connect(this.panner);

    // 8. Blip / Short Electronic Beep
    this.synthInstruments.blip = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0 }
    }).connect(this.panner);
  }

  /**
   * Loads custom sample URLs into Tone.Player instances.
   * @param {Record<string, string>} urlsMap e.g. { "kick": "/audio/kick.wav", "snare": "/audio/snare.wav" }
   */
  async loadUrls(urlsMap) {
    if (!this.Tone) return;

    for (const [name, url] of Object.entries(urlsMap)) {
      const player = new this.Tone.Player({
        url,
        autostart: false,
        onload: () => {
          console.log(`Loaded sample: ${name}`);
        }
      }).connect(this.panner);
      this.samples.set(name, player);
    }
  }

  /**
   * Triggers a sample by name.
   * @param {string} sampleName e.g. "kick", "snare", "hihat", "clap", "bell", "blip", "custom"
   * @param {string|number} duration Duration or "8n"
   * @param {number} time Exact scheduled audio context time
   * @param {number} velocity Velocity [0, 1]
   * @param {object} params Optional per-trigger params { pan, pitch }
   */
  trigger(sampleName = "kick", duration = "8n", time = undefined, velocity = 0.8, params = {}) {
    if (!this.Tone) this.init();
    if (!this.Tone) return;

    const t = time !== undefined ? time : this.Tone.now();
    const name = (sampleName || 'kick').toLowerCase();

    // Pan override
    if (params.pan !== undefined && this.panner) {
      if (time !== undefined) {
        this.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), time);
      } else {
        this.panner.pan.value = Math.max(-1, Math.min(1, params.pan));
      }
    }

    // 1. Check custom loaded sample players
    if (this.samples.has(name)) {
      const player = this.samples.get(name);
      if (player && player.loaded) {
        player.start(t);
        return;
      }
    }

    // 2. Check built-in synthesized drum & foley sound models
    switch (name) {
      case 'kick':
      case 'bassdrum':
      case 'bd':
        this.synthInstruments.kick.triggerAttackRelease(params.pitch || "C1", duration, t, velocity);
        break;

      case 'snare':
      case 'sd':
        this.synthInstruments.snare.triggerAttackRelease(duration, t, velocity);
        break;

      case 'hihat':
      case 'hat':
      case 'hh':
      case 'closedhat':
        this.synthInstruments.hihat.triggerAttackRelease(duration, t, velocity);
        break;

      case 'openhat':
      case 'oh':
      case 'cymbal':
        this.synthInstruments.openhat.triggerAttackRelease(duration, t, velocity);
        break;

      case 'clap':
      case 'handclap':
      case 'cp':
        this.synthInstruments.clap.triggerAttackRelease(duration, t, velocity);
        break;

      case 'tom':
      case 'hitom':
      case 'lotom':
        this.synthInstruments.tom.triggerAttackRelease(params.pitch || "G2", duration, t, velocity);
        break;

      case 'bell':
      case 'chime':
      case 'cowbell':
        this.synthInstruments.bell.triggerAttackRelease(params.pitch || "E5", duration, t, velocity);
        break;

      case 'blip':
      case 'beep':
      case 'click':
      case 'tick':
        this.synthInstruments.blip.triggerAttackRelease(params.pitch || "A5", "32n", t, velocity);
        break;

      default:
        // Fallback to tom or blip with pitch
        if (this.synthInstruments.blip) {
          this.synthInstruments.blip.triggerAttackRelease(params.pitch || "C4", "16n", t, velocity);
        }
        break;
    }
  }

  setPan(pan) {
    if (this.panner) {
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
    if (this.panner) this.panner.dispose();
    if (this.volumeNode) this.volumeNode.dispose();
  }
}

export function createSamplePlayer(options = {}, engine = defaultEngine) {
  return new SamplePlayer(options, engine);
}
