import { assert, assertEqual, assertClose } from './run-tests.js';
import {
  adsrEnvelope,
  dampedOscillation,
  wiggle,
  flip,
  pulse,
  bounce,
  shake,
  ripple,
  glow,
  squash,
  PRESETS
} from '../src/movements/index.js';

export function testMovements() {
  // Test presets dictionary
  assert(typeof PRESETS.wiggle === 'function', "PRESETS.wiggle exists");
  assert(typeof PRESETS.flip === 'function', "PRESETS.flip exists");
  assert(typeof PRESETS.pulse === 'function', "PRESETS.pulse exists");
  assert(typeof PRESETS.bounce === 'function', "PRESETS.bounce exists");
  assert(typeof PRESETS.shake === 'function', "PRESETS.shake exists");
  assert(typeof PRESETS.ripple === 'function', "PRESETS.ripple exists");
  assert(typeof PRESETS.glow === 'function', "PRESETS.glow exists");
  assert(typeof PRESETS.squash === 'function', "PRESETS.squash exists");

  // Test ADSR Envelope
  assertEqual(adsrEnvelope(0), 0, "ADSR at t=0 is 0");
  assertEqual(adsrEnvelope(1), 0, "ADSR at t=1 is 0");
  assert(adsrEnvelope(0.2) > 0.5, "ADSR at peak attack is high");

  // Test damped oscillation
  assertEqual(dampedOscillation(0), 0, "Damped oscillation at t=0 is 0");
  assertEqual(dampedOscillation(1), 0, "Damped oscillation at t=1 is 0");

  // Test Wiggle preset
  const w0 = wiggle(0);
  assert(w0.transform.includes('rotate') || w0.transform === 'none', "Wiggle returns valid transform");
  const wMid = wiggle(0.25, { intensity: 1.5, angle: 20 });
  assert(typeof wMid.rotation === 'number', "Wiggle rotation is numeric");

  // Test Flip preset
  const f0 = flip(0, { axis: "y" });
  assertEqual(f0.rotateY, 0, "Flip rotateY at start is 0");
  const fEnd = flip(1, { axis: "y", degrees: 360 });
  assertClose(fEnd.rotateY, 360, 1, "Flip rotateY at finish is 360");

  // Test Pulse preset
  const p0 = pulse(0);
  assertEqual(p0.scale, 1.0, "Pulse scale at start is 1.0");
  const pPeak = pulse(0.2, { intensity: 1.0, maxScale: 1.4 });
  assertClose(pPeak.scale, 1.4, 0.05, "Pulse scale at peak is ~1.4");
  const pEnd = pulse(1.0);
  assertClose(pEnd.scale, 1.0, 0.05, "Pulse scale at end is ~1.0");

  // Test Bounce preset
  const b0 = bounce(0);
  assert(b0.transform.includes('translate'), "Bounce returns translate transform");

  // Test Shake preset
  const sMid = shake(0.3, { distance: 10 });
  assert(typeof sMid.translateX === 'number', "Shake provides translateX");

  // Test Ripple preset
  const r0 = ripple(0);
  assertEqual(r0.scale, 1.0, "Ripple scale at t=0 is 1.0");
  assertEqual(r0.opacity, 1.0, "Ripple opacity at t=0 is 1.0");
  const rEnd = ripple(1.0);
  assertEqual(rEnd.opacity, 0.0, "Ripple opacity at t=1 is 0.0");

  // Test Glow preset
  const gPeak = glow(0.15, { color: "#38bdf8" });
  assert(gPeak.filter.includes('drop-shadow'), "Glow returns drop-shadow filter");

  // Test Squash preset
  const sq0 = squash(0);
  assertEqual(sq0.scaleX, 1.0, "Squash scaleX at start is 1.0");
  assertEqual(sq0.scaleY, 1.0, "Squash scaleY at start is 1.0");
}
