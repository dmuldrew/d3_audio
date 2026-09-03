/**
 * scaleSpatial: D3-idiomatic audio scaler mapping Z-axis depth, distance from camera,
 * geographic distance to an epicenter, or cluster hierarchy to reverberant acoustic space.
 *
 * Foreground / near elements sound dry, direct, and intimate;
 * Background / far elements sound cavernous with long acoustic decay and diffuse wet mix.
 */
export function scaleSpatial() {
  let domain = [0, 100]; // e.g. 0 = near / center, 100 = far / peripheral
  let wetRange = [0.05, 0.95]; // wet mix
  let decayRange = [0.4, 7.0]; // reverb decay time in seconds
  let clamp = true;

  function scaler(x) {
    if (x === undefined || x === null || isNaN(x)) return { wet: 0.5, decay: 2.5, norm: 0.5 };

    const minD = domain[0];
    const maxD = domain[1];
    let norm = (x - minD) / (maxD - minD || 1);
    if (clamp) norm = Math.max(0, Math.min(1, norm));

    const wet = wetRange[0] + norm * (wetRange[1] - wetRange[0]);
    const decay = decayRange[0] + norm * (decayRange[1] - decayRange[0]);

    return {
      wet: Math.round(wet * 1000) / 1000,
      decay: Math.round(decay * 100) / 100,
      preDelay: Math.round((0.01 + norm * 0.08) * 1000) / 1000,
      norm
    };
  }

  scaler.domain = function(d) {
    return arguments.length ? ((domain = d.slice()), scaler) : domain.slice();
  };

  scaler.range = function(r) {
    return arguments.length ? ((wetRange = r.slice()), scaler) : wetRange.slice();
  };

  scaler.decay = function(d) {
    return arguments.length ? ((decayRange = d.slice()), scaler) : decayRange.slice();
  };

  scaler.decayRange = scaler.decay;
  scaler.wetRange = scaler.range;

  scaler.clamp = function(c) {
    return arguments.length ? ((clamp = Boolean(c)), scaler) : clamp;
  };

  scaler.createNode = function(Tone, val) {
    if (!Tone || !Tone.Freeverb) return null;
    const res = scaler(val);
    const node = new Tone.Freeverb();
    node.dampening = 3000;
    node.roomSize.value = Math.min(0.95, res.norm * 0.85 + 0.1);
    node.wet.value = res.wet;
    return node;
  };

  return scaler;
}

export const scaleReverb = scaleSpatial;
