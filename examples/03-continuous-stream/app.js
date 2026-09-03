import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleFilter,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

const container = document.getElementById('chart-area');
const width = container.clientWidth;
const height = container.clientHeight;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// Scales
const filterScale = scaleFilter()
  .domain([0, height])
  .range([12000, 200]) // High cutoff when at top, deep when at bottom
  .type("logarithmic");

const panScale = scalePan()
  .domain([0, width])
  .range([-0.9, 0.9]);

const pitchScale = scalePitch()
  .domain([0, 1])
  .range(["C3", "C5"])
  .scale("dorian")
  .root("D");

// Audio Synth Voice
const synth = createSynth({
  type: "fmSynth",
  harmonicity: 2.0,
  modulationIndex: 6
});

// Particles buffer
const particles = [];
const MAX_PARTICLES = 60;

// Waveform path generator
const wavePoints = d3.range(0, 50).map(i => ({ x: (i / 49) * width, y: height / 2 }));
const lineGen = d3.line()
  .x(d => d.x)
  .y(d => d.y)
  .curve(d3.curveBasis);

const wavePath = svg.append('path')
  .datum(wavePoints)
  .attr('fill', 'none')
  .attr('stroke', '#38bdf8')
  .attr('stroke-width', 2.5)
  .attr('opacity', 0.85);

const particleGroup = svg.append('g');

let isStreaming = false;
let streamTimer = null;
let currentX = width / 2;
let currentY = height / 2;
let phase = 0;

function generateStreamEvent() {
  phase += 0.15;
  // Natural wandering wave
  const noise = (Math.sin(phase) + 0.5 * Math.sin(phase * 2.3) + 0.25 * Math.cos(phase * 4.7)) / 1.75;
  const normVal = (noise + 1) / 2; // [0, 1]

  const freq = filterScale(currentY);
  const pan = panScale(currentX);
  const note = pitchScale(normVal);

  // Update UI Telemetry
  document.getElementById('val-stream').innerText = normVal.toFixed(2);
  document.getElementById('val-filter').innerText = `${Math.round(freq).toLocaleString()} Hz`;
  document.getElementById('val-pitch').innerText = note;
  document.getElementById('val-pan').innerText = pan.toFixed(2);

  // Trigger synth note with filter & pan
  synth.triggerAttackRelease(note, "16n", undefined, 0.65, { pan, filter: freq });

  // Update Waveform line
  wavePoints.shift();
  wavePoints.push({
    x: width,
    y: currentY + (normVal - 0.5) * 120
  });
  wavePoints.forEach((pt, i) => {
    pt.x = (i / (wavePoints.length - 1)) * width;
  });
  wavePath.attr('d', lineGen(wavePoints));

  // Spawn visual particle shockwave
  spawnParticle(currentX, currentY, normVal, note);
}

function spawnParticle(x, y, intensity, noteText) {
  const pGroup = particleGroup.append('g')
    .attr('transform', `translate(${x}, ${y})`);

  const circle = pGroup.append('circle')
    .attr('r', 8 + intensity * 15)
    .attr('fill', d3.interpolateCool(intensity))
    .attr('opacity', 0.8);

  const text = pGroup.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', -14)
    .attr('fill', '#ffffff')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .text(noteText);

  // Apply ripple and bounce choreography
  choreography().movement("ripple").intensity(1.5).duration(0.6)(circle.node());
  choreography().movement("bounce").intensity(1.2).duration(0.5)(text.node());

  setTimeout(() => {
    pGroup.remove();
  }, 600);
}

// Mouse interaction for vector modulation
let isDragging = false;
svg.on('mousedown', (e) => {
  isDragging = true;
  updateCoordinates(e);
});
svg.on('mousemove', (e) => {
  if (isDragging) updateCoordinates(e);
});
window.addEventListener('mouseup', () => { isDragging = false; });

function updateCoordinates(event) {
  const [x, y] = d3.pointer(event, svg.node());
  currentX = Math.max(0, Math.min(width, x));
  currentY = Math.max(0, Math.min(height, y));
}

// Stream Toggle Button
const toggleBtn = document.getElementById('stream-toggle-btn');
toggleBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isStreaming) {
    clearInterval(streamTimer);
    isStreaming = false;
    toggleBtn.innerText = "▶ Start Live Stream";
  } else {
    isStreaming = true;
    streamTimer = setInterval(generateStreamEvent, 160);
    toggleBtn.innerText = "⏸ Pause Live Stream";
  }
});
