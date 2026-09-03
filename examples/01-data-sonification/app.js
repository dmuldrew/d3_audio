import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleDuration,
  timeline,
  choreography,
  defaultEngine,
  createSynth
} from '/dist/d3-audio.js';

// Sample time-series dataset: 16 monthly observations
const dataset = [
  { month: "Jan", val: 28, magnitude: 1.2, alert: false },
  { month: "Feb", val: 42, magnitude: 1.5, alert: false },
  { month: "Mar", val: 65, magnitude: 2.1, alert: true },
  { month: "Apr", val: 50, magnitude: 1.8, alert: false },
  { month: "May", val: 78, magnitude: 2.5, alert: true },
  { month: "Jun", val: 95, magnitude: 3.0, alert: true },
  { month: "Jul", val: 85, magnitude: 2.7, alert: false },
  { month: "Aug", val: 70, magnitude: 2.2, alert: false },
  { month: "Sep", val: 60, magnitude: 1.9, alert: false },
  { month: "Oct", val: 88, magnitude: 2.8, alert: true },
  { month: "Nov", val: 72, magnitude: 2.3, alert: false },
  { month: "Dec", val: 55, magnitude: 1.7, alert: false },
  { month: "Q1+", val: 68, magnitude: 2.1, alert: false },
  { month: "Q2+", val: 82, magnitude: 2.6, alert: true },
  { month: "Q3+", val: 91, magnitude: 2.9, alert: true },
  { month: "Q4+", val: 100, magnitude: 3.2, alert: true }
];

const container = document.getElementById('chart');
const width = container.clientWidth;
const height = container.clientHeight;
const margin = { top: 30, right: 30, bottom: 40, left: 50 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

// D3 visual scales
const xScale = d3.scaleBand()
  .domain(dataset.map((d, i) => i))
  .range([0, innerW])
  .padding(0.3);

const yScale = d3.scaleLinear()
  .domain([0, 100])
  .range([innerH, 0]);

// Axes
g.append('g')
  .attr('transform', `translate(0, ${innerH})`)
  .call(d3.axisBottom(xScale).tickFormat((d, i) => dataset[i].month))
  .attr('color', '#64748b');

g.append('g')
  .call(d3.axisLeft(yScale).ticks(5))
  .attr('color', '#64748b');

// Playhead indicator line
const playhead = g.append('line')
  .attr('class', 'playhead-line')
  .attr('y1', 0)
  .attr('y2', innerH)
  .attr('x1', 0)
  .attr('x2', 0)
  .style('opacity', 0);

// d3-audio scalers
let currentScaleType = "pentatonic";
let currentMovementType = "wiggle";

const pitchScale = scalePitch()
  .domain([0, 100])
  .range(["C3", "C6"])
  .scale(currentScaleType)
  .root("C");

const gainScale = scaleGain()
  .domain([1.0, 3.5])
  .range([0.4, 0.95]);

const panScale = scalePan()
  .domain([0, innerW])
  .range([-0.8, 0.8]);

const durationScale = scaleDuration()
  .domain([0, 100])
  .range(["16n", "4n"]);

// Instrument synth
let synth = createSynth({ type: "polySynth" });

// Draw Bars & Bubbles
const bars = g.selectAll('.bar')
  .data(dataset)
  .enter()
  .append('rect')
  .attr('class', 'bar')
  .attr('x', (d, i) => xScale(i))
  .attr('y', d => yScale(d.val))
  .attr('width', xScale.bandwidth())
  .attr('height', d => innerH - yScale(d.val))
  .attr('fill', d => d.alert ? '#f43f5e' : '#38bdf8')
  .attr('rx', 4);

const bubbles = g.selectAll('.bubble')
  .data(dataset)
  .enter()
  .append('circle')
  .attr('class', 'bubble')
  .attr('cx', (d, i) => xScale(i) + xScale.bandwidth() / 2)
  .attr('cy', d => yScale(d.val))
  .attr('r', d => d.magnitude * 4)
  .attr('fill', '#ffffff')
  .attr('stroke', d => d.alert ? '#f43f5e' : '#38bdf8')
  .attr('stroke-width', 2);

// Timeline instance
const tl = timeline({ bpm: 120, loop: true, loopEnd: "4m" });

function updateTimelineData() {
  tl.data(dataset)
    .time((d, i) => i * 0.25) // 16th steps
    .pitch(d => pitchScale(d.val))
    .gain(d => gainScale(d.magnitude))
    .pan((d, i) => panScale(xScale(i)))
    .duration(d => durationScale(d.val))
    .movement((d, i) => ({
      movement: currentMovementType,
      intensity: d.magnitude / 2.0,
      element: bars.nodes()[i]
    }));
}

updateTimelineData();

// Interactive Audition on Click/Hover
bars.on('mouseenter click', function(event, d) {
  const i = dataset.indexOf(d);
  auditionElement(this, bubbles.nodes()[i], d, i);
});

bubbles.on('mouseenter click', function(event, d) {
  const i = dataset.indexOf(d);
  auditionElement(bars.nodes()[i], this, d, i);
});

async function auditionElement(barEl, bubbleEl, d, index) {
  await defaultEngine.start();
  const note = pitchScale(d.val);
  const vel = gainScale(d.magnitude);
  const pan = panScale(xScale(index));
  const dur = durationScale(d.val);

  synth.triggerAttackRelease(note, dur, undefined, vel, { pan });

  choreography()
    .movement(currentMovementType)
    .intensity(d.magnitude / 1.8)
    .duration(0.35)(barEl);

  choreography()
    .movement("pulse")
    .intensity(d.magnitude / 1.5)
    .duration(0.35)(bubbleEl);
}

// Timeline event callbacks
tl.on('step', ({ event }) => {
  const idx = event.index;
  const xPos = xScale(idx) + xScale.bandwidth() / 2;
  playhead.style('opacity', 1).attr('x1', xPos).attr('x2', xPos);

  const bubbleEl = bubbles.nodes()[idx];
  if (bubbleEl) {
    choreography().movement("pulse").intensity(1.2).duration(0.3)(bubbleEl);
  }
});

tl.on('start', () => {
  document.getElementById('transport-status').innerText = "Transport: Running 🎵";
  document.getElementById('play-btn').innerText = "⏸ Pause";
  playhead.style('opacity', 1);
});

tl.on('pause', () => {
  document.getElementById('transport-status').innerText = "Transport: Paused";
  document.getElementById('play-btn').innerText = "▶ Play Timeline";
});

tl.on('stop', () => {
  document.getElementById('transport-status').innerText = "Transport: Stopped";
  document.getElementById('play-btn').innerText = "▶ Play Timeline";
  playhead.style('opacity', 0);
});

tl.on('progress', ({ seconds }) => {
  const total = 4.0; // 16 steps * 0.25s
  const pct = Math.min(100, (seconds % total) / total * 100);
  document.getElementById('scrubber').value = pct;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  document.getElementById('time-display').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
});

// UI Event Listeners
document.getElementById('play-btn').addEventListener('click', async () => {
  if (tl.isPlaying) {
    tl.pause();
  } else {
    await tl.play();
  }
});

document.getElementById('stop-btn').addEventListener('click', () => {
  tl.stop();
});

document.getElementById('scale-type').addEventListener('change', (e) => {
  currentScaleType = e.target.value;
  pitchScale.scale(currentScaleType);
  updateTimelineData();
});

document.getElementById('movement-type').addEventListener('change', (e) => {
  currentMovementType = e.target.value;
  updateTimelineData();
});

document.getElementById('bpm-slider').addEventListener('input', (e) => {
  const bpm = +e.target.value;
  document.getElementById('bpm-val').innerText = bpm;
  tl.bpm(bpm);
});

document.getElementById('synth-type').addEventListener('change', (e) => {
  synth.dispose();
  synth = createSynth({ type: e.target.value });
  tl.defaultTrack.instrument = synth;
});
