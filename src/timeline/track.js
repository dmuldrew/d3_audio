import { defaultEngine } from '../audio/soundEngine.js';
import { createSynth } from '../audio/synthVoice.js';
import { createSamplePlayer } from '../audio/samplePlayer.js';
import { choreography } from '../movements/choreography.js';

/**
 * Track: Manages an audio-visual data stream with its own instrument, data bindings, and visual choreography.
 */
export class Track {
  constructor(name = "default", options = {}, engine = defaultEngine) {
    this.name = name;
    this.engine = engine;
    this.options = options;

    this.dataset = [];
    this.isMuted = false;
    this.isSolo = false;

    // Accessors
    this.timeAccessor = (d, i) => i * 0.25; // default 16th or quarter notes
    this.pitchAccessor = d => d.pitch || d.note || "C4";
    this.gainAccessor = d => d.gain || d.velocity || d.volume || 0.8;
    this.durationAccessor = d => d.duration || "8n";
    this.panAccessor = d => d.pan !== undefined ? d.pan : 0;
    this.filterAccessor = d => d.filter !== undefined ? d.filter : undefined;
    this.sampleAccessor = d => d.sample || d.sound || undefined;
    this.movementAccessor = d => d.movement || null;
    this.elementAccessor = (d, i) => d.element || null;

    // Instrument setup
    this.instrumentType = options.type || 'synth'; // 'synth', 'sample', or custom
    if (this.instrumentType === 'sample') {
      this.instrument = options.instrument || createSamplePlayer(options, engine);
    } else {
      this.instrument = options.instrument || createSynth(options, engine);
    }

    // Default choreography
    this.choreographer = choreography();
  }

  data(_) {
    if (!arguments.length) return this.dataset;
    this.dataset = Array.isArray(_) ? _ : [];
    return this;
  }

  time(_) {
    if (!arguments.length) return this.timeAccessor;
    this.timeAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  pitch(_) {
    if (!arguments.length) return this.pitchAccessor;
    this.pitchAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  gain(_) {
    if (!arguments.length) return this.gainAccessor;
    this.gainAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  duration(_) {
    if (!arguments.length) return this.durationAccessor;
    this.durationAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  pan(_) {
    if (!arguments.length) return this.panAccessor;
    this.panAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  filter(_) {
    if (!arguments.length) return this.filterAccessor;
    this.filterAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  sample(_) {
    if (!arguments.length) return this.sampleAccessor;
    this.sampleAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  movement(_) {
    if (!arguments.length) return this.movementAccessor;
    this.movementAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  element(_) {
    if (!arguments.length) return this.elementAccessor;
    this.elementAccessor = typeof _ === 'function' ? _ : () => _;
    return this;
  }

  mute(_) {
    if (!arguments.length) return this.isMuted;
    this.isMuted = !!_;
    return this;
  }

  solo(_) {
    if (!arguments.length) return this.isSolo;
    this.isSolo = !!_;
    return this;
  }

  /**
   * Evaluates and builds scheduled timeline events from the dataset.
   * @param {number} globalBpm
   * @returns {Array<object>}
   */
  buildEvents(globalBpm = 120) {
    const events = [];

    this.dataset.forEach((datum, index) => {
      const rawTime = this.timeAccessor(datum, index);
      const pitch = this.pitchAccessor(datum, index);
      const gain = this.gainAccessor(datum, index);
      const duration = this.durationAccessor(datum, index);
      const pan = this.panAccessor(datum, index);
      const filter = this.filterAccessor(datum, index);
      const sample = this.sampleAccessor(datum, index);
      const moveOpt = this.movementAccessor(datum, index);
      const targetElement = this.elementAccessor(datum, index);

      events.push({
        track: this,
        index,
        datum,
        time: rawTime,
        pitch,
        gain,
        duration,
        pan,
        filter,
        sample,
        movement: moveOpt,
        element: targetElement
      });
    });

    return events;
  }

  /**
   * Executes a single event: triggers audio on hardware time and visuals on Tone.Draw frame.
   * @param {object} event Built event object
   * @param {number} scheduledTime AudioContext timestamp
   * @param {object} Tone Tone.js instance
   */
  triggerEvent(event, scheduledTime, Tone) {
    if (this.isMuted) return;

    // 1. Audio synthesis trigger
    const duration = event.duration || "8n";
    const velocity = event.gain !== undefined ? event.gain : 0.8;
    const params = { pan: event.pan, filter: event.filter };

    if (event.sample || this.instrumentType === 'sample') {
      const sampleName = event.sample || 'kick';
      if (this.instrument.trigger) {
        this.instrument.trigger(sampleName, duration, scheduledTime, velocity, { ...params, pitch: event.pitch });
      }
    } else if (this.instrument && this.instrument.triggerAttackRelease) {
      this.instrument.triggerAttackRelease(event.pitch, duration, scheduledTime, velocity, params);
    }

    // 2. High-precision visual synchronization with Tone.Draw
    if (Tone && Tone.Draw) {
      Tone.Draw.schedule(() => {
        this.triggerVisuals(event);
      }, scheduledTime);
    } else {
      this.triggerVisuals(event);
    }
  }

  triggerVisuals(event) {
    if (!event.element && !event.movement) return;

    let targetEl = event.element;
    if (typeof targetEl === 'function') targetEl = targetEl(event.datum, event.index);
    if (!targetEl) return;

    let moveConfig = event.movement;
    if (typeof moveConfig === 'string') {
      moveConfig = { movement: moveConfig };
    } else if (typeof moveConfig === 'function') {
      moveConfig = { movement: moveConfig };
    }

    const durationSec = typeof event.duration === 'number' ? event.duration : 0.35;
    const intensity = event.gain !== undefined ? event.gain : 1.0;

    const opts = {
      intensity,
      duration: durationSec,
      ...moveConfig
    };

    const choreo = choreography()
      .movement(opts.movement || "wiggle")
      .duration(opts.duration || durationSec)
      .intensity(opts.intensity || intensity)
      .options(opts);

    choreo(targetEl);
  }

  dispose() {
    if (this.instrument && this.instrument.dispose) {
      this.instrument.dispose();
    }
  }
}
