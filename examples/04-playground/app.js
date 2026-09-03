import {
  scalePitch,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

let currentScale = 'pentatonic';
let currentRoot = 'C';
let currentMove = 'wiggle';
let currentIntensity = 1.2;
let currentDuration = 0.4;

const pitchScale = scalePitch()
  .domain([0, 100])
  .range(["C4", "C5"])
  .scale(currentScale)
  .root(currentRoot);

const synth = createSynth({ type: "polySynth" });

function updateUIAndLabels() {
  pitchScale.scale(currentScale).root(currentRoot);

  const items = document.querySelectorAll('.stage-item');
  items.forEach(item => {
    const val = +item.getAttribute('data-val');
    const note = pitchScale(val);
    item.querySelector('.note-label').innerText = note;
  });

  generateCodeSnippet();
}

function generateCodeSnippet() {
  const code = `import * as d3 from "d3";
import { scalePitch, choreography, defaultEngine, createSynth } from "d3-audio";

// 1. Initialize scale with ${currentRoot} ${currentScale}
const pitch = scalePitch()
  .domain([0, 100])
  .range(["C4", "C5"])
  .scale("${currentScale}")
  .root("${currentRoot}");

// 2. Configure audio voice
const synth = createSynth({ type: "polySynth" });

// 3. Define choreography with preset "${currentMove}"
const choreo = choreography()
  .movement("${currentMove}")
  .intensity(${currentIntensity.toFixed(1)})
  .duration(${currentDuration.toFixed(2)});

// 4. Trigger on D3 selection or event
d3.selectAll(".element")
  .on("click", async function(event, d) {
    await defaultEngine.start();
    const note = pitch(d.value);
    synth.triggerAttackRelease(note, "8n");
    d3.select(this).call(choreo);
  });`;

  document.getElementById('code-box').innerText = code;
}

// Stage Item Interaction
document.querySelectorAll('.stage-item').forEach(item => {
  item.addEventListener('click', async () => {
    await defaultEngine.start();
    const val = +item.getAttribute('data-val');
    const note = pitchScale(val);

    synth.triggerAttackRelease(note, "8n");
    choreography()
      .movement(currentMove)
      .intensity(currentIntensity)
      .duration(currentDuration)(item);
  });
});

// Trigger All
document.getElementById('trigger-all-btn').addEventListener('click', async () => {
  await defaultEngine.start();
  const items = Array.from(document.querySelectorAll('.stage-item'));

  for (let i = 0; i < items.length; i++) {
    const el = items[i];
    const val = +el.getAttribute('data-val');
    const note = pitchScale(val);

    synth.triggerAttackRelease(note, "8n");
    choreography()
      .movement(currentMove)
      .intensity(currentIntensity)
      .duration(currentDuration)(el);

    await new Promise(r => setTimeout(r, 180));
  }
});

// Control Listeners
document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  updateUIAndLabels();
});

document.getElementById('root-select').addEventListener('change', (e) => {
  currentRoot = e.target.value;
  updateUIAndLabels();
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMove = e.target.value;
  generateCodeSnippet();
});

document.getElementById('intensity-slider').addEventListener('input', (e) => {
  currentIntensity = +e.target.value;
  document.getElementById('intensity-val').innerText = currentIntensity.toFixed(1);
  generateCodeSnippet();
});

document.getElementById('duration-slider').addEventListener('input', (e) => {
  currentDuration = +e.target.value;
  document.getElementById('duration-val').innerText = currentDuration.toFixed(2);
  generateCodeSnippet();
});

updateUIAndLabels();
