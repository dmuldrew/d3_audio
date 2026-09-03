/**
 * Creates a D3-like spatial / stereo panning scale that maps data to stereo pan values [-1.0 (L), +1.0 (R)].
 */
export function scalePan() {
  let domain = [0, 1];
  let range = [-1, 1]; // -1 = Left, 0 = Center, +1 = Right
  let isClamped = true;
  let isCategorical = false;

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return 0;
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    const r0 = range[0];
    const r1 = range[range.length - 1];
    return r0 + t * (r1 - r0);
  }

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

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scalePan()
      .domain(domain.slice())
      .range(range.slice())
      .clamp(isClamped);
  };

  return scale;
}
