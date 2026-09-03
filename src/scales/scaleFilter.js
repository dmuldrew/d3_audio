/**
 * Creates a D3-like audio filter scale that maps data to cutoff frequencies (Hz), Q resonance, and synth timbre parameters.
 */
export function scaleFilter() {
  let domain = [0, 1];
  let frequencyRange = [200, 12000]; // Hz
  let qRange = [1, 10];
  let scaleType = "logarithmic"; // "logarithmic", "exponential", "linear"
  let isClamped = true;
  let isCategorical = false;

  function transformT(t) {
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }
    switch (scaleType) {
      case "exponential":
        return Math.pow(t, 2);
      case "logarithmic":
        return (Math.pow(10, t) - 1) / 9;
      case "linear":
      default:
        return t;
    }
  }

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return frequencyRange[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    if (scaleType === "logarithmic") {
      if (isClamped) t = Math.max(0, Math.min(1, t));
      const minLog = Math.log10(Math.max(20, frequencyRange[0]));
      const maxLog = Math.log10(Math.max(20, frequencyRange[frequencyRange.length - 1]));
      return Math.pow(10, minLog + t * (maxLog - minLog));
    } else {
      const curvedT = transformT(t);
      const f0 = frequencyRange[0];
      const f1 = frequencyRange[frequencyRange.length - 1];
      return f0 + curvedT * (f1 - f0);
    }
  }

  scale.q = function(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return qRange[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }
    if (isClamped) t = Math.max(0, Math.min(1, t));
    return qRange[0] + t * (qRange[qRange.length - 1] - qRange[0]);
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return frequencyRange.slice();
    frequencyRange = _;
    return scale;
  };

  scale.qRange = function(_) {
    if (!arguments.length) return qRange.slice();
    qRange = _;
    return scale;
  };

  scale.type = function(_) {
    if (!arguments.length) return scaleType;
    scaleType = _;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleFilter()
      .domain(domain.slice())
      .range(frequencyRange.slice())
      .qRange(qRange.slice())
      .type(scaleType)
      .clamp(isClamped);
  };

  return scale;
}
