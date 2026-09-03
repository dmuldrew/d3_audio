/**
 * audioTransition & audioRamp: D3 Transition Audio Bridge.
 * Synchronizes D3's requestAnimationFrame animated transitions with Tone.js AudioParams.
 *
 * Enables smooth glissando pitch sweeps, volume fades, and filter cutoff sweeps
 * running at the exact same easing and duration as SVG visual elements.
 */

/**
 * Ramps a Tone.js AudioParam or Synth parameter smoothly over a duration.
 * @param {object} target Tone.js param (e.g. synth.frequency or synth.volume)
 * @param {number} targetValue Target numerical value
 * @param {object} options { duration: 0.5, ramp: "linear"|"exponential", time?: number }
 */
export function audioRamp(target, targetValue, options = {}) {
  if (!target) return;
  const duration = options.duration !== undefined ? options.duration : 0.5;
  const rampType = options.ramp || "linear";

  try {
    // If target has direct Tone.js rampTo method
    if (typeof target.rampTo === 'function') {
      target.rampTo(targetValue, duration);
    } else if (target.value !== undefined) {
      // AudioParam or Tone.Signal
      if (rampType === "exponential" && targetValue > 0.0001 && typeof target.exponentialRampTo === 'function') {
        target.exponentialRampTo(targetValue, duration);
      } else if (typeof target.linearRampTo === 'function') {
        target.linearRampTo(targetValue, duration);
      } else {
        target.value = targetValue;
      }
    }
  } catch (err) {
    // Fallback direct assignment
    try {
      if (typeof target === 'function') target(targetValue);
      else if (target.value !== undefined) target.value = targetValue;
    } catch (_) {}
  }
}

/**
 * D3 Transition Helper: .call(audioTransition(synth, options))
 * Hooks into D3 transition lifecycle (start, tween, end) to ramp audio parameters.
 */
export function audioTransition(synthOrParam, options = {}) {
  return function(transition) {
    transition.each(function() {
      // Extract transition duration in seconds
      const durationMs = transition.duration ? transition.duration() : 500;
      const durationSec = durationMs / 1000;

      if (synthOrParam) {
        if (options.frequency !== undefined) {
          const freqTarget = synthOrParam.frequency || (synthOrParam.instrument && synthOrParam.instrument.frequency);
          if (freqTarget) audioRamp(freqTarget, options.frequency, { duration: durationSec, ramp: "exponential" });
        }
        if (options.volume !== undefined) {
          const volTarget = synthOrParam.volume || (synthOrParam.volumeNode && synthOrParam.volumeNode.volume);
          if (volTarget) audioRamp(volTarget, options.volume, { duration: durationSec, ramp: "linear" });
        }
        if (options.cutoff !== undefined && synthOrParam.filterNode) {
          audioRamp(synthOrParam.filterNode.frequency, options.cutoff, { duration: durationSec, ramp: "exponential" });
        }
        if (options.pan !== undefined && synthOrParam.panner) {
          audioRamp(synthOrParam.panner.pan, options.pan, { duration: durationSec, ramp: "linear" });
        }
      }
    });
  };
}
