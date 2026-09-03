/**
 * Computes a Euclidean Rhythm using the Bjorklund algorithm.
 * Evenly distributes `pulses` across `steps` subdivisions.
 *
 * @param {number} pulses Number of active onsets (k)
 * @param {number} steps Total subdivisions in cycle (n)
 * @returns {number[]} Binary array of length `steps` (e.g. [1, 0, 0, 1, 0, 0, 1, 0])
 */
export function euclideanRhythm(pulses, steps) {
  pulses = Math.round(Math.max(0, Math.min(steps, pulses)));
  steps = Math.round(Math.max(1, steps));

  if (pulses === 0) return new Array(steps).fill(0);
  if (pulses >= steps) return new Array(steps).fill(1);

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  remainders.push(pulses);
  let level = 0;

  while (true) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level++;
    if (remainders[level] <= 1) break;
  }

  counts.push(divisor);

  function build(l) {
    if (l === -1) {
      pattern.push(0);
    } else if (l === -2) {
      pattern.push(1);
    } else {
      for (let i = 0; i < counts[l]; i++) {
        build(l - 1);
      }
      if (remainders[l] !== 0) {
        build(l - 2);
      }
    }
  }

  build(level);

  // Return exactly `steps` length
  const result = pattern.slice(0, steps);
  // Ensure the rhythm starts on a pulse (1) if any pulses exist
  const firstOne = result.indexOf(1);
  if (firstOne > 0) {
    return result.slice(firstOne).concat(result.slice(0, firstOne));
  }
  return result;
}

/**
 * scaleRhythm: D3-idiomatic rhythm scaler mapping continuous data density,
 * event counts, or activity levels to Euclidean rhythm patterns and Tone.js timing offsets.
 */
export function scaleRhythm() {
  let domain = [0, 100];
  let totalSteps = 16;
  let pulseRange = [1, 16];
  let clamp = true;
  let subdivision = "16n"; // "16n", "8n"

  function scaler(x) {
    if (x === undefined || x === null || isNaN(x)) x = domain[0];

    const minD = domain[0];
    const maxD = domain[1];
    let norm = (x - minD) / (maxD - minD || 1);
    if (clamp) norm = Math.max(0, Math.min(1, norm));

    const pulses = Math.round(pulseRange[0] + norm * (pulseRange[1] - pulseRange[0]));
    const pattern = euclideanRhythm(pulses, totalSteps);

    // Build Tone.js timeline events
    const events = [];
    pattern.forEach((hit, idx) => {
      if (hit) {
        // e.g. "0:0:0", "0:0:1", "0:0:2", etc. for 16th subdivisions
        const quarter = Math.floor(idx / 4);
        const sixteenth = idx % 4;
        events.push({
          step: idx,
          time: `0:${quarter}:${sixteenth}`,
          stepTime: idx * (1 / totalSteps)
        });
      }
    });

    return {
      pulses,
      steps: totalSteps,
      pattern,
      density: pulses / totalSteps,
      events,
      isHit: (stepIdx) => Boolean(pattern[stepIdx % totalSteps]),
      toString: () => pattern.map(h => (h ? 'x' : '.')).join('')
    };
  }

  scaler.domain = function(d) {
    return arguments.length ? ((domain = d.slice()), scaler) : domain.slice();
  };

  scaler.steps = function(s) {
    return arguments.length ? ((totalSteps = Math.max(1, Math.round(s))), scaler) : totalSteps;
  };

  scaler.range = function(r) {
    return arguments.length ? ((pulseRange = r.slice()), scaler) : pulseRange.slice();
  };

  scaler.pulses = function(r) {
    return arguments.length ? ((pulseRange = r.slice()), scaler) : pulseRange.slice();
  };

  scaler.subdivision = function(sub) {
    return arguments.length ? ((subdivision = sub), scaler) : subdivision;
  };

  scaler.clamp = function(c) {
    return arguments.length ? ((clamp = Boolean(c)), scaler) : clamp;
  };

  return scaler;
}
