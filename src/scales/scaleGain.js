/**
 * Creates a D3-like gain/volume scale that maps data to audio amplitude [0, 1] or decibels [-60, 0].
 */
export function scaleGain() {
  let domain = [0, 1];
  let range = [0, 1];
  let curveType = "linear"; // "linear", "exponential", "logarithmic", "perceptual"
  let exponentValue = 2;
  let isClamped = true;
  let isCategorical = false;

  function curveTransform(t) {
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    switch (curveType) {
      case "exponential":
        return Math.pow(t, exponentValue);
      case "logarithmic":
        return Math.log10(1 + 9 * t); // maps 0->0, 1->1
      case "perceptual":
        // Fletcher-Munson / Stevens power law approximation for perceived loudness
        return Math.pow(t, 0.6);
      case "linear":
      default:
        return t;
    }
  }

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return range[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    const curvedT = curveTransform(t);
    const r0 = range[0];
    const r1 = range[range.length - 1];
    return r0 + curvedT * (r1 - r0);
  }

  scale.db = function(x) {
    const gain = scale(x);
    if (gain <= 0.0001) return -60;
    return 20 * Math.log10(gain);
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return range.slice();
    range = _;
    return scale;
  };

  scale.curve = function(_) {
    if (!arguments.length) return curveType;
    curveType = _;
    return scale;
  };

  scale.exponent = function(_) {
    if (!arguments.length) return exponentValue;
    exponentValue = +_;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleGain()
      .domain(domain.slice())
      .range(range.slice())
      .curve(curveType)
      .exponent(exponentValue)
      .clamp(isClamped);
  };

  return scale;
}
