import { defaultEngine } from '../audio/soundEngine.js';
import { Track } from './track.js';

/**
 * Timeline: Master conductor connecting data sequences to Tone.Transport with synchronized visual callbacks.
 */
export class Timeline {
  constructor(options = {}, engine = defaultEngine) {
    this.engine = engine;
    this.Tone = engine.Tone || (typeof window !== 'undefined' ? window.Tone : null);

    this.tracks = new Map();
    this.defaultTrack = new Track("default", options, engine);
    this.tracks.set("default", this.defaultTrack);

    this._bpm = options.bpm || 120;
    this._loop = options.loop || false;
    this._loopStart = options.loopStart || 0;
    this._loopEnd = options.loopEnd || "4m";
    this._timeSignature = options.timeSignature || [4, 4];

    this.isPlaying = false;
    this.isPaused = false;
    this.scheduledParts = [];
    this.eventListeners = {
      start: [],
      pause: [],
      stop: [],
      step: [],
      progress: [],
      loop: [],
      end: []
    };

    this.progressInterval = null;
  }

  setTone(tone) {
    this.Tone = tone;
    this.engine.setTone(tone);
  }

  /**
   * Defines or retrieves a track.
   * @param {string} name 
   * @param {object} options 
   * @returns {Track}
   */
  track(name = "default", options = {}) {
    if (!this.tracks.has(name)) {
      const newTrack = new Track(name, options, this.engine);
      this.tracks.set(name, newTrack);
    }
    return this.tracks.get(name);
  }

  // Delegate data accessors to default track for quick single-track syntax
  data(_) {
    if (!arguments.length) return this.defaultTrack.data();
    this.defaultTrack.data(_);
    return this;
  }

  time(_) {
    if (!arguments.length) return this.defaultTrack.time();
    this.defaultTrack.time(_);
    return this;
  }

  pitch(_) {
    if (!arguments.length) return this.defaultTrack.pitch();
    this.defaultTrack.pitch(_);
    return this;
  }

  gain(_) {
    if (!arguments.length) return this.defaultTrack.gain();
    this.defaultTrack.gain(_);
    return this;
  }

  duration(_) {
    if (!arguments.length) return this.defaultTrack.duration();
    this.defaultTrack.duration(_);
    return this;
  }

  pan(_) {
    if (!arguments.length) return this.defaultTrack.pan();
    this.defaultTrack.pan(_);
    return this;
  }

  filter(_) {
    if (!arguments.length) return this.defaultTrack.filter();
    this.defaultTrack.filter(_);
    return this;
  }

  sample(_) {
    if (!arguments.length) return this.defaultTrack.sample();
    this.defaultTrack.sample(_);
    return this;
  }

  movement(_) {
    if (!arguments.length) return this.defaultTrack.movement();
    this.defaultTrack.movement(_);
    return this;
  }

  element(_) {
    if (!arguments.length) return this.defaultTrack.element();
    this.defaultTrack.element(_);
    return this;
  }

  bpm(_) {
    if (!arguments.length) return this._bpm;
    this._bpm = +_;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().bpm.value = this._bpm;
    }
    return this;
  }

  loop(_) {
    if (!arguments.length) return this._loop;
    this._loop = !!_;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().loop = this._loop;
    }
    return this;
  }

  loopStart(_) {
    if (!arguments.length) return this._loopStart;
    this._loopStart = _;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().loopStart = this._loopStart;
    }
    return this;
  }

  loopEnd(_) {
    if (!arguments.length) return this._loopEnd;
    this._loopEnd = _;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().loopEnd = this._loopEnd;
    }
    return this;
  }

  timeSignature(_) {
    if (!arguments.length) return this._timeSignature;
    this._timeSignature = _;
    if (this.Tone && this.Tone.getTransport()) {
      this.Tone.getTransport().timeSignature = this._timeSignature;
    }
    return this;
  }

  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
    return this;
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Compiles and schedules all tracks onto Tone.Transport.
   */
  schedule() {
    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        return;
      }
    }

    const Transport = this.Tone.getTransport();

    // Clear previous scheduled parts
    this.clearScheduled();

    Transport.bpm.value = this._bpm;
    Transport.loop = this._loop;
    Transport.loopStart = this._loopStart;
    Transport.loopEnd = this._loopEnd;
    Transport.timeSignature = this._timeSignature;

    const hasSolo = Array.from(this.tracks.values()).some(t => t.isSolo);

    for (const track of this.tracks.values()) {
      if (track.isMuted) continue;
      if (hasSolo && !track.isSolo) continue;

      const events = track.buildEvents(this._bpm);

      // Create Tone.Part for this track's events
      const part = new this.Tone.Part((time, event) => {
        track.triggerEvent(event, time, this.Tone);
        if (this.Tone && this.Tone.Draw) {
          this.Tone.Draw.schedule(() => {
            this.emit('step', { event, time, track });
          }, time);
        } else {
          this.emit('step', { event, time, track });
        }
      }, events.map(e => [e.time, e]));

      part.start(0);
      this.scheduledParts.push(part);
    }
  }

  clearScheduled() {
    this.scheduledParts.forEach(p => {
      if (p && p.dispose) p.dispose();
    });
    this.scheduledParts = [];
  }

  /**
   * Starts playback on Tone.Transport.
   */
  async play() {
    await this.engine.start();

    if (!this.Tone) {
      if (typeof window !== 'undefined' && window.Tone) {
        this.Tone = window.Tone;
      } else {
        console.warn('Tone.js not found.');
        return;
      }
    }

    const Transport = this.Tone.getTransport();

    if (!this.isPlaying || this.isPaused) {
      this.schedule();
      Transport.start();
      this.isPlaying = true;
      this.isPaused = false;
      this.emit('start', { bpm: this._bpm, time: Transport.seconds });

      this.startProgressTracker();
    }
  }

  pause() {
    if (!this.Tone) return;
    const Transport = this.Tone.getTransport();
    Transport.pause();
    this.isPlaying = false;
    this.isPaused = true;
    this.stopProgressTracker();
    this.emit('pause', { time: Transport.seconds });
  }

  stop() {
    if (!this.Tone) return;
    const Transport = this.Tone.getTransport();
    Transport.stop();
    Transport.seconds = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.clearScheduled();
    this.engine.stopAll();
    this.stopProgressTracker();
    this.emit('stop', { time: 0 });
  }

  seek(timeInSeconds) {
    if (!this.Tone) return;
    const Transport = this.Tone.getTransport();
    Transport.seconds = Math.max(0, timeInSeconds);
    this.emit('progress', { seconds: Transport.seconds, position: Transport.position });
  }

  startProgressTracker() {
    this.stopProgressTracker();
    this.progressInterval = setInterval(() => {
      if (!this.Tone || !this.isPlaying) return;
      const Transport = this.Tone.getTransport();
      this.emit('progress', {
        seconds: Transport.seconds,
        position: Transport.position,
        progress: Transport.progress
      });
    }, 30);
  }

  stopProgressTracker() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  dispose() {
    this.stop();
    for (const track of this.tracks.values()) {
      track.dispose();
    }
    this.tracks.clear();
  }
}

export function timeline(options = {}, engine = defaultEngine) {
  return new Timeline(options, engine);
}
