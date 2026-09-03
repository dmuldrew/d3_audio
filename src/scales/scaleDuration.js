/**
 * Musical rhythmic subdivisions and duration conversions.
 */
export const SUBDIVISIONS = [
  { name: '32n', beats: 0.125 },
  { name: '16n', beats: 0.25 },
  { name: '16t', beats: 0.166667 },
  { name: '8n',  beats: 0.5 },
  { name: '8t',  beats: 0.333333 },
  { name: '8n.', beats: 0.75 },
  { name: '4n',  beats: 1.0 },
  { name: '4t',  beats: 0.666667 },
  { name: '4n.', beats: 1.5 },
  { name: '2n',  beats: 2.0 },
  { name: '2n.', beats: 3.0 },
  { name: '1m',  beats: 4.0 },
  { name: '2m',  beats: 8.0 }
];

/**
 * Creates a D3-like duration/rhythm scale that maps continuous data to note durations or seconds.
 */
export function scaleDuration() {
  let domain = [0, 1];
  let rangeNotation = ["16n", "1m"];
  let isQuantized = true;
  let isClamped = true;
  let bpm = 120;
  let isCategorical = false;

  function notationToBeats(not) {
    if (typeof not === 'number') return not;
    const found = SUBDIVISIONS.find(s => s.name === not);
    if (found) return found.beats;
    if (not.endsWith('n')) {
      const num = parseInt(not, 10);
      return 4 / num;
    }
    if (not.endsWith('m')) {
      const num = parseInt(not, 10);
      return 4 * num;
    }
    return 1.0;
  }

  function beatsToNotation(beats) {
    let closest = SUBDIVISIONS[0];
    let minDiff = Math.abs(beats - closest.beats);

    for (let i = 1; i < SUBDIVISIONS.length; i++) {
      const diff = Math.abs(beats - SUBDIVISIONS[i].beats);
      if (diff < minDiff) {
        minDiff = diff;
        closest = SUBDIVISIONS[i];
      }
    }
    return closest.name;
  }

  function scale(x) {
    let t;
    if (isCategorical) {
      const idx = domain.indexOf(x);
      if (idx === -1) return rangeNotation[0];
      t = domain.length > 1 ? idx / (domain.length - 1) : 0.5;
    } else {
      const d0 = domain[0];
      const d1 = domain[domain.length - 1];
      t = d1 === d0 ? 0.5 : (x - d0) / (d1 - d0);
    }

    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }

    const b0 = notationToBeats(rangeNotation[0]);
    const b1 = notationToBeats(rangeNotation[rangeNotation.length - 1]);
    const beats = b0 + t * (b1 - b0);

    if (isQuantized) {
      return beatsToNotation(beats);
    } else {
      // In seconds
      const secondsPerBeat = 60 / bpm;
      return beats * secondsPerBeat;
    }
  }

  scale.seconds = function(x) {
    const val = scale(x);
    if (typeof val === 'number') return val;
    const beats = notationToBeats(val);
    return beats * (60 / bpm);
  };

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = _;
    isCategorical = domain.some(d => typeof d !== 'number');
    return scale;
  };

  scale.range = function(_) {
    if (!arguments.length) return rangeNotation.slice();
    rangeNotation = _;
    return scale;
  };

  scale.quantize = function(_) {
    if (!arguments.length) return isQuantized;
    isQuantized = !!_;
    return scale;
  };

  scale.bpm = function(_) {
    if (!arguments.length) return bpm;
    bpm = +_;
    return scale;
  };

  scale.clamp = function(_) {
    if (!arguments.length) return isClamped;
    isClamped = !!_;
    return scale;
  };

  scale.copy = function() {
    return scaleDuration()
      .domain(domain.slice())
      .range(rangeNotation.slice())
      .quantize(isQuantized)
      .bpm(bpm)
      .clamp(isClamped);
  };

  return scale;
}
