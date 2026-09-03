/**
 * Creates a D3-like sample scale that maps categorical or discrete data to sample sound identifiers or audio URLs.
 */
export function scaleSample() {
  let domain = [];
  let range = ["kick", "snare", "hihat", "clap"];
  let unknownFallback = undefined;

  function scale(x) {
    if (domain.length === 0) {
      if (typeof x === 'number') {
        const idx = Math.floor(x) % range.length;
        return range[((idx % range.length) + range.length) % range.length];
      }
      return range[0];
    }

    const idx = domain.indexOf(x);
    if (idx !== -1) {
      return range[idx % range.length];
    }

    // If continuous number and domain is numeric range
    if (typeof x === 'number' && domain.length >= 2 && typeof domain[0] === 'number') {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      const t = Math.max(0, Math.min(1, (x - d0) / (d1 - d0)));
      const index = Math.min(range.length - 1, Math.floor(t * range.length));
      return range[index];
    }

    return unknownFallback !== undefined ? unknownFallback : range[0];
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

  scale.unknown = function(_) {
    if (!arguments.length) return unknownFallback;
    unknownFallback = _;
    return scale;
  };

  scale.copy = function() {
    return scaleSample()
      .domain(domain.slice())
      .range(range.slice())
      .unknown(unknownFallback);
  };

  return scale;
}
