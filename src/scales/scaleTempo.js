/**
 * Creates a D3-like tempo scale that maps continuous data to playback tempo in BPM.
 */
export function scaleTempo() {
  let domain = [0, 1];
  let range = [60, 180]; // BPM
  let isClamped = true;

  function scale(x) {
    const d0 = domain[0];
    const d1 = domain[domain.length - 1];
    let t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    if (isClamped) t = Math.max(0, Math.min(1, t));
    const r0 = range[0];
    const r1 = range[range.length - 1];
    return Math.round(r0 + t * (r1 - r0));
  }

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
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
    return scaleTempo()
      .domain(domain.slice())
      .range(range.slice())
      .clamp(isClamped);
  };

  return scale;
}
