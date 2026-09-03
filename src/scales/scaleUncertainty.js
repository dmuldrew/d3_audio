/**
 * scaleUncertainty: D3-idiomatic scaler mapping statistical uncertainty, p-values,
 * standard error, or missingness to Tone.BitCrusher bit reduction (16 bits down to 2 bits)
 * and lo-fi saturation grit.
 *
 * High confidence data sounds crystalline and pure (16 bits, 0 grit);
 * High uncertainty / noisy data sounds lo-fi, crunchy, and bit-crushed (2-4 bits, high grit).
 */
export function scaleUncertainty() {
  let domain = [0, 1]; // e.g. 0 = 0% error / p=0 (certain), 1 = 100% error / p=1 (uncertain)
  let bitRange = [16, 2]; // 16 bits (high fidelity) to 2 bits (extreme crush)
  let gritRange = [0, 1];
  let wetRange = [0, 1];
  let clamp = true;

  function scaler(x) {
    if (x === undefined || x === null || isNaN(x)) return { bits: 4, grit: 0.8, wet: 0.8, label: "Unknown / Missing" };

    const minD = domain[0];
    const maxD = domain[1];
    let norm = (x - minD) / (maxD - minD || 1);
    if (clamp) norm = Math.max(0, Math.min(1, norm));

    const bits = Math.round(bitRange[0] + norm * (bitRange[1] - bitRange[0]));
    const grit = gritRange[0] + norm * (gritRange[1] - gritRange[0]);
    const wet = wetRange[0] + norm * (wetRange[1] - wetRange[0]);

    let label = "Pristine";
    if (bits <= 4) label = "Heavy Bit-Crushed (Uncertain)";
    else if (bits <= 8) label = "Lo-Fi Grain (Moderate Error)";
    else if (bits <= 12) label = "Subtle Grit (Low Error)";

    return {
      bits: Math.max(1, Math.min(16, bits)),
      grit: Math.max(0, Math.min(1, grit)),
      wet: Math.max(0, Math.min(1, wet)),
      norm,
      label
    };
  }

  scaler.domain = function(d) {
    return arguments.length ? ((domain = d.slice()), scaler) : domain.slice();
  };

  scaler.bits = function(r) {
    return arguments.length ? ((bitRange = r.slice()), scaler) : bitRange.slice();
  };

  scaler.range = function(r) {
    return arguments.length ? ((bitRange = r.slice()), scaler) : bitRange.slice();
  };

  scaler.clamp = function(c) {
    return arguments.length ? ((clamp = Boolean(c)), scaler) : clamp;
  };

  /**
   * Helper to create or configure a Tone.BitCrusher node with current scaled values.
   */
  scaler.createNode = function(Tone, val) {
    if (!Tone || !Tone.BitCrusher) return null;
    const res = scaler(val);
    const node = new Tone.BitCrusher(res.bits);
    node.wet.value = res.wet;
    return node;
  };

  return scaler;
}

export const scaleCrush = scaleUncertainty;
