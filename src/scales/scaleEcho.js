/**
 * scaleEcho: D3-idiomatic audio scaler mapping time-series latency, moving-average windows,
 * network ping, or historical memory to Tone.FeedbackDelay parameters.
 */
export function scaleEcho() {
  let domain = [0, 1000]; // e.g. milliseconds of ping or data lag
  let delayRange = [0.06, 0.65]; // seconds of delay time
  let feedbackRange = [0.1, 0.7]; // repeat feedback
  let clamp = true;

  function scaler(x) {
    if (x === undefined || x === null || isNaN(x)) return { delayTime: 0.25, feedback: 0.3, wet: 0.4 };

    const minD = domain[0];
    const maxD = domain[1];
    let norm = (x - minD) / (maxD - minD || 1);
    if (clamp) norm = Math.max(0, Math.min(1, norm));

    const delayTime = delayRange[0] + norm * (delayRange[1] - delayRange[0]);
    const feedback = feedbackRange[0] + norm * (feedbackRange[1] - feedbackRange[0]);
    const wet = Math.min(0.85, 0.15 + norm * 0.7);

    return {
      delayTime: Math.round(delayTime * 1000) / 1000,
      feedback: Math.round(feedback * 100) / 100,
      wet: Math.round(wet * 100) / 100,
      norm
    };
  }

  scaler.domain = function(d) {
    return arguments.length ? ((domain = d.slice()), scaler) : domain.slice();
  };

  scaler.range = function(r) {
    return arguments.length ? ((delayRange = r.slice()), scaler) : delayRange.slice();
  };

  scaler.feedback = function(f) {
    return arguments.length ? ((feedbackRange = f.slice()), scaler) : feedbackRange.slice();
  };

  scaler.delayRange = scaler.range;
  scaler.feedbackRange = scaler.feedback;

  scaler.clamp = function(c) {
    return arguments.length ? ((clamp = Boolean(c)), scaler) : clamp;
  };

  scaler.createNode = function(Tone, val) {
    if (!Tone || !Tone.FeedbackDelay) return null;
    const res = scaler(val);
    const node = new Tone.FeedbackDelay(res.delayTime, res.feedback);
    node.wet.value = res.wet;
    return node;
  };

  return scaler;
}

export const scaleDelay = scaleEcho;
